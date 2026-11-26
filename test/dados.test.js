const test = require("node:test");
const assert = require("node:assert/strict");
const DADOS = require("../js/dados.js");

test("gerarSerieDemanda é determinística e tem 52 semanas", () => {
  const a = DADOS.gerarSerieDemanda({ base: 700, semanas: 52, seed: 42 });
  const b = DADOS.gerarSerieDemanda({ base: 700, semanas: 52, seed: 42 });
  assert.equal(a.length, 52);
  assert.deepEqual(a, b);
  assert.ok(a.every(v => v > 0));
});

test("série tem sazonalidade de junho/dezembro", () => {
  const s = DADOS.gerarSerieDemanda({ base: 700, semanas: 52, seed: 42 });
  const media = (de, ate) => s.slice(de - 1, ate).reduce((a, b) => a + b, 0) / (ate - de + 1);
  assert.ok(media(22, 26) > media(5, 13));
  assert.ok(media(48, 52) > media(5, 13));
});

test("rebanho de Caicó/RN contém os valores de 2025", () => {
  const caprino2025 = DADOS.REBANHO.caprino.find(x => x.ano === 2025);
  const ovino2025 = DADOS.REBANHO.ovino.find(x => x.ano === 2025);
  assert.equal(caprino2025.valor, 15157);
  assert.equal(ovino2025.valor, 24909);
});

test("produtos têm os campos usados pelo plano", () => {
  for (const p of DADOS.PRODUTOS) {
    assert.ok(p.id && p.nome);
    assert.ok(p.kgCarcacaAnimal > 0);
    assert.ok(p.precoVendaKg > 0);
    assert.ok(p.custoCompraKg > 0);
    assert.ok(p.custoAbateKg >= 0);
  }
});
