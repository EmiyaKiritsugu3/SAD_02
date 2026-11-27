const test = require("node:test");
const assert = require("node:assert/strict");
const Estado = require("../js/estado.js");

function memoria() {
  const dados = {};
  return {
    dados,
    getItem: (k) => dados[k] ?? null,
    setItem: (k, v) => { dados[k] = String(v); },
    removeItem: (k) => { delete dados[k]; },
  };
}

test("exemplo tem 10 produtos e 12 semanas", () => {
  const s = Estado.estadoExemplo(new Date("2026-11-27T12:00:00"));
  assert.equal(s.produtos.length, 10);
  assert.equal(s.semanas.length, 12);
  assert.equal(s.exemplo, true);
  assert.equal(s.semanas.at(-1).data, "2026-11-23");
  assert.ok(s.semanas.every((sem) => new Date(sem.data + "T12:00:00").getDay() === 1));
  assert.ok(s.semanas.every((sem) => Object.keys(sem.valores).length === 10));
});

test("estado vazio é válido e não tem exemplo", () => {
  const s = Estado.estadoVazio();
  assert.deepEqual(s, { versao: 1, produtos: [], semanas: [], exemplo: false });
  assert.equal(Estado.validar(s), true);
});

test("estado inválido é rejeitado", () => {
  assert.equal(Estado.validar(null), false);
  assert.equal(Estado.validar({ versao: 1, produtos: [], semanas: "x", exemplo: false }), false);
});

test("validar rejeita semana fora de segunda e produto órfão", () => {
  const s = Estado.estadoExemplo(new Date("2026-11-27T12:00:00"));
  s.semanas[0].data = "2026-09-02";
  assert.equal(Estado.validar(s), false);

  const t = Estado.estadoExemplo(new Date("2026-11-27T12:00:00"));
  t.semanas[0].valores["p-inexistente"] = 3;
  assert.equal(Estado.validar(t), false);
});

test("carregar sem dados devolve o exemplo", () => {
  const storage = memoria();
  const { estado, aviso } = Estado.carregar(storage);
  assert.equal(aviso, null);
  assert.equal(estado.produtos.length, 10);
  assert.equal(estado.exemplo, true);
});

test("salvar e carregar preservam o estado", () => {
  const storage = memoria();
  const original = Estado.estadoVazio();
  original.produtos.push({
    id: "p-teste", nome: "Teste", unidade: "un", custo: 1, preco: 2,
    estoqueAtual: 3, estoqueMinimo: 1, criadoEm: "2026-11-27",
  });
  original.semanas.push({ data: "2026-11-23", valores: { "p-teste": 4 } });
  assert.equal(Estado.salvar(original, storage), true);
  const { estado, aviso } = Estado.carregar(storage);
  assert.equal(aviso, null);
  assert.deepEqual(estado, original);
});

test("carregar JSON corrompido devolve exemplo com aviso", () => {
  const storage = memoria();
  storage.dados[Estado.CHAVE] = "{quebrado";
  const { estado, aviso } = Estado.carregar(storage);
  assert.match(aviso, /Carregamos o exemplo/);
  assert.equal(estado.exemplo, true);
});

test("carregar estado inválido devolve exemplo com aviso", () => {
  const storage = memoria();
  storage.dados[Estado.CHAVE] = JSON.stringify({ versao: 1, produtos: [], semanas: [], exemplo: "talvez" });
  const { estado, aviso } = Estado.carregar(storage);
  assert.match(aviso, /Carregamos o exemplo/);
  assert.equal(estado.exemplo, true);
});

test("salvar nunca lança quando o storage falha", () => {
  const storage = {
    getItem: () => null,
    setItem: () => { throw new Error("quota"); },
  };
  assert.equal(Estado.salvar(Estado.estadoVazio(), storage), false);
});
