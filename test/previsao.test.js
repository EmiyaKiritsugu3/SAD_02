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

test("SES de série constante é a constante", () => {
  assert.equal(P.suavizacaoExponencial([100, 100, 100], 0.3), 100);
});

test("regressão linear projeta série linear", () => {
  const r = P.regressaoLinear([10, 20, 30, 40]);
  assert.ok(Math.abs(r.prever(1) - 50) < 1e-9);
  assert.ok(Math.abs(r.prever(4) - 80) < 1e-9);
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
