const test = require("node:test");
const assert = require("node:assert/strict");
const CSV = require("../js/csv.js");

test("parse aceita ponto e vírgula", () => {
  assert.deepEqual(CSV.parse("a;b\n1;2"), [["a", "b"], ["1", "2"]]);
});

test("parse aceita vírgula e aspas", () => {
  assert.deepEqual(CSV.parse('a,b\n"x,y",2'), [["a", "b"], ["x,y", "2"]]);
});

test("importarDemanda lê caprino e ovino", () => {
  const r = CSV.importarDemanda("semana;caprino;ovino\n1;700;900\n2;710;910");
  assert.deepEqual(r.semanas, [1, 2]);
  assert.deepEqual(r.caprino, [700, 710]);
  assert.deepEqual(r.ovino, [900, 910]);
  assert.equal(r.origem, "importado");
});

test("importarDemanda ordena semanas fora de ordem", () => {
  const r = CSV.importarDemanda("semana;caprino;ovino\n2;710;910\n1;700;900");
  assert.deepEqual(r.semanas, [1, 2]);
  assert.deepEqual(r.caprino, [700, 710]);
});

test("importarDemanda rejeita semana inválida ou duplicada", () => {
  assert.throws(() => CSV.importarDemanda("semana;caprino;ovino\nx;700;900"));
  assert.throws(() => CSV.importarDemanda("semana;caprino;ovino\n1;700;900\n1;710;910"));
});

test("importarEstoque lê o estoque atual", () => {
  const r = CSV.importarEstoque("produto;estoque_kg\ncaprino;600\novino;800");
  assert.deepEqual(r, { caprino: 600, ovino: 800 });
});

test("linha inválida lança erro e não retorna dados parciais", () => {
  assert.throws(() => CSV.importarDemanda("semana;caprino;ovino\n1;abc;900"));
  assert.throws(() => CSV.importarDemanda(""));
  assert.throws(() => CSV.importarEstoque("produto;estoque_kg\ncaprino;x"));
});
