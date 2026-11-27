const test = require("node:test");
const assert = require("node:assert/strict");
const Vendas = require("../js/vendas.js");
const Estado = require("../js/estado.js");

const PRODUTOS = [
  { id: "a", nome: "Arroz", preco: 2, unidade: "un" },
  { id: "b", nome: "Feijão", preco: 5, unidade: "un" },
];

test("normaliza dia e semana", () => {
  assert.equal(Vendas.normalizarDia("2026-11-25"), "2026-11-25");
  assert.equal(Vendas.normalizarSemana("2026-11-22"), "2026-11-16");
  assert.equal(Vendas.normalizarSemana("2026-11-23"), "2026-11-23");
  assert.equal(Vendas.normalizarSemana("2026-11-25"), "2026-11-23");
});

test("adicionar dias/semanas cruza mês e ano, e fimSemana é domingo", () => {
  assert.equal(Vendas.adicionarDias("2026-12-31", 1), "2027-01-01");
  assert.equal(Vendas.adicionarDias("2026-01-01", -1), "2025-12-31");
  assert.equal(Vendas.adicionarSemanas("2026-12-28", 1), "2027-01-04");
  assert.equal(Vendas.fimSemana("2026-11-23"), "2026-11-29");
  assert.equal(Vendas.fimSemana("2026-11-25"), "2026-11-29");
});

test("salvarDia cria, atualiza e ordena", () => {
  let dias = Vendas.salvarDia([], "2026-11-25", { a: 10, b: 0 }, PRODUTOS);
  assert.equal(dias.length, 1);
  assert.equal(dias[0].data, "2026-11-25");
  assert.deepEqual(dias[0].valores, { a: 10 });

  dias = Vendas.salvarDia(dias, "2026-11-20", { b: 4 }, PRODUTOS);
  assert.deepEqual(dias.map((d) => d.data), ["2026-11-20", "2026-11-25"]);

  dias = Vendas.salvarDia(dias, "2026-11-25", { a: 5, b: 2 }, PRODUTOS);
  assert.equal(dias.length, 2);
  assert.deepEqual(dias.find((d) => d.data === "2026-11-25").valores, { a: 5, b: 2 });
});

test("salvarDia rejeita dia vazio, negativo e quantidade inválida", () => {
  assert.throws(() => Vendas.salvarDia([], "2026-11-25", { a: 0, b: 0 }, PRODUTOS), /pelo menos um/i);
  assert.throws(() => Vendas.salvarDia([], "2026-11-25", { a: -1 }, PRODUTOS), /negativ/i);
  assert.throws(() => Vendas.salvarDia([], "2026-11-25", { a: NaN }, PRODUTOS), /inválid/i);
});

test("salvarDia ignora produto desconhecido", () => {
  const dias = Vendas.salvarDia([], "2026-11-25", { a: 3, sumiu: 99 }, PRODUTOS);
  assert.deepEqual(dias[0].valores, { a: 3 });
});

test("removerDia e removerProduto limpam dias vazios", () => {
  const dias = [
    { data: "2026-11-09", valores: { a: 10, b: 5 } },
    { data: "2026-11-16", valores: { a: 2 } },
  ];
  assert.deepEqual(Vendas.removerDia(dias, "2026-11-09").map((d) => d.data), ["2026-11-16"]);
  const restantes = Vendas.removerProduto(dias, "a");
  assert.equal(restantes.length, 1);
  assert.deepEqual(restantes[0].valores, { b: 5 });
});

test("série semanal agrupa dias, preenche lacunas e começa na primeira venda", () => {
  const dias = [
    { data: "2026-11-02", valores: { a: 5 } },
    { data: "2026-11-04", valores: { a: 5 } },
    { data: "2026-11-18", valores: { a: 3 } },
    { data: "2026-11-19", valores: { b: 1 } },
  ];
  assert.deepEqual(Vendas.serieSemanal(dias, "a"), {
    semanas: ["2026-11-02", "2026-11-09", "2026-11-16"],
    valores: [10, 0, 3],
  });
  assert.deepEqual(Vendas.serieSemanal(dias, "b"), {
    semanas: ["2026-11-16"],
    valores: [1],
  });
  assert.deepEqual(Vendas.serieSemanal(dias, "sem-venda"), { semanas: [], valores: [] });
});

