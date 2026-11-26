const test = require("node:test");
const assert = require("node:assert/strict");
const AHP = require("../js/ahp.js");

const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} != ${b}`);

test("matriz consistente 3x3: pesos somam 1 e CR < 0.1", () => {
  const r = AHP.calcAHP([[1, 3, 5], [1 / 3, 1, 3], [1 / 5, 1 / 3, 1]]);
  close(r.weights.reduce((a, b) => a + b, 0), 1);
  assert.ok(r.CR < 0.1);
  close(r.weights[0], 0.633, 0.001);
});

test("matriz identidade 3x3: pesos iguais e CR 0", () => {
  const r = AHP.calcAHP([[1, 1, 1], [1, 1, 1], [1, 1, 1]]);
  r.weights.forEach(w => close(w, 1 / 3));
  close(r.CR, 0);
});

test("matriz 1x1 retorna peso 1", () => {
  const r = AHP.calcAHP([[7]]);
  assert.deepEqual(r.weights, [1]);
  close(r.CR, 0);
});

test("findCycle detecta trio intransitivo", () => {
  assert.deepEqual(AHP.findCycle([[1, 3, 1 / 3], [1 / 3, 1, 3], [3, 1 / 3, 1]]), [0, 1, 2]);
  assert.equal(AHP.findCycle([[1, 1, 1], [1, 1, 1], [1, 1, 1]]), null);
});
