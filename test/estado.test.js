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

function produtoExemplo() {
  return {
    id: "p-teste", nome: "Teste", unidade: "un", custo: 1, preco: 2,
    estoqueAtual: 3, estoqueMinimo: 1, criadoEm: "2026-11-01",
  };
}

test("exemplo v2 tem 10 produtos e dias até a referência", () => {
  const referencia = new Date("2026-11-27T12:00:00");
  const s = Estado.estadoExemplo(referencia);
  assert.equal(s.versao, 2);
  assert.equal(s.produtos.length, 10);
  assert.equal(s.exemplo, true);
  assert.equal(s.dias.length, 82);
  assert.equal(s.dias.at(-1).data, "2026-11-27");
  assert.ok(s.dias.every((d) => d.data <= "2026-11-27"));
  assert.ok(s.dias.every((d) => Object.keys(d.valores).length > 0));
  const semanas = new Set(s.dias.map((d) => Estado.normalizarSemana(d.data)));
  assert.equal(semanas.size, 12);
});

test("estado vazio v2 é válido", () => {
  const s = Estado.estadoVazio();
  assert.deepEqual(s, { versao: 2, produtos: [], dias: [], exemplo: false });
  assert.equal(Estado.validar(s), true);
});

test("validar rejeita data impossível, dia vazio, duplicado e produto órfão", () => {
  const exemplo = Estado.estadoExemplo(new Date("2026-11-27T12:00:00"));

  const impossivel = structuredClone(exemplo);
  impossivel.dias[0].data = "2026-02-30";
  assert.equal(Estado.validar(impossivel), false);

  const vazio = structuredClone(exemplo);
  vazio.dias[0].valores = {};
  assert.equal(Estado.validar(vazio), false);

  const duplicado = structuredClone(exemplo);
  duplicado.dias[1].data = duplicado.dias[0].data;
  assert.equal(Estado.validar(duplicado), false);

  const orfao = structuredClone(exemplo);
  orfao.dias[0].valores["p-inexistente"] = 1;
  assert.equal(Estado.validar(orfao), false);

  assert.equal(Estado.validar(null), false);
  assert.equal(Estado.validar({ versao: 1, produtos: [], semanas: [], exemplo: false }), false);
});

test("carregar sem dados devolve o exemplo v2", () => {
  const { estado, aviso } = Estado.carregar(memoria());
  assert.equal(aviso, null);
  assert.equal(estado.versao, 2);
  assert.equal(estado.exemplo, true);
  assert.ok(estado.dias.length > 0);
});

test("salvar e carregar preservam o estado v2", () => {
  const storage = memoria();
  const original = Estado.estadoVazio();
  original.produtos.push(produtoExemplo());
  original.dias.push({ data: "2026-11-25", valores: { "p-teste": 4 } });
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

test("carregar migra v1 não-exemplo preservando o total semanal", () => {
  const storage = memoria();
  const v1 = {
    versao: 1,
    produtos: [produtoExemplo()],
    semanas: [{ data: "2026-11-23", valores: { "p-teste": 10 } }],
    exemplo: false,
  };
  assert.equal(Estado.validarV1(v1), true);
  storage.dados[Estado.CHAVE_ANTERIOR] = JSON.stringify(v1);
  const { estado, aviso } = Estado.carregar(storage);
  assert.equal(estado.versao, 2);
  assert.equal(estado.exemplo, false);
  assert.equal(estado.dias.length, 7);
  const soma = estado.dias.reduce((s, d) => s + (d.valores["p-teste"] || 0), 0);
  assert.equal(soma, 10);
  assert.match(aviso, /migrados/);
});

test("carregar v1 de exemplo regenera o exemplo diário", () => {
  const storage = memoria();
  const v1 = {
    versao: 1,
    produtos: [produtoExemplo()],
    semanas: [{ data: "2026-11-23", valores: { "p-teste": 10 } }],
    exemplo: true,
  };
  storage.dados[Estado.CHAVE_ANTERIOR] = JSON.stringify(v1);
  const { estado, aviso } = Estado.carregar(storage);
  assert.equal(aviso, null);
  assert.equal(estado.versao, 2);
  assert.equal(estado.exemplo, true);
  assert.equal(estado.dias.at(-1).data, Estado.normalizarDia(new Date()));
});

test("carregar e salvar não lançam com localStorage bloqueado", () => {
  const descritor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() { throw new Error("blocked"); },
  });
  try {
    const { estado, aviso } = Estado.carregar();
    assert.equal(estado.exemplo, true);
    assert.match(aviso, /Carregamos o exemplo/);
    assert.equal(Estado.salvar(Estado.estadoVazio()), false);
  } finally {
    if (descritor) Object.defineProperty(globalThis, "localStorage", descritor);
    else delete globalThis.localStorage;
  }
});

test("normalizarSemana de data vazia cai na segunda atual", () => {
  const vazio = Estado.normalizarSemana("");
  assert.equal(new Date(`${vazio}T12:00:00`).getDay(), 1);
  assert.equal(vazio, Estado.normalizarSemana(new Date()));
});

test("migrar v1 preserva dois produtos em duas semanas", () => {
  const produtoB = { ...produtoExemplo(), id: "p-b", nome: "B" };
  const v1 = {
    versao: 1,
    produtos: [produtoExemplo(), produtoB],
    semanas: [
      { data: "2026-11-23", valores: { "p-teste": 10, "p-b": 4 } },
      { data: "2026-11-30", valores: { "p-teste": 7 } },
    ],
    exemplo: false,
  };
  assert.equal(Estado.validarV1(v1), true);
  const v2 = Estado.migrarV1(v1);
  assert.equal(v2.versao, 2);
  assert.ok(v2.dias.length >= 10);
  assert.ok(v2.dias.every((d) => Object.keys(d.valores).length > 0));
  const soma = (id) => v2.dias.reduce((s, d) => s + (d.valores[id] || 0), 0);
  assert.equal(soma("p-teste"), 17);
  assert.equal(soma("p-b"), 4);
});

