const test = require("node:test");
const assert = require("node:assert/strict");
const Produtos = require("../js/produtos.js");

function base(over = {}) {
  return {
    nome: "Arroz 5 kg", unidade: "un", custo: 22.5, preco: 27.9,
    estoqueAtual: 8, estoqueMinimo: 4, ...over,
  };
}

test("cria produto com id slug e campos numéricos", () => {
  const p = Produtos.criar(base(), [], 1700000000000);
  assert.match(p.id, /^p-arroz-5-kg-/);
  assert.equal(p.estoqueMinimo, 4);
  assert.match(p.criadoEm, /^\d{4}-\d{2}-\d{2}$/);
});

test("rejeita nome duplicado sem diferenciar maiúsculas", () => {
  const p = Produtos.criar(base({ nome: "Leite 1 L", unidade: "L" }), [], 1700000000000);
  assert.ok(Produtos.validar({ ...p, nome: "leite 1 l" }, [p]).length > 0);
});

test("renomear preserva id e criadoEm", () => {
  const p = Produtos.criar(base({ nome: "Café", custo: 10, preco: 14 }), [], 1700000000000);
  const atualizado = Produtos.atualizar(p, { ...p, nome: "Café 500 g" }, [p]);
  assert.equal(atualizado.id, p.id);
  assert.equal(atualizado.criadoEm, p.criadoEm);
});

test("não remove o último produto", () => {
  const p = Produtos.criar(base({ nome: "Pão", custo: 0.5, preco: 1 }), [], 1700000000000);
  assert.throws(() => Produtos.remover([p], p.id), /pelo menos um/i);
});

test("remove produto quando há mais de um", () => {
  const a = Produtos.criar(base({ nome: "Arroz" }), [], 1700000000000);
  const b = Produtos.criar(base({ nome: "Feijão" }), [a], 1700000000001);
  const restantes = Produtos.remover([a, b], a.id);
  assert.deepEqual(restantes.map((p) => p.id), [b.id]);
  assert.equal(Produtos.porId(restantes, b.id).nome, "Feijão");
});

test("valida unidade, nome e números", () => {
  assert.ok(Produtos.validar(base({ unidade: "cx" })).length > 0);
  assert.ok(Produtos.validar(base({ nome: "" })).length > 0);
  assert.ok(Produtos.validar(base({ custo: -1 })).length > 0);
  assert.ok(Produtos.validar(base({ preco: NaN })).length > 0);
  assert.equal(Produtos.validar(base()).length, 0);
});

test("atualizar rejeita nome de outro produto", () => {
  const a = Produtos.criar(base({ nome: "Arroz" }), [], 1700000000000);
  const b = Produtos.criar(base({ nome: "Feijão" }), [a], 1700000000001);
  assert.throws(() => Produtos.atualizar(b, { ...b, nome: "arroz" }, [a, b]), /existe/i);
});

test("ids são únicos no mesmo instante", () => {
  const a = Produtos.criar(base({ nome: "Arroz" }), [], 1700000000000);
  const b = Produtos.criar(base({ nome: "Feijão" }), [a], 1700000000000);
  assert.notEqual(a.id, b.id);
});
