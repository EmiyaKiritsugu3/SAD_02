const test = require("node:test");
const assert = require("node:assert/strict");
const Vendas = require("../js/vendas.js");

const PRODUTOS = [
  { id: "a", nome: "Arroz", preco: 2, unidade: "un" },
  { id: "b", nome: "Feijão", preco: 5, unidade: "un" },
];

test("normaliza domingo, segunda e quarta para a mesma segunda", () => {
  assert.equal(Vendas.normalizarSemana("2026-11-22"), "2026-11-16");
  assert.equal(Vendas.normalizarSemana("2026-11-23"), "2026-11-23");
  assert.equal(Vendas.normalizarSemana("2026-11-25"), "2026-11-23");
});

test("adicionarSemanas cruza mês e ano", () => {
  assert.equal(Vendas.adicionarSemanas("2026-12-28", 1), "2027-01-04");
  assert.equal(Vendas.adicionarSemanas("2026-01-04", -1), "2025-12-28");
});

test("salvarSemana cria, atualiza e ordena", () => {
  let semanas = Vendas.salvarSemana([], "2026-11-25", { a: 10, b: 0 }, PRODUTOS);
  assert.equal(semanas.length, 1);
  assert.equal(semanas[0].data, "2026-11-23");
  assert.deepEqual(semanas[0].valores, { a: 10 });

  semanas = Vendas.salvarSemana(semanas, "2026-11-16", { b: 4 }, PRODUTOS);
  assert.deepEqual(semanas.map((s) => s.data), ["2026-11-16", "2026-11-23"]);

  semanas = Vendas.salvarSemana(semanas, "2026-11-23", { a: 5, b: 2 }, PRODUTOS);
  assert.equal(semanas.length, 2);
  assert.deepEqual(semanas.find((s) => s.data === "2026-11-23").valores, { a: 5, b: 2 });
});

test("salvarSemana rejeita semana vazia, negativa e quantidade inválida", () => {
  assert.throws(() => Vendas.salvarSemana([], "2026-11-23", { a: 0, b: 0 }, PRODUTOS), /pelo menos um/i);
  assert.throws(() => Vendas.salvarSemana([], "2026-11-23", { a: -1 }, PRODUTOS), /negativ/i);
  assert.throws(() => Vendas.salvarSemana([], "2026-11-23", { a: NaN }, PRODUTOS), /inválid/i);
});

test("salvarSemana ignora produto desconhecido", () => {
  const semanas = Vendas.salvarSemana([], "2026-11-23", { a: 3, sumiu: 99 }, PRODUTOS);
  assert.deepEqual(semanas[0].valores, { a: 3 });
});

test("removerProduto limpa valores e semanas vazias", () => {
  const semanas = [
    { data: "2026-11-09", valores: { a: 10, b: 5 } },
    { data: "2026-11-16", valores: { a: 2 } },
  ];
  const restantes = Vendas.removerProduto(semanas, "a");
  assert.equal(restantes.length, 1);
  assert.deepEqual(restantes[0].valores, { b: 5 });
});

test("série preenche lacunas com zero e começa na primeira venda", () => {
  const semanas = [
    { data: "2026-11-02", valores: {} },
    { data: "2026-11-09", valores: { a: 10 } },
    { data: "2026-11-16", valores: {} },
    { data: "2026-11-23", valores: { a: 20 } },
  ];
  assert.deepEqual(Vendas.serieProduto(semanas, "a"), {
    semanas: ["2026-11-09", "2026-11-16", "2026-11-23"],
    valores: [10, 0, 20],
  });
});

test("série de produto sem venda é vazia", () => {
  assert.deepEqual(Vendas.serieProduto([{ data: "2026-11-23", valores: { b: 2 } }], "a"), {
    semanas: [], valores: [],
  });
  assert.deepEqual(Vendas.serieProduto([], "a"), { semanas: [], valores: [] });
});

test("resumo mensal soma quantidade e receita", () => {
  const semanas = [
    { data: "2026-11-02", valores: { a: 10, b: 1 } },
    { data: "2026-11-09", valores: { a: 5 } },
    { data: "2026-12-07", valores: { b: 2 } },
  ];
  const r = Vendas.resumoMensal(semanas, PRODUTOS);
  assert.deepEqual(r.map((m) => m.mes), ["2026-11", "2026-12"]);
  assert.equal(r[0].porProduto.a.quantidade, 15);
  assert.equal(r[0].porProduto.a.receita, 30);
  assert.equal(r[0].porProduto.b.receita, 5);
  assert.equal(r[0].totalReceita, 35);
  assert.equal(r[1].porProduto.a.quantidade, 0);
  assert.equal(r[1].porProduto.b.receita, 10);
  assert.equal(r[1].totalReceita, 10);
});

test("última e próxima semana", () => {
  const semanas = [
    { data: "2026-11-09", valores: { a: 1 } },
    { data: "2026-11-23", valores: { a: 2 } },
  ];
  assert.equal(Vendas.ultimaSemana(semanas), "2026-11-23");
  assert.equal(Vendas.proximaSemana(semanas), "2026-11-30");
  assert.equal(Vendas.ultimaSemana([]), null);
  assert.equal(Vendas.proximaSemana([]), null);
});

test("totalSemana ignora valores inválidos", () => {
  assert.equal(Vendas.totalSemana({ a: 2, b: 3 }), 5);
  assert.equal(Vendas.totalSemana({ a: 2, b: NaN }), 2);
  assert.equal(Vendas.totalSemana({}), 0);
});

test("normalizarSemana de data vazia cai na segunda atual", () => {
  const vazio = Vendas.normalizarSemana("");
  assert.equal(new Date(`${vazio}T12:00:00`).getDay(), 1);
  assert.equal(vazio, Vendas.normalizarSemana(new Date()));
});

test("atrasada avisa depois de duas semanas sem venda", () => {
  assert.equal(Vendas.atrasada("2026-11-02", "2026-11-23"), true);
  assert.equal(Vendas.atrasada("2026-11-09", "2026-11-23"), false);
  assert.equal(Vendas.atrasada(null, "2026-11-23"), false);
});

test("fimSemana retorna o domingo da semana", () => {
  assert.equal(Vendas.fimSemana("2026-11-23"), "2026-11-29");
  assert.equal(Vendas.fimSemana("2026-11-25"), "2026-11-29");
});