test("série semanal do exemplo tem 52 semanas", () => {
  const s = Estado.estadoExemplo(new Date("2026-11-27T12:00:00"));
  const serie = Vendas.serieSemanal(s.dias, "p-arroz");
  assert.equal(serie.semanas.length, 52);
  assert.ok(serie.valores.every((v) => v > 0));
  assert.equal(Vendas.serieSemanal(s.dias, "p-arroz").valores.reduce((a, b) => a + b, 0), s.dias.reduce((a, d) => a + (d.valores["p-arroz"] || 0), 0));
});

test("resumo por dia, semana, mês e ano", () => {
  const dias = [
    { data: "2026-11-02", valores: { a: 2 } },
    { data: "2026-11-04", valores: { a: 3, b: 1 } },
    { data: "2026-12-01", valores: { a: 4 } },
    { data: "2027-01-05", valores: { a: 5 } },
  ];
  const dia = Vendas.resumoPeriodo(dias, PRODUTOS, "dia", "2026-11-04");
  assert.deepEqual({ inicio: dia.inicio, fim: dia.fim }, { inicio: "2026-11-04", fim: "2026-11-04" });
  assert.equal(dia.porProduto.a.quantidade, 3);
  assert.equal(dia.porProduto.b.receita, 5);
  assert.equal(dia.totalReceita, 11);

  const semana = Vendas.resumoPeriodo(dias, PRODUTOS, "semana", "2026-11-04");
  assert.deepEqual({ inicio: semana.inicio, fim: semana.fim }, { inicio: "2026-11-02", fim: "2026-11-08" });
  assert.equal(semana.porProduto.a.quantidade, 5);
  assert.equal(semana.porProduto.b.quantidade, 1);
  assert.equal(semana.totalReceita, 15);

  const mes = Vendas.resumoPeriodo(dias, PRODUTOS, "mes", "2026-11-04");
  assert.deepEqual({ inicio: mes.inicio, fim: mes.fim }, { inicio: "2026-11-01", fim: "2026-11-30" });
  assert.equal(mes.totalReceita, 15);

  const ano = Vendas.resumoPeriodo(dias, PRODUTOS, "ano", "2026-11-04");
  assert.deepEqual({ inicio: ano.inicio, fim: ano.fim }, { inicio: "2026-01-01", fim: "2026-12-31" });
  assert.equal(ano.porProduto.a.quantidade, 9);
  assert.equal(ano.totalReceita, 23);

  const proximo = Vendas.resumoPeriodo(dias, PRODUTOS, "ano", "2027-01-05");
  assert.equal(proximo.totalReceita, 10);
});

test("último dia, última semana, próxima e atraso", () => {
  const dias = [
    { data: "2026-11-02", valores: { a: 1 } },
    { data: "2026-11-19", valores: { a: 2 } },
  ];
  assert.equal(Vendas.ultimoDia(dias), "2026-11-19");
  assert.equal(Vendas.ultimaSemana(dias), "2026-11-16");
  assert.equal(Vendas.proximaSemana(dias), "2026-11-23");
  assert.equal(Vendas.ultimoDia([]), null);
  assert.equal(Vendas.ultimaSemana([]), null);
  assert.equal(Vendas.proximaSemana([]), null);
  assert.equal(Vendas.atrasada("2026-11-16", "2026-11-30"), false);
  assert.equal(Vendas.atrasada("2026-11-16", "2026-12-01"), true);
  assert.equal(Vendas.atrasada(null, "2026-12-01"), false);
});

test("totalDia ignora valores inválidos", () => {
  assert.equal(Vendas.totalDia({ a: 2, b: 3 }), 5);
  assert.equal(Vendas.totalDia({ a: 2, b: NaN }), 2);
  assert.equal(Vendas.totalDia({}), 0);
});

