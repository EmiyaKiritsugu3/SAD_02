const test = require("node:test");
const assert = require("node:assert/strict");
const Plano = require("../js/plano.js");

const base = {
  produto: { id: "caprino", nome: "Caprino", kgCarcacaAnimal: 12.6 },
  previsaoSemana: 700, estoqueAtualKg: 600, estoqueSegurancaKg: 120,
  coberturaSemanas: 1, capacidadeAbateAnimais: 90, capacidadeCamaraKg: 3000,
  estoqueMinKg: 300, precoVendaKg: 35, custoCompraKg: 28.04,
  custoAbateKg: 4, animaisVivos: 0,
};

test("plano base", () => {
  const r = Plano.calcularPlano(base);
  assert.equal(r.estoqueMetaKg, 820);
  assert.equal(r.animaisAbatidos, 74);
  assert.ok(Math.abs(r.producaoKg - 932.4) < 1e-9);
  assert.ok(Math.abs(r.estoqueFinalKg - 832.4) < 1e-9);
  assert.equal(r.necessidadeCompraAnimais, 74);
  assert.equal(r.receita, 24500);
  assert.ok(Math.abs(r.margem - 2072) < 1e-6);
  assert.equal(r.alertas.length, 0);
});

test("capacidade limita o abate e gera ruptura", () => {
  const r = Plano.calcularPlano({ ...base, previsaoSemana: 2000, estoqueAtualKg: 0, estoqueSegurancaKg: 0 });
  assert.equal(r.animaisAbatidos, 90);
  assert.ok(r.deficitAnimais > 0);
  assert.ok(r.alertas.some(a => a.tipo === "capacidade"));
  assert.ok(r.alertas.some(a => a.tipo === "ruptura"));
});

test("câmara fria limita a produção", () => {
  const r = Plano.calcularPlano({ ...base, previsaoSemana: 700, estoqueAtualKg: 500, coberturaSemanas: 3, capacidadeAbateAnimais: 200, capacidadeCamaraKg: 2100 });
  assert.ok(r.animaisAbatidos < r.animaisNecessarios);
  assert.ok(r.alertas.some(a => a.tipo === "camara"));
  assert.ok(r.estoqueFinalKg <= 2100);
});

test("demanda zero retorna zeros, não negativos", () => {
  const r = Plano.calcularPlano({ ...base, previsaoSemana: 0, estoqueSegurancaKg: 0 });
  assert.equal(r.animaisAbatidos, 0);
  assert.equal(r.producaoKg, 0);
  assert.equal(r.margem, 0);
  assert.equal(r.necessidadeCompraAnimais, 0);
});

test("estoque negativo é tratado como zero", () => {
  const r = Plano.calcularPlano({ ...base, estoqueAtualKg: -100 });
  assert.ok(r.estoqueFinalKg >= 0);
  assert.ok(r.animaisAbatidos >= 0);
});

test("capacidade e câmara juntas não geram produção negativa", () => {
  const r = Plano.calcularPlano({ ...base, previsaoSemana: 2000, estoqueAtualKg: 2900, coberturaSemanas: 3, capacidadeAbateAnimais: 90, capacidadeCamaraKg: 3000 });
  assert.ok(r.producaoKg >= 0);
  assert.ok(r.demandaAtendidaKg <= 2000);
  assert.ok(r.estoqueFinalKg <= 3000);
});

test("cenário altera demanda, preço e capacidade", () => {
  const r = Plano.simularCenario(base, { demandaPct: 0.1, precoPct: -0.05, capacidadePct: -0.2 });
  assert.equal(r.previsaoSemana, 770);
  assert.ok(Math.abs(r.precoVendaKg - 33.25) < 1e-9);
  assert.ok(r.capacidadeAbateAnimais <= 72);
});

test("consolidação soma os dois produtos", () => {
  const a = Plano.calcularPlano(base);
  const b = Plano.calcularPlano({ ...base, produto: { id: "ovino", nome: "Ovino", kgCarcacaAnimal: 15.36 }, previsaoSemana: 900, estoqueAtualKg: 800 });
  const t = Plano.consolidar([a, b]);
  assert.equal(t.animaisAbatidos, a.animaisAbatidos + b.animaisAbatidos);
  assert.equal(t.receita, a.receita + b.receita);
});
