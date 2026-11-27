# Mercadinho Seridó — Vendas diárias — Implementation Plan

> **For agentic workers:** execute natively with TDD. The branch is `feat/vendas-diarias`, base `c5bc667`. Run `npm test` after every task and finish with the manual smoke in `docs/verificacao.md`. Open a PR, review, merge and deploy.

**Goal:** trocar o armazenamento semanal por dias, adicionar visões Dia/Semana/Mês/Ano e manter a decisão de compra semanal.

**Architecture:** `Estado` v2 guarda `dias` e migra v1; `Vendas` ganha CRUD diário, série semanal e resumo por período; `app.js` usa dias na aba Vendas e a série semanal em Compras. Sem build/dependências.

**Spec:** `docs/superpowers/specs/2026-11-27-mercadinho-vendas-diarias-design.md`

## Global Constraints

- Decisão semanal; período só muda a visualização.
- Estado v2: `{ versao: 2, produtos, dias, exemplo }`; chave `mercadinho-serido:v2`.
- Um dia por data; valores positivos; dia vazio não é salvo.
- Exemplo com 12 semanas e totais semanais iguais aos da versão anterior; semana corrente só até a data de referência.
- Migração v1→v2 preserva o total semanal; estado v1 de exemplo é descartado e regenerado.
- 60+ testes; mobile 360 px sem overflow; slides/README atualizados.
- Commits pequenos; PR separado; deploy no Pages.

## Task 1: Estado v2, exemplo diário e migração

**Files:** `js/estado.js`, `test/estado.test.js`

**Interfaces:**
- `Estado.CHAVE = "mercadinho-serido:v2"`, `Estado.CHAVE_ANTERIOR = "mercadinho-serido:v1"`.
- `Estado.estadoVazio() -> {versao:2, produtos:[], dias:[], exemplo:false}`
- `Estado.estadoExemplo(referencia = new Date()) -> StateV2`
- `Estado.validar(estado) -> boolean`
- `Estado.carregar(storage) -> {estado, aviso}`
- `Estado.salvar(estado, storage) -> boolean`

- [ ] Testes: exemplo v2 com dias, última data = referência, sem datas futuras; migração de v1 não-exemplo preserva a soma semanal; v1 exemplo é regenerado; storage bloqueado; data impossível/dia vazio rejeitados.
- [ ] Implementar `distribuirSemana(valores, dias)` com pesos determinísticos e ajuste no último dia.
- [ ] `estadoExemplo` gera as 12 semanas antigas e distribui: semanas anteriores em 7 dias; semana da referência até o dia da referência.
- [ ] `carregar`: v2 válido; senão v1 válido não-exemplo migra; v1 exemplo regenera; inválido cai no exemplo com aviso.
- [ ] Rodar `node --test test/estado.test.js` e commitar.

## Task 2: CRUD diário, série semanal e resumo por período

**Files:** `js/vendas.js`, `test/vendas.test.js`

**Interfaces:**
- `Vendas.normalizarDia(data) -> "YYYY-MM-DD"`
- `Vendas.adicionarDias(dataISO, n)`, `normalizarSemana`, `adicionarSemanas`, `fimSemana`
- `Vendas.salvarDia(dias, data, valores, produtos) -> Dia[]`
- `Vendas.removerDia(dias, data) -> Dia[]`
- `Vendas.removerProduto(dias, produtoId) -> Dia[]`
- `Vendas.serieSemanal(dias, produtoId) -> {semanas: string[], valores: number[]}`
- `Vendas.resumoPeriodo(dias, produtos, periodo, referencia) -> {inicio, fim, porProduto, totalReceita}`
- `Vendas.ultimoDia(dias)`, `ultimaSemana(dias)`, `proximaSemana(dias)`, `atrasada(ultima, hoje)`, `totalDia(valores)`

- [ ] Testes: salvar/atualizar/excluir dia; dia vazio/negativo/duplicado; remover produto e dias vazios; série semanal com lacunas e início na primeira venda; resumo dia/semana/mês/ano; última semana/próxima/atraso.
- [ ] Implementar as funções; `serieSemanal` agrupa por segunda e soma; `resumoPeriodo` fecha os limites de mês/ano corretamente.
- [ ] Rodar `node --test test/vendas.test.js` e commitar.

## Task 3: Aba Vendas diária e Compras semanal

**Files:** `js/app.js`, `style.css`, `index.html`, `test/estado.test.js`, `test/vendas.test.js`

**Interfaces:**
- Estado do app: `dias`, `dataSelecionada`, `periodo` (`dia|semana|mes|ano`).
- `renderVendas`: cartão “Lançamento do dia” + cartão “Resumo do período”.
- `renderCompras`: `Vendas.serieSemanal(state.dias, id)`; `proximaSemana`/`atrasada` usando dias.
- Remoção de produto: `Vendas.removerProduto(state.dias, id)`.

- [ ] Trocar todas as referências de `state.semanas`/`semanaSelecionada` por `state.dias`/`dataSelecionada`.
- [ ] Vendas: input de dia, anterior/próximo/hoje, grade de produtos, salvar/excluir dia; seletor de período e tabela de resumo com intervalo.
- [ ] Compras: série semanal, aviso de atraso, gráfico 12+4 e regra de compra inalterados.
- [ ] Produtos: carregar exemplo/limpar dados com v2; remoção limpa dias.
- [ ] CSS: período, intervalo, mobile; versionar assets (`?v=20261127c`).
- [ ] Smoke: lançar dia, alternar períodos, conferir resumo, voltar para Compras, 360 px sem overflow.
- [ ] Commitar.

## Task 4: README, slides, roteiro e verificação

**Files:** `README.md`, `slides.html`, `slides/roteiro.md`, `docs/verificacao.md`, `slides.pdf`, `slides/img/deck-*.png`

- [ ] README: dados diários, visões por período, decisão semanal, migração, 60+ testes.
- [ ] Slides/roteiro: “dados diários, decisão semanal, pronto para integrar ao caixa”; atualizar demo e contagem de testes.
- [ ] Regenerar slides 3/5/9 (e PDF) se o texto mudar; manter screenshots de Compras.
- [ ] Atualizar o smoke em `docs/verificacao.md`.
- [ ] Commitar.

## Task 5: Testes, PR, revisão e deploy

- [ ] `npm test` (60+), `node --check`, smoke completo.
- [ ] Push, abrir PR, rodar revisão local/cubic se disponível, corrigir achados.
- [ ] Merge, aguardar Pages, validar app/slides/PDF no ar e mobile.

---

## Self-Review

- Spec coverage: v2/migração (Task 1), agregações (Task 2), UI (Task 3), docs/slides (Task 4), entrega (Task 5).
- Type consistency: `dias` em todo o app; `serieSemanal` retorna semanas ISO; `resumoPeriodo` retorna `porProduto`.
- Review focus: datas canônicas, migração sem perda, semana corrente sem futuro, período não altera previsão, mobile.