test("validarV1 rejeita semana fora de segunda, duplicada e vazia", () => {
  const base = {
    versao: 1,
    produtos: [produtoExemplo()],
    semanas: [{ data: "2026-11-23", valores: { "p-teste": 10 } }],
    exemplo: false,
  };
  assert.equal(Estado.validarV1({ ...base, semanas: [{ data: "2026-11-24", valores: { "p-teste": 1 } }] }), false);
  assert.equal(Estado.validarV1({ ...base, semanas: [base.semanas[0], base.semanas[0]] }), false);
  assert.equal(Estado.validarV1({ ...base, semanas: [{ data: "2026-11-23", valores: {} }] }), false);
});

test("carregar v2 inválido cai no exemplo com aviso", () => {
  const storage = memoria();
  storage.dados[Estado.CHAVE] = JSON.stringify({ versao: 2, produtos: [], dias: "x", exemplo: true });
  const { estado, aviso } = Estado.carregar(storage);
  assert.equal(estado.exemplo, true);
  assert.match(aviso, /Carregamos o exemplo/);
});

test("carregar v1 com JSON inválido cai no exemplo", () => {
  const storage = memoria();
  storage.dados[Estado.CHAVE_ANTERIOR] = "{quebrado";
  const { estado } = Estado.carregar(storage);
  assert.equal(estado.exemplo, true);
  assert.equal(estado.versao, 2);
});

test("normalizarDia de data vazia cai em hoje", () => {
  assert.equal(Estado.normalizarDia(""), Estado.normalizarDia(new Date()));
});

test("exemplo distribui a semana sem pico artificial", () => {
  const s = Estado.estadoExemplo(new Date("2026-11-27T12:00:00"));
  const porSemana = new Map();
  for (const dia of s.dias) {
    const valor = dia.valores["p-arroz"] || 0;
    if (valor <= 0) continue;
    const semana = Estado.normalizarSemana(dia.data);
    if (!porSemana.has(semana)) porSemana.set(semana, []);
    porSemana.get(semana).push(valor);
  }
  for (const valores of porSemana.values()) {
    const total = valores.reduce((a, b) => a + b, 0);
    assert.ok(Math.max(...valores) <= total * 0.3, `pico ${Math.max(...valores)}/${total}`);
  }
});

test("carregar v1 inválido devolve exemplo com aviso", () => {
  const storage = memoria();
  storage.dados[Estado.CHAVE_ANTERIOR] = "{quebrado";
  const um = Estado.carregar(storage);
  assert.equal(um.estado.exemplo, true);
  assert.match(um.aviso, /Carregamos o exemplo/);

  const outro = memoria();
  outro.dados[Estado.CHAVE_ANTERIOR] = JSON.stringify({ versao: 1, produtos: [], semanas: "x", exemplo: false });
  const dois = Estado.carregar(outro);
  assert.equal(dois.estado.exemplo, true);
  assert.match(dois.aviso, /Carregamos o exemplo/);
});

test("migração é persistida e não repete o aviso", () => {
  const storage = memoria();
  storage.dados[Estado.CHAVE_ANTERIOR] = JSON.stringify({
    versao: 1, produtos: [produtoExemplo()],
    semanas: [{ data: "2026-11-23", valores: { "p-teste": 10 } }], exemplo: false,
  });
  const primeira = Estado.carregar(storage);
  assert.match(primeira.aviso, /migrados/);
  assert.ok(storage.dados[Estado.CHAVE]);
  const segunda = Estado.carregar(storage);
  assert.equal(segunda.aviso, null);
  assert.deepEqual(segunda.estado, primeira.estado);
});

test("validar rejeita dia só com zeros", () => {
  const s = Estado.estadoExemplo(new Date("2026-11-27T12:00:00"));
  const id = Object.keys(s.dias[0].valores)[0];
  s.dias[0].valores = { [id]: 0 };
  assert.equal(Estado.validar(s), false);
});

test("migração preserva total fracionário", () => {
  const v1 = {
    versao: 1, produtos: [produtoExemplo()],
    semanas: [{ data: "2026-11-23", valores: { "p-teste": 0.125 } }], exemplo: false,
  };
  const v2 = Estado.migrarV1(v1);
  const soma = v2.dias.reduce((s, d) => s + (d.valores["p-teste"] || 0), 0);
  assert.equal(soma, 0.125);
});

test("migração preserva o total de cada semana", () => {
  const v1 = {
    versao: 1,
    produtos: [produtoExemplo()],
    semanas: [
      { data: "2026-11-09", valores: { "p-teste": 7 } },
      { data: "2026-11-16", valores: { "p-teste": 5 } },
    ],
    exemplo: false,
  };
  const v2 = Estado.migrarV1(v1);
  for (const semana of v1.semanas) {
    const inicio = semana.data;
    const fim = Estado.adicionarDias(inicio, 6);
    const soma = v2.dias
      .filter((d) => d.data >= inicio && d.data <= fim)
      .reduce((s, d) => s + (d.valores["p-teste"] || 0), 0);
    assert.equal(soma, semana.valores["p-teste"]);
  }
});

test("salvar nunca lança quando setItem falha", () => {
  const storage = {
    getItem: () => null,
    setItem: () => { throw new Error("quota"); },
  };
  assert.equal(Estado.salvar(Estado.estadoVazio(), storage), false);
  assert.ok(Estado.ultimoErroSalvar instanceof Error);
});