test("resumo do mês cobre fevereiro bissexto", () => {
  const dias = [{ data: "2024-02-29", valores: { a: 7 } }];
  const r = Vendas.resumoPeriodo(dias, PRODUTOS, "mes", "2024-02-15");
  assert.deepEqual({ inicio: r.inicio, fim: r.fim }, { inicio: "2024-02-01", fim: "2024-02-29" });
  assert.equal(r.porProduto.a.quantidade, 7);
  assert.equal(r.totalReceita, 14);
});

test("resumo da semana cruza o ano", () => {
  const dias = [
    { data: "2026-12-31", valores: { a: 1 } },
    { data: "2027-01-02", valores: { a: 2 } },
  ];
  const r = Vendas.resumoPeriodo(dias, PRODUTOS, "semana", "2027-01-01");
  assert.deepEqual({ inicio: r.inicio, fim: r.fim }, { inicio: "2026-12-28", fim: "2027-01-03" });
  assert.equal(r.porProduto.a.quantidade, 3);
});

test("resumo sem venda retorna zeros", () => {
  const r = Vendas.resumoPeriodo([], PRODUTOS, "dia", "2026-11-25");
  assert.equal(r.totalReceita, 0);
  assert.equal(r.porProduto.a.quantidade, 0);
});

test("série semanal cruza o ano e preenche lacuna", () => {
  const dias = [
    { data: "2026-12-31", valores: { a: 1 } },
    { data: "2027-01-05", valores: { a: 2 } },
  ];
  assert.deepEqual(Vendas.serieSemanal(dias, "a"), {
    semanas: ["2026-12-28", "2027-01-04"],
    valores: [1, 2],
  });
  assert.equal(Vendas.ultimaSemana(dias), "2027-01-04");
  assert.equal(Vendas.proximaSemana(dias), "2027-01-11");
});

test("remover o único produto de todos os dias deixa a lista vazia", () => {
  const dias = [{ data: "2026-11-25", valores: { a: 3 } }];
  assert.deepEqual(Vendas.removerProduto(dias, "a"), []);
});

test("atualizar um dia para zero é rejeitado", () => {
  const dias = [{ data: "2026-11-25", valores: { a: 3 } }];
  assert.throws(() => Vendas.salvarDia(dias, "2026-11-25", { a: 0 }, PRODUTOS), /pelo menos um/i);
});

test("salvarDia rejeita data futura", () => {
  const hoje = Vendas.normalizarDia(new Date());
  const amanha = Vendas.adicionarDias(hoje, 1);
  assert.throws(() => Vendas.salvarDia([], amanha, { a: 1 }, PRODUTOS), /futuras/);
});

test("salvarDia rejeita fração em produto un", () => {
  assert.throws(() => Vendas.salvarDia([], "2026-11-25", { a: 1.5 }, PRODUTOS), /inteira/);
});

test("normalizarDia de null ou timestamp com offset cai em hoje", () => {
  const hoje = Vendas.normalizarDia(new Date());
  assert.equal(Vendas.normalizarDia(null), hoje);
  assert.equal(Vendas.normalizarDia("2024-01-15T00:00:00.000Z"), hoje);
});

test("série semanal preenche lacuna real entre semanas", () => {
  const dias = [
    { data: "2026-12-31", valores: { a: 1 } },
    { data: "2027-01-12", valores: { a: 2 } },
  ];
  assert.deepEqual(Vendas.serieSemanal(dias, "a"), {
    semanas: ["2026-12-28", "2027-01-04", "2027-01-11"],
    valores: [1, 0, 2],
  });
});

test("série de a começa na primeira venda mesmo com b antes", () => {
  const dias = [
    { data: "2026-11-01", valores: { b: 2 } },
    { data: "2026-11-02", valores: { a: 5 } },
  ];
  assert.deepEqual(Vendas.serieSemanal(dias, "a"), {
    semanas: ["2026-11-02"],
    valores: [5],
  });
});
