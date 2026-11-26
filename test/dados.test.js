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

test("demanda padrão tem semanas 1..52 e origem ilustrativa", () => {
  assert.equal(DADOS.DEMANDA.semanas.length, 52);
  assert.equal(DADOS.DEMANDA.semanas[0], 1);
  assert.equal(DADOS.DEMANDA.semanas[51], 52);
  assert.equal(DADOS.DEMANDA.origem, "ilustrativa");
});

test("dadosValidos aceita o pacote padrão e rejeita formas vazias", () => {
  assert.equal(DADOS.dadosValidos(DADOS.clonarDados()), true);
  assert.equal(DADOS.dadosValidos({ PRODUTOS: [], DEMANDA: {} }), false);
  assert.equal(DADOS.dadosValidos({ PRODUTOS: DADOS.PRODUTOS, DEMANDA: { caprino: [1], ovino: [] } }), false);
  const ruim = DADOS.clonarDados();
  ruim.DEMANDA.caprino[0] = NaN;
  assert.equal(DADOS.dadosValidos(ruim), false);
});

test("matrizValida aceita matriz 2x2 e rejeita dimensão/valor inválido", () => {
  assert.equal(DADOS.matrizValida([[1, 2], [1 / 2, 1]], 2), true);
  assert.equal(DADOS.matrizValida([[1, 2]], 2), false);
  assert.equal(DADOS.matrizValida([[1, "x"], [1 / 2, 1]], 2), false);
});
