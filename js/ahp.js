// Núcleo AHP puro, sem DOM. Reaproveitado do projeto saaty.
const AHP = (() => {
  function principalEigenvector(matrix) {
    const n = matrix.length;
    let v = Array(n).fill(1 / n);
    for (let iter = 0; iter < 200; iter++) {
      const w = matrix.map((row) => row.reduce((s, val, j) => s + val * v[j], 0));
      const soma = w.reduce((a, b) => a + b, 0);
      if (!(soma > 0)) break;
      const proximo = w.map((x) => x / soma);
      let diff = 0;
      for (let i = 0; i < n; i++) diff += Math.abs(proximo[i] - v[i]);
      v = proximo;
      if (diff < 1e-12) break;
    }
    return v;
  }

  function calcAHP(matrix) {
    const n = matrix.length;
    if (n === 0) return null;
    if (n === 1) return { weights: [1], lambdaMax: 1, CI: 0, CR: 0, n: 1, colSums: [matrix[0][0]], norm: [[1]], Aw: [1], lambdas: [1] };

    const colSums = Array(n).fill(0);
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) colSums[j] += matrix[i][j];

    const norm = matrix.map(row => row.map((v, j) => v / colSums[j]));
    const weights = principalEigenvector(matrix);

    const Aw = matrix.map(row => row.reduce((s, v, j) => s + v * weights[j], 0));
    const lambdas = Aw.map((v, i) => v / weights[i]);
    const lambdaMax = lambdas.reduce((a, b) => a + b, 0) / n;

    const CI = (lambdaMax - n) / (n - 1);
    const ri = RI[n] ?? 1.49;
    const CR = ri === 0 ? 0 : CI / ri;
    return { weights, lambdaMax, CI, CR, n, colSums, norm, Aw, lambdas };
  }

  const RI = { 1: 0, 2: 0, 3: 0.58, 4: 0.90, 5: 1.12, 6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49 };

  // Procura um trio intransitivo: X>Y, Y>Z, mas X<Z.
  function findCycle(M) {
    const n = M.length, EPS = 1.000001;
    for (let x = 0; x < n; x++)
      for (let y = 0; y < n; y++) {
        if (y === x) continue;
        for (let z = 0; z < n; z++) {
          if (z === x || z === y) continue;
          if (M[x][y] > EPS && M[y][z] > EPS && M[x][z] < 1 / EPS) return [x, y, z];
        }
      }
    return null;
  }

  return { calcAHP, RI, findCycle };
})();

if (typeof module !== "undefined" && module.exports) module.exports = AHP;
