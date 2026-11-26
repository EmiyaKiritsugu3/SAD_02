const test = require("node:test");
const assert = require("node:assert/strict");
const F = require("../js/fornecedores.js");
const AHP = require("../js/ahp.js");

test("matrizes do exemplo são recíprocas e consistentes", () => {
  const all = [F.MATRIZ_CRITERIOS, ...Object.values(F.MATRIZES_ALTERNATIVAS)];
  for (const M of all) {
    for (let i = 0; i < M.length; i++)
      for (let j = 0; j < M.length; j++)
        assert.ok(Math.abs(M[i][j] * M[j][i] - 1) < 1e-9);
    assert.ok(AHP.calcAHP(M).CR < 0.1);
  }
});

test("ranking exclui fornecedor sem conformidade sanitária", () => {
  const r = F.avaliar({ matrizCriterios: F.MATRIZ_CRITERIOS, matrizesAlternativas: F.MATRIZES_ALTERNATIVAS, alternativas: F.ALTERNATIVAS });
  assert.ok(r.excluidos.some(a => a.id === "informal"));
  assert.ok(!r.ranking.some(a => a.id === "informal"));
});

test("ranking esperado: Boa Vista primeiro", () => {
  const r = F.avaliar({ matrizCriterios: F.MATRIZ_CRITERIOS, matrizesAlternativas: F.MATRIZES_ALTERNATIVAS, alternativas: F.ALTERNATIVAS });
  assert.equal(r.ranking[0].id, "boa-vista");
  assert.equal(r.ranking.length, 3);
});

test("CR alto gera alerta, mas não quebra", () => {
  const inconsistente = [[1, 9, 1 / 9], [1 / 9, 1, 9], [9, 1 / 9, 1]];
  const r = F.avaliar({ matrizCriterios: inconsistente, matrizesAlternativas: F.MATRIZES_ALTERNATIVAS, alternativas: F.ALTERNATIVAS });
  assert.ok(r.criterios.CR > 0.1);
  assert.ok(r.alertas.some(a => a.tipo === "consistencia"));
  assert.equal(r.ranking.length, 3);
});

test("CR alto em matriz de alternativa gera alerta", () => {
  const mAlt = {
    ...F.MATRIZES_ALTERNATIVAS,
    preco: [[1, 9, 1 / 9], [1 / 9, 1, 9], [9, 1 / 9, 1]],
  };
  const r = F.avaliar({ matrizCriterios: F.MATRIZ_CRITERIOS, matrizesAlternativas: mAlt, alternativas: F.ALTERNATIVAS });
  assert.ok(r.criteriosAlternativas.preco.CR > 0.1);
  assert.ok(r.alertas.some(a => a.tipo === "consistencia-alternativa"));
});

test("avaliar usa as alternativas fornecidas", () => {
  const alts = F.ALTERNATIVAS.map((a) => a.id === "boa-vista"
    ? { ...a, nome: "Boa Vista Editada", precoKgVivo: 99 }
    : a);
  const r = F.avaliar({ matrizCriterios: F.MATRIZ_CRITERIOS, matrizesAlternativas: F.MATRIZES_ALTERNATIVAS, alternativas: alts });
  const boa = r.ranking.find((a) => a.id === "boa-vista");
  assert.equal(boa.nome, "Boa Vista Editada");
  assert.equal(boa.precoKgVivo, 99);
});
