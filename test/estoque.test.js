const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("../js/estoque.js");

test("desvio padrão populacional", () => {
  assert.equal(E.desvioPadrao([2, 4, 4, 4, 5, 5, 7, 9]), 2);
});

test("estoque de segurança", () => {
  assert.ok(Math.abs(E.estoqueSeguranca([2, 4, 4, 4, 5, 5, 7, 9], 1.65, 1) - 3.3) < 1e-9);
});

test("ponto de pedido", () => {
  assert.equal(E.pontoPedido(100, 1, 50), 150);
});

test("cobertura em semanas", () => {
  assert.equal(E.cobertura(500, 100), 5);
  assert.equal(E.cobertura(500, 0), Infinity);
});

test("classificação ABC", () => {
  const r = E.classificacaoABC([{ id: "c", receita: 5 }, { id: "a", receita: 80 }, { id: "b", receita: 15 }]);
  assert.deepEqual(r.map(x => x.id), ["a", "b", "c"]);
  assert.deepEqual(r.map(x => x.classe), ["A", "B", "C"]);
  assert.equal(r[2].acumulado, 1);
});

test("série vazia não retorna NaN", () => {
  assert.equal(E.desvioPadrao([]), 0);
  assert.equal(E.estoqueSeguranca([], 1.65, 1), 0);
});
