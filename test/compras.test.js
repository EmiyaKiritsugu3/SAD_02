const test = require("node:test");
const assert = require("node:assert/strict");
const Compras = require("../js/compras.js");

test("sugere compra descontando estoque e somando mínimo", () => {
  const p = { id: "a", unidade: "un", custo: 2, estoqueAtual: 5, estoqueMinimo: 3 };
  const r = Compras.sugerir(p, 10);
  assert.equal(r.necessidade, 8);
  assert.equal(r.sugestao, 8);
  assert.equal(r.custo, 16);
  assert.equal(r.semDados, false);
  assert.equal(r.minimo, 3);
  assert.equal(r.minimoManual, true);
});

test("un arredonda para cima e kg/L usam uma casa", () => {
  assert.equal(Compras.arredondar(2.1, "un"), 3);
  assert.equal(Compras.arredondar(2.14, "kg"), 2.1);
  assert.equal(Compras.arredondar(2.16, "L"), 2.2);
  assert.equal(Compras.arredondar(0, "un"), 0);
});

test("estoque que cobre a previsão sugere zero", () => {
  const p = { id: "a", unidade: "kg", custo: 10, estoqueAtual: 20, estoqueMinimo: 0 };
  const r = Compras.sugerir(p, 15);
  assert.equal(r.necessidade, 0);
  assert.equal(r.sugestao, 0);
  assert.equal(r.custo, 0);
  assert.equal(r.minimoManual, false);
  assert.ok(Math.abs(r.minimo - 15 / 7) < 1e-9);
});

test("mínimo automático usa dias de cobertura e respeita override manual", () => {
  const p = { id: "a", unidade: "un", custo: 2, estoqueAtual: 0, estoqueMinimo: 0 };
  const auto = Compras.sugerir(p, 14, 2);
  assert.equal(auto.minimoManual, false);
  assert.ok(Math.abs(auto.minimo - 4) < 1e-9);
  assert.equal(auto.necessidade, 18);
  assert.equal(auto.sugestao, 18);
  const manual = Compras.sugerir({ ...p, estoqueMinimo: 3 }, 14, 2);
  assert.equal(manual.minimoManual, true);
  assert.equal(manual.minimo, 3);
  assert.equal(manual.necessidade, 17);
});

test("sem previsão retorna semDados", () => {
  const p = { id: "a", unidade: "un", custo: 2, estoqueAtual: 0, estoqueMinimo: 0 };
  const r = Compras.sugerir(p, null);
  assert.equal(r.semDados, true);
  assert.equal(r.sugestao, null);
  assert.equal(r.custo, 0);
  assert.equal(Compras.sugerir(p, NaN).semDados, true);
});

test("lista preserva a ordem e calcula totais", () => {
  const produtos = [
    { id: "a", nome: "Arroz", unidade: "un", custo: 2, estoqueAtual: 0, estoqueMinimo: 0 },
    { id: "b", nome: "Feijão", unidade: "kg", custo: 5, estoqueAtual: 2, estoqueMinimo: 1 },
    { id: "c", nome: "Café", unidade: "un", custo: 10, estoqueAtual: 0, estoqueMinimo: 0 },
  ];
  const itens = Compras.lista(produtos, { a: 4, b: 3.2, c: null });
  assert.deepEqual(itens.map((i) => i.produto.id), ["a", "b", "c"]);
  assert.equal(itens[0].sugestao, 5);
  assert.equal(itens[0].minimoManual, false);
  assert.equal(itens[1].sugestao, 2.2);
  assert.equal(itens[2].semDados, true);
  assert.equal(Compras.total(itens), 21);
  assert.equal(Compras.semDados(itens), 1);
});
