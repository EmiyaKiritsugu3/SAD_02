const test = require("node:test");
const assert = require("node:assert/strict");
const P = require("../js/previsao.js");

test("média móvel de janela 2", () => {
  assert.equal(P.mediaMovel([10, 20, 30, 40], 2), 35);
});

test("média móvel com série curta não retorna NaN", () => {
  assert.equal(P.mediaMovel([10], 4), 10);
  assert.equal(P.mediaMovel([], 4), 0);
});

test("média móvel normaliza janela fracionária", () => {
  assert.equal(P.mediaMovel([10, 20, 30, 40], 2.7), 35);
});

test("SES de série constante é a constante", () => {
  assert.equal(P.suavizacaoExponencial([100, 100, 100], 0.3), 100);
});

test("regressão linear projeta série linear", () => {
  const r = P.regressaoLinear([10, 20, 30, 40]);
  assert.ok(Math.abs(r.prever(1) - 50) < 1e-9);
  assert.ok(Math.abs(r.prever(4) - 80) < 1e-9);
});

test("regressão não projeta demanda negativa", () => {
  const r = P.regressaoLinear([100, 80, 60, 40]);
  assert.equal(r.prever(4), 0);
});

test("MAE e MAPE", () => {
  assert.equal(P.mae([10, 20], [12, 18]), 2);
  assert.ok(Math.abs(P.mape([110], [100]) - 0.1) < 1e-9);
  assert.equal(P.mape([10], [0]), null);
});

test("backtest devolve métricas e previsões", () => {
  const r = P.backtest([10, 20, 30, 40, 50, 60], "regressao", {}, 2);
  assert.equal(r.previstos.length, 2);
  assert.equal(r.reais.length, 2);
  assert.ok(r.mae < 1);
});

test("escolherMelhor prefere regressão em série linear", () => {
  const r = P.escolherMelhor([10, 20, 30, 40, 50, 60]);
  assert.equal(r.metodo, "regressao");
});

test("serieAte corta até a semana de referência", () => {
  const r = P.serieAte([10, 20, 30, 40], [40, 41, 42, 43], 41);
  assert.deepEqual(r.serie, [10, 20]);
  assert.deepEqual(r.semanas, [40, 41]);
});

test("serieAte com referência inexistente usa a série completa", () => {
  const r = P.serieAte([10, 20, 30], [1, 2, 3], 99);
  assert.deepEqual(r.serie, [10, 20, 30]);
  assert.deepEqual(r.semanas, [1, 2, 3]);
});

test("paraSerie não prevê com menos de 4 semanas", () => {
  assert.equal(P.paraSerie([10, 20, 30]), null);
  assert.equal(P.paraSerie([]), null);
});

test("paraSerie usa média móvel entre 4 e 7 semanas", () => {
  const r = P.paraSerie([10, 10, 10, 10, 10]);
  assert.equal(r.metodo, "mediaMovel");
  assert.deepEqual(r.prev4, [10, 10, 10, 10]);
});

test("paraSerie escolhe automático a partir de 8 semanas", () => {
  const r = P.paraSerie([10, 20, 30, 40, 50, 60, 70, 80]);
  assert.ok(["mediaMovel", "ses", "regressao"].includes(r.metodo));
  assert.equal(r.prev4.length, 4);
});

test("paraSerie não projeta valores negativos", () => {
  const r = P.paraSerie([100, 80, 60, 40, 20, 10, 5, 0]);
  assert.ok(r.prev4.every((v) => Number.isFinite(v) && v >= 0));
});
