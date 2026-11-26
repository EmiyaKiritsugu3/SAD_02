const test = require("node:test");
const assert = require("node:assert/strict");
const Importacao = require("../js/importacao.js");

function dadosFake() {
  return {
    PRODUTOS: [
      { id: "caprino", estoqueKg: 600 },
      { id: "ovino", estoqueKg: 800 },
    ],
    DEMANDA: {
      semanas: [1],
      caprino: [700],
      ovino: [900],
      origem: "ilustrativa",
    },
  };
}

test("aplicarDemanda válida retorna novo estado com origem importada", () => {
  const antes = dadosFake();
  const depois = Importacao.aplicarDemanda(antes, "semana;caprino;ovino\n1;100;200\n2;110;210");
  assert.deepEqual(depois.DEMANDA.caprino, [100, 110]);
  assert.deepEqual(depois.DEMANDA.ovino, [200, 210]);
  assert.deepEqual(depois.DEMANDA.semanas, [1, 2]);
  assert.equal(depois.DEMANDA.origem, "importado");
  assert.deepEqual(antes, dadosFake());
});

test("aplicarDemanda inválida lança e não muta o original", () => {
  const antes = dadosFake();
  assert.throws(() => Importacao.aplicarDemanda(antes, "semana;caprino;ovino\n1;abc;200"));
  assert.deepEqual(antes, dadosFake());
});

test("aplicarEstoque válido retorna novos produtos sem mutar o original", () => {
  const antes = dadosFake();
  const depois = Importacao.aplicarEstoque(antes, "produto;estoque_kg\ncaprino;123\novino;456");
  assert.equal(depois.PRODUTOS[0].estoqueKg, 123);
  assert.equal(depois.PRODUTOS[1].estoqueKg, 456);
  assert.deepEqual(antes, dadosFake());
});
