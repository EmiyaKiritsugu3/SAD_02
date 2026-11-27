# Mercadinho Seridó — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task (native execution in this session). The user asked for continuous development and a review/improvement loop; in Task 14, use `superpowers:cubic-loop` until the PR review is clean or the iteration limit is reached.

**Goal:** Construir o MVP do Mercadinho Seridó: o dono cadastra produtos e vendas semanais e recebe uma lista de compras sugerida para a próxima semana.

**Architecture:** App estático em HTML/CSS/JavaScript vanilla, sem build e sem dependências de runtime. Três abas (Compras, Vendas, Produtos), estado em `localStorage`, previsão por produto com `Previsao` e recomendação de compra com `Compras`. Tudo processado no navegador.

**Tech Stack:** HTML, CSS, JavaScript (ES2020), `node:test`, Playwright (smoke), GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-11-27-mercadinho-serido-design.md`

## Global Constraints

- Interface em português do Brasil; tom direto, sem jargão.
- Três abas: **Compras**, **Vendas**, **Produtos**. Compras é a tela inicial.
- Sem build, sem dependências de runtime, sem servidor; dados só em `localStorage` (`mercadinho-serido:v1`).
- 10 produtos e 12 semanas no exemplo inicial; qualquer edição marca `exemplo: false`.
- Datas de semana normalizadas para segunda-feira; usar meio-dia local para evitar erro de fuso.
- Quantidades em `un`, `kg` ou `L`; dinheiro em BRL.
- O app não é PDV: estoque é atualizado manualmente; a lista de compras é sugestão.
- 25–30 testes passando; smoke test em 360 px e 1366 px sem overflow e sem erros de console.
- Não mencionar frigorífico, AHP, carcaça, miúdos ou cortes como escopo atual.
- Commits pequenos e frequentes; um commit por task ou por correção relevante.

## Review Focus

- **Fuso e segunda-feira:** datas de domingo/segunda/quarta devem cair na mesma semana correta; a série semanal não pode pular nem duplicar semanas.
- **Produto removido:** valores órfãos não podem quebrar a previsão nem a lista de compras; remover produto limpa todas as semanas.
- **Série curta/lacunas:** produtos com menos de 4 semanas ou com semanas sem venda não podem gerar `NaN`, `Infinity` ou previsão negativa.
- **Arredondamento:** `un` arredonda para cima; `kg`/`L` usa uma casa decimal; estoque mínimo zero e estoque atual maior que a previsão resultam em compra zero.
- **`localStorage` corrompido:** JSON inválido, versão errada ou campos faltando devem cair no exemplo com aviso, sem tela branca.
- **Mobile:** nomes longos, tabelas largas e muitos produtos não podem causar overflow horizontal na página.

---

## Task 1: Estado, exemplo e persistência

**Files:**
- Create: `js/estado.js`
- Create: `test/estado.test.js`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `Estado.CHAVE = "mercadinho-serido:v1"`
  - `Estado.estadoVazio() -> State`
  - `Estado.estadoExemplo(referencia = new Date()) -> State`
  - `Estado.validar(estado) -> boolean`
  - `Estado.carregar(storage = globalThis.localStorage) -> { estado, aviso }`
  - `Estado.salvar(estado, storage = globalThis.localStorage) -> boolean`

`State` é `{ versao: 1, produtos: Produto[], semanas: Semana[], exemplo: boolean }`, com os formatos da spec.

- [ ] **Step 1: Escrever os testes de exemplo e validação**

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const Estado = require("../js/estado.js");

test("exemplo tem 10 produtos e 12 semanas", () => {
  const s = Estado.estadoExemplo(new Date("2026-11-27T12:00:00"));
  assert.equal(s.produtos.length, 10);
  assert.equal(s.semanas.length, 12);
  assert.equal(s.exemplo, true);
  assert.equal(s.semanas.at(-1).data, "2026-11-23");
  assert.ok(s.semanas.every((sem) => new Date(sem.data + "T12:00:00").getDay() === 1));
});

test("estado vazio é válido e não tem exemplo", () => {
  const s = Estado.estadoVazio();
  assert.deepEqual(s, { versao: 1, produtos: [], semanas: [], exemplo: false });
  assert.equal(Estado.validar(s), true);
});

test("estado inválido é rejeitado", () => {
  assert.equal(Estado.validar(null), false);
  assert.equal(Estado.validar({ versao: 1, produtos: [], semanas: "x", exemplo: false }), false);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test test/estado.test.js`
Expected: FAIL porque `js/estado.js` não existe.

- [ ] **Step 3: Implementar `js/estado.js`**

Produtos de exemplo com IDs fixos: `p-arroz`, `p-feijao`, `p-macarrao`, `p-acucar`, `p-cafe`, `p-oleo`, `p-leite`, `p-pao`, `p-ovos`, `p-banana`. Unidades: `un` para os nove primeiros, `kg` para banana. Valores de venda determinísticos, com 12 semanas terminando na última segunda-feira completa antes de `referencia`; usar um RNG com seed fixa e uma sazonalidade leve. Todas as semanas são segundas-feiras em ISO (`YYYY-MM-DD`).

`validar` deve checar: versão 1, arrays, produto com `id/nome/unidade/custo/preco/estoqueAtual/estoqueMinimo`, unidade em `["un","kg","L"]`, números finitos e não negativos, nome não vazio; semana com `data` segunda-feira ISO e `valores` objeto com números finitos não negativos; toda chave de `valores` deve existir em `produtos`.

`carregar` deve retornar `{ estado: estadoExemplo(), aviso: null }` quando não há chave; se o JSON for inválido ou `validar` falhar, retornar o exemplo com `aviso: "Não foi possível carregar os dados salvos. Carregamos o exemplo."`; se válido, retornar o estado salvo.

`salvar` faz `JSON.stringify` e `setItem`; retorna `true`/`false` e nunca lança.

- [ ] **Step 4: Rodar os testes**

Run: `node --test test/estado.test.js`
Expected: PASS.

- [ ] **Step 5: Commitar**

```bash
git add js/estado.js test/estado.test.js
git commit -m "feat: estado, exemplo e persistencia do mercadinho"
```

## Task 2: Cadastro de produtos

**Files:**
- Create: `js/produtos.js`
- Create: `test/produtos.test.js`

**Interfaces:**
- Consumes: formato `Produto` da Task 1.
- Produces:
  - `Produtos.UNIDADES = ["un", "kg", "L"]`
  - `Produtos.validar(produto, existentes = [], idAtual = null) -> string[]`
  - `Produtos.criar(dados, existentes = [], agora = Date.now()) -> Produto`
  - `Produtos.atualizar(produto, dados, existentes = []) -> Produto`
  - `Produtos.remover(produtos, id) -> Produto[]`
  - `Produtos.porId(produtos, id) -> Produto | undefined`

- [ ] **Step 1: Escrever os testes**

```js
test("cria produto com id slug e campos numéricos", () => {
  const p = Produtos.criar({ nome: "Arroz 5 kg", unidade: "un", custo: 22.5, preco: 27.9, estoqueAtual: 8, estoqueMinimo: 4 }, [], 1700000000000);
  assert.match(p.id, /^p-arroz-5-kg-/);
  assert.equal(p.estoqueMinimo, 4);
});

test("rejeita nome duplicado sem diferenciar maiúsculas", () => {
  const p = Produtos.criar({ nome: "Leite 1 L", unidade: "L", custo: 4, preco: 5, estoqueAtual: 0, estoqueMinimo: 0 });
  assert.ok(Produtos.validar({ ...p, nome: "leite 1 l" }, [p]).length > 0);
});

test("renomear preserva id e histórico", () => {
  const p = Produtos.criar({ nome: "Café", unidade: "un", custo: 10, preco: 14, estoqueAtual: 2, estoqueMinimo: 1 });
  const atualizado = Produtos.atualizar(p, { ...p, nome: "Café 500 g" }, [p]);
  assert.equal(atualizado.id, p.id);
});

test("não remove o último produto", () => {
  const p = Produtos.criar({ nome: "Pão", unidade: "un", custo: 0.5, preco: 1, estoqueAtual: 0, estoqueMinimo: 0 });
  assert.throws(() => Produtos.remover([p], p.id));
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test test/produtos.test.js`
Expected: FAIL porque `js/produtos.js` não existe.

- [ ] **Step 3: Implementar `js/produtos.js`**

`validar` retorna lista de mensagens em português; nome obrigatório (2–60 caracteres), unidade válida, custo/preço/estoque finitos e `>= 0`, nome único (case-insensitive, ignorando `idAtual`). `criar` valida e lança `Error` com a primeira mensagem; gera ID `p-<slug>-<timestamp>`, garantindo unicidade. `atualizar` preserva `id` e `criadoEm`. `remover` lança se o produto não existir ou se for o último.

- [ ] **Step 4: Rodar os testes**

Run: `node --test test/produtos.test.js`
Expected: PASS.

- [ ] **Step 5: Commitar**

```bash
git add js/produtos.js test/produtos.test.js
git commit -m "feat: cadastro e validacao de produtos"
```

## Task 3: Semanas, série e resumo mensal

**Files:**
- Create: `js/vendas.js`
- Create: `test/vendas.test.js`

**Interfaces:**
- Consumes: `State`, `Produto`.
- Produces:
  - `Vendas.normalizarSemana(data) -> "YYYY-MM-DD"` (segunda-feira)
  - `Vendas.adicionarSemanas(dataISO, n) -> "YYYY-MM-DD"`
  - `Vendas.salvarSemana(semanas, data, valores, produtos) -> Semana[]`
  - `Vendas.removerSemana(semanas, data) -> Semana[]`
  - `Vendas.removerProduto(semanas, produtoId) -> Semana[]`
  - `Vendas.serieProduto(semanas, produtoId) -> { semanas: string[], valores: number[] }`
  - `Vendas.resumoMensal(semanas, produtos) -> ResumoMensal[]`
  - `Vendas.ultimaSemana(semanas) -> string | null`
  - `Vendas.proximaSemana(semanas) -> string | null`
  - `Vendas.totalSemana(valores) -> number`

- [ ] **Step 1: Escrever os testes de data e série**

```js
test("normaliza domingo, segunda e quarta para a mesma segunda", () => {
  assert.equal(Vendas.normalizarSemana("2026-11-22"), "2026-11-16");
  assert.equal(Vendas.normalizarSemana("2026-11-23"), "2026-11-23");
  assert.equal(Vendas.normalizarSemana("2026-11-25"), "2026-11-23");
});

test("série preenche lacunas com zero e começa na primeira venda", () => {
  const s = [
    { data: "2026-11-02", valores: { a: 0 } },
    { data: "2026-11-09", valores: { a: 10 } },
    { data: "2026-11-23", valores: { a: 20 } },
  ];
  assert.deepEqual(Vendas.serieProduto(s, "a"), {
    semanas: ["2026-11-09", "2026-11-16", "2026-11-23"],
    valores: [10, 0, 20],
  });
});

test("resumo mensal soma quantidade e receita", () => {
  const produtos = [{ id: "a", preco: 2 }];
  const r = Vendas.resumoMensal([
    { data: "2026-11-02", valores: { a: 10 } },
    { data: "2026-11-09", valores: { a: 5 } },
  ], produtos);
  assert.equal(r[0].porProduto.a.quantidade, 15);
  assert.equal(r[0].porProduto.a.receita, 30);
  assert.equal(r[0].totalReceita, 30);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test test/vendas.test.js`
Expected: FAIL porque `js/vendas.js` não existe.

- [ ] **Step 3: Implementar `js/vendas.js`**

`normalizarSemana` aceita `Date` ou ISO; usa `new Date(ano, mes, dia, 12)` para evitar UTC; subtrai `(getDay() + 6) % 7` dias; formata localmente em ISO. `salvarSemana` normaliza a data, valida valores finitos `>= 0`, ignora IDs desconhecidos, rejeita semana toda zero, atualiza se já existir e devolve a lista ordenada. `serieProduto` acha a primeira semana com valor `> 0` e a última semana registrada, gera todas as segundas-feiras do intervalo com `adicionarSemanas` e preenche ausentes com 0. `resumoMensal` agrupa por `YYYY-MM`, soma quantidade e receita (`quantidade * preco`), ordena por mês e devolve `totalReceita`.

- [ ] **Step 4: Rodar os testes**

Run: `node --test test/vendas.test.js`
Expected: PASS.

- [ ] **Step 5: Commitar**

```bash
git add js/vendas.js test/vendas.test.js
git commit -m "feat: semanas, series e resumo mensal"
```

## Task 4: Regra de previsão para séries curtas

**Files:**
- Modify: `js/previsao.js` (adicionar `paraSerie` ao final)
- Modify: `test/previsao.test.js`

**Interfaces:**
- Consumes: funções existentes `mediaMovel`, `escolherMelhor`, `prever`, `backtest`.
- Produces: `Previsao.paraSerie(serie) -> { metodo, params, prev4, metricas } | null`.

- [ ] **Step 1: Adicionar testes**

```js
test("paraSerie não prevê com menos de 4 semanas", () => {
  assert.equal(P.paraSerie([10, 20, 30]), null);
});

test("paraSerie usa média móvel entre 4 e 7 semanas", () => {
  const r = P.paraSerie([10, 10, 10, 10, 10]);
  assert.equal(r.metodo, "mediaMovel");
  assert.equal(r.prev4.length, 4);
});

test("paraSerie escolhe automático a partir de 8 semanas", () => {
  const r = P.paraSerie([10, 20, 30, 40, 50, 60, 70, 80]);
  assert.ok(["mediaMovel", "ses", "regressao"].includes(r.metodo));
  assert.equal(r.prev4.length, 4);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test test/previsao.test.js`
Expected: FAIL porque `paraSerie` não existe.

- [ ] **Step 3: Implementar `paraSerie`**

Menos de 4 valores: `null`. De 4 a 7: `{ metodo: "mediaMovel", params: { janela: Math.min(4, serie.length) }, prev4: prever(...), metricas: backtest(...) }`. A partir de 8: `const escolha = escolherMelhor(serie, 4); return { ...escolha, prev4: prever(serie, escolha.metodo, escolha.params, 4) };`. Exportar `paraSerie`.

- [ ] **Step 4: Rodar os testes**

Run: `node --test test/previsao.test.js`
Expected: PASS.

- [ ] **Step 5: Commitar**

```bash
git add js/previsao.js test/previsao.test.js
git commit -m "feat: previsao automatica com regra para series curtas"
```

## Task 5: Compra sugerida

**Files:**
- Create: `js/compras.js`
- Create: `test/compras.test.js`

**Interfaces:**
- Consumes: `Produto`, previsão numérica ou `null`.
- Produces:
  - `Compras.arredondar(quantidade, unidade) -> number`
  - `Compras.sugerir(produto, previsao) -> { previsao, necessidade, sugestao, custo, semDados }`
  - `Compras.lista(produtos, previsoes) -> ItemCompra[]`
  - `Compras.total(itens) -> number`
  - `Compras.semDados(itens) -> number`

- [ ] **Step 1: Escrever os testes**

```js
test("sugere compra descontando estoque e somando minimo", () => {
  const p = { id: "a", unidade: "un", custo: 2, estoqueAtual: 5, estoqueMinimo: 3 };
  const r = Compras.sugerir(p, 10);
  assert.equal(r.necessidade, 8);
  assert.equal(r.sugestao, 8);
  assert.equal(r.custo, 16);
});

test("un arredonda para cima e kg usa uma casa", () => {
  assert.equal(Compras.arredondar(2.1, "un"), 3);
  assert.equal(Compras.arredondar(2.14, "kg"), 2.1);
});

test("estoque que cobre a previsão sugere zero", () => {
  const p = { id: "a", unidade: "kg", custo: 10, estoqueAtual: 20, estoqueMinimo: 0 };
  assert.equal(Compras.sugerir(p, 15).sugestao, 0);
});

test("sem previsão retorna semDados", () => {
  const p = { id: "a", unidade: "un", custo: 2, estoqueAtual: 0, estoqueMinimo: 0 };
  const r = Compras.sugerir(p, null);
  assert.equal(r.semDados, true);
  assert.equal(r.sugestao, null);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test test/compras.test.js`
Expected: FAIL porque `js/compras.js` não existe.

- [ ] **Step 3: Implementar `js/compras.js`**

`necessidade = Math.max(0, previsao + estoqueMinimo - estoqueAtual)`. `arredondar`: `un` → `Math.ceil`; `kg`/`L` → `Math.round(q * 10) / 10`. `custo = sugestao * custo`. `lista` preserva a ordem dos produtos, usa `previsoes[id] ?? null`. `total` soma custos; `semDados` conta `semDados`.

- [ ] **Step 4: Rodar os testes**

Run: `node --test test/compras.test.js`
Expected: PASS.

- [ ] **Step 5: Commitar**

```bash
git add js/compras.js test/compras.test.js
git commit -m "feat: recomendacao de compra semanal"
```

## Task 6: Shell, navegação e estados vazios

**Files:**
- Modify: `index.html` (substituir shell)
- Modify: `style.css` (novo layout de 3 abas; manter variáveis/fontes)
- Create: `js/app.js` (substituir o antigo)
- Modify: `package.json` (`name`: `mercadinho-serido`)

**Interfaces:**
- Consumes: `Estado`, `Vendas`, `Previsao`, `Compras`, `Produtos`, `Charts`.
- Produces: app com `data-aba="compras|vendas|produtos"`, `#app`, `#toast`, `state` interno.

- [ ] **Step 1: Escrever o shell**

`index.html` deve ter skip link, header com marca **MS / Mercadinho Seridó**, três botões de aba, `main#conteudo` com `#app` e `#toast`, e scripts na ordem: `estado.js`, `produtos.js`, `vendas.js`, `previsao.js`, `compras.js`, `charts.js`, `app.js`.

- [ ] **Step 2: Implementar o estado inicial e a navegação**

`app.js`:
- `const state = { aba: "compras", produtos: [], semanas: [], exemplo: false, produtoSelecionado: null, semanaSelecionada: Vendas.normalizarSemana(new Date()), mesSelecionado: null, visaoMensal: false, filtro: "", produtoEditando: null }`.
- `iniciar()`: `const { estado, aviso } = Estado.carregar();` aplicar; se `aviso`, toast; render.
- `salvar()`: `Estado.salvar({ versao: 1, produtos: state.produtos, semanas: state.semanas, exemplo: state.exemplo })`.
- `render()`: alterna classe ativa das abas, título/subtítulo e chama `renderCompras`, `renderVendas` ou `renderProdutos`.
- Delegação de clique em `[data-aba]`; `render` inicial.
- Estado vazio de Compras/Vendas com botões `data-acao="ir-produtos"` e `data-acao="ir-vendas"`.

- [ ] **Step 3: CSS mínimo**

Layout de topbar (não sidebar), tabs, cards, tabelas com `overflow-x: auto`, botões, formulários, toast, `:focus-visible` com contraste, inputs com `font-size: 16px` no mobile. Reutilizar as variáveis de cor/fontes existentes em `style.css`; remover regras da sidebar antiga.

- [ ] **Step 4: Smoke test**

Run: `python3 -m http.server 8000` e abrir no Playwright.
Expected: app carrega o exemplo, três abas visíveis, Compras é a inicial, sem erro de console.

- [ ] **Step 5: Commitar**

```bash
git add index.html style.css js/app.js package.json
git commit -m "feat: shell e navegacao do mercadinho"
```

## Task 7: Aba Compras

**Files:**
- Modify: `js/app.js` (`renderCompras`)
- Modify: `style.css` (tabela/gráfico/detalhes)

**Interfaces:**
- Consumes: `Vendas.serieProduto`, `Previsao.paraSerie`, `Compras.lista`, `Charts.linha`.
- Produces: DOM com `#tabela-compras`, `[data-produto]`, `#grafico-produto`, `#como-calculamos`, `#total-compra`.

- [ ] **Step 1: Calcular as previsões**

Para cada produto: `const serie = Vendas.serieProduto(state.semanas, p.id); const prev = Previsao.paraSerie(serie.valores); const previsao = prev?.prev4?.[0] ?? null;`. Montar `previsoes[p.id] = previsao` e `itens = Compras.lista(state.produtos, previsoes)`.

- [ ] **Step 2: Renderizar cabeçalho, resumo e tabela**

Cabeçalho com `Vendas.proximaSemana(state.semanas)` formatado `DD/MM`; se não houver, “sem vendas registradas”. Resumo: total de produtos, custo total, produtos sem dados. Tabela com colunas da spec; linha clicável define `state.produtoSelecionado` e re-renderiza o gráfico. Filtro por nome (`state.filtro`). Linhas sem previsão: “sem dados”; necessidade zero: “estoque cobre”.

- [ ] **Step 3: Gráfico e “Como calculamos”**

Se o produto selecionado tiver previsão, montar as últimas 12 semanas + 4 previstas. Definir `fmtCurta(iso)` como `DD/MM`:
```js
const hist = serie.valores.slice(-12);
const labels = [...serie.semanas.slice(-12).map(fmtCurta), ...prev4.map((_, i) => fmtCurta(Vendas.adicionarSemanas(ultima, i + 1)))];
const historico = [...hist, null, null, null, null];
const previsaoSerie = [...Array(hist.length - 1).fill(null), hist.at(-1), ...prev.prev4];
```
Usar `Charts.linha` com `height: 300`, `rotuloY: "quantidade"`; se não houver previsão, mensagem “cadastre pelo menos 4 semanas”. `<details>` com método, MAE/MAPE e a fórmula `previsão + mínimo − estoque`.

- [ ] **Step 4: Smoke test**

Playwright: abrir Compras, conferir a tabela com 10 produtos, selecionar um produto, ver o SVG e o bloco “Como calculamos”, conferir o total.

- [ ] **Step 5: Commitar**

```bash
git add js/app.js style.css
git commit -m "feat: aba de compras com previsao e recomendacao"
```

## Task 8: Aba Vendas

**Files:**
- Modify: `js/app.js` (`renderVendas`)
- Modify: `style.css` (grade semanal/mensal)

**Interfaces:**
- Consumes: `Vendas.salvarSemana`, `Vendas.removerSemana`, `Vendas.resumoMensal`, `Vendas.normalizarSemana`.
- Produces: DOM com `#semana-data`, `[data-venda-produto]`, `[data-acao="salvar-semana"]`, `[data-acao="excluir-semana"]`, `[data-acao="alternar-mensal"]`.

- [ ] **Step 1: Renderizar a semana**

Input `type="date"` com `state.semanaSelecionada`; botões anterior/próxima (`±7 dias`). Carregar a semana existente pelo `data` normalizado; se não existir, valores zero. Grade com produtos e inputs numéricos (`min=0`, `step=0.1` para kg/L, `step=1` para un). Botão salvar; botão excluir se a semana existir.

- [ ] **Step 2: Salvar e excluir**

Salvar: montar `valores` a partir dos inputs; `Vendas.salvarSemana(state.semanas, state.semanaSelecionada, valores, state.produtos)`; atualizar `state.semanas`; `state.exemplo = false`; `salvar()`; toast; `render()`. Erros: toast com a mensagem, sem alterar o estado. Excluir: `confirm`, `Vendas.removerSemana`, salvar/render.

- [ ] **Step 3: Resumo mensal**

Botão “Ver por mês” alterna `state.visaoMensal`. Se ativo: `Vendas.resumoMensal(state.semanas, state.produtos)`, seletor de mês, tabela por produto (`quantidade`, `receita`) e total. Se não houver dados: “Nenhuma venda registrada”.

- [ ] **Step 4: Smoke test**

Playwright: navegar para Vendas, selecionar uma semana, preencher dois produtos, salvar, voltar para Compras e conferir que a previsão/compra mudou; alternar mensal; excluir a semana.

- [ ] **Step 5: Commitar**

```bash
git add js/app.js style.css
git commit -m "feat: lancamento semanal e resumo mensal de vendas"
```

## Task 9: Aba Produtos

**Files:**
- Modify: `js/app.js` (`renderProdutos`)
- Modify: `style.css` (formulário/lista)

**Interfaces:**
- Consumes: `Produtos.validar/criar/atualizar/remover`, `Vendas.removerProduto`, `Estado.estadoExemplo`, `Estado.estadoVazio`.
- Produces: DOM com `#form-produto`, `[data-campo-produto]`, `[data-acao="salvar-produto"]`, `[data-acao="editar-produto"]`, `[data-acao="remover-produto"]`, `[data-acao="carregar-exemplo"]`, `[data-acao="limpar-dados"]`.

- [ ] **Step 1: Formulário de adicionar/editar**

Campos: nome, unidade (select), custo, preço, estoque atual, estoque mínimo. `state.produtoEditando` guarda o ID; ao editar, preencher o formulário; ao salvar, chamar `Produtos.criar` ou `Produtos.atualizar`; validar e mostrar erros inline; `state.exemplo = false`; salvar/render.

- [ ] **Step 2: Remover produto**

`confirm` com aviso de que o histórico será apagado; `Produtos.remover`; `Vendas.removerProduto`; se o produto removido era o selecionado, limpar `state.produtoSelecionado`; salvar/render. Se for o último, toast e não remover.

- [ ] **Step 3: Exemplo e limpar**

“Carregar exemplo”: `confirm` se já houver dados; `Estado.estadoExemplo()`; aplicar; salvar/render; toast. “Limpar dados”: `confirm`; `Estado.estadoVazio()`; aplicar; salvar/render; toast.

- [ ] **Step 4: Smoke test**

Playwright: adicionar um produto, editar, remover; carregar exemplo; limpar dados; conferir os estados vazios.

- [ ] **Step 5: Commitar**

```bash
git add js/app.js style.css
git commit -m "feat: cadastro de produtos e dados de exemplo"
```

## Task 10: Responsividade e acessibilidade

**Files:**
- Modify: `style.css`
- Modify: `index.html` (labels/aria quando necessário)
- Modify: `js/app.js` (aria-live/foco)

**Interfaces:** nenhuma nova; apenas classes/atributos.

- [ ] **Step 1: Ajustar mobile**

Barra de abas com scroll horizontal; tabelas com `overflow-x: auto`; inputs `font-size: 16px`; botões com alvo mínimo de 44 px; nomes longos com quebra; cards empilhados.

- [ ] **Step 2: Acessibilidade**

`<label>` em todos os inputs; `aria-current="page"` na aba ativa; `aria-live="polite"` no toast; foco visível; contraste do texto; skip link funcional; `aria-label` nas ações de ícone.

- [ ] **Step 3: Smoke test**

Playwright em 360×800, 768×1024 e 1366×900: sem `scrollWidth > clientWidth + 1`, sem erros de console, abas acessíveis, gráfico legível.

- [ ] **Step 4: Commitar**

```bash
git add index.html style.css js/app.js
git commit -m "fix: responsividade e acessibilidade do mercadinho"
```

## Task 11: Remover o frigorífico da árvore atual

**Files:**
- Delete: `js/ahp.js`, `js/fornecedores.js`, `js/plano.js`, `js/estoque.js`, `js/csv.js`, `js/importacao.js`, `js/dados.js`
- Delete: `test/ahp.test.js`, `test/fornecedores.test.js`, `test/plano.test.js`, `test/estoque.test.js`, `test/csv.test.js`, `test/importacao.test.js`, `test/dados.test.js`
- Move: `docs/auditoria-mercado.md`, `docs/contexto-e-decisoes.md`, `docs/fontes-e-premissas.md` → `docs/arquivo/`
- Move: `docs/superpowers/specs/2026-11-26-sad-frigorifico-serido-design.md` → `docs/arquivo/`
- Move: `docs/superpowers/plans/2026-11-26-sad-frigorifico-serido-mvp.md` → `docs/arquivo/`
- Modify: `README.md`

**Interfaces:** nenhuma; limpeza.

- [ ] **Step 1: Remover módulos e testes antigos**

```bash
git rm js/ahp.js js/fornecedores.js js/plano.js js/estoque.js js/csv.js js/importacao.js js/dados.js
git rm test/ahp.test.js test/fornecedores.test.js test/plano.test.js test/estoque.test.js test/csv.test.js test/importacao.test.js test/dados.test.js
```

- [ ] **Step 2: Arquivar docs**

```bash
mkdir -p docs/arquivo
git mv docs/auditoria-mercado.md docs/contexto-e-decisoes.md docs/fontes-e-premissas.md docs/arquivo/
git mv docs/superpowers/specs/2026-11-26-sad-frigorifico-serido-design.md docs/arquivo/
git mv docs/superpowers/plans/2026-11-26-sad-frigorifico-serido-mvp.md docs/arquivo/
```

- [ ] **Step 3: Atualizar README**

Substituir o README pelo mercadinho: decisão, 3 abas, regra da compra, exemplo, testes, limitações e link do Pages. Remover referências ao frigorífico/AHP/CSV. Apontar `docs/arquivo/README.md` para o legado.

- [ ] **Step 4: Rodar a suíte atual**

Run: `npm test`
Expected: só os testes de `estado`, `produtos`, `vendas`, `previsao` e `compras`; todos passam.

- [ ] **Step 5: Commitar**

```bash
git add -A
git commit -m "chore: remove o frigorifico da arvore e arquiva o legado"
```

## Task 12: Slides do mercadinho

**Files:**
- Modify: `slides.html` (substituir conteúdo)
- Modify: `slides/roteiro.md`
- Modify/Replace: `slides/img/*.png`, `slides.pdf`
- Modify: `README.md` (link dos slides)

**Interfaces:** nenhuma; conteúdo.

- [ ] **Step 1: Roteiro de 8–10 slides**

1. Título — Mercadinho Seridó.
2. Problema — falta e sobra no mercadinho.
3. Persona e decisão — dono, compra da semana.
4. O SAD — dados, modelo, interface e decisão.
5. Dados e previsão — histórico semanal, 3 métodos, backtest.
6. Regra da compra — previsão + mínimo − estoque.
7. Demonstração — tela de Compras e gráfico 12 + 4.
8. Resultados — exemplo, antes/depois, economia de tempo/capital.
9. Limitações e trabalho futuro.
10. Encerramento — link do app e créditos.

- [ ] **Step 2: Reescrever `slides.html`**

Manter a identidade visual (fontes/cores), trocar textos, marca **MS**, e não mencionar frigorífico/AHP como escopo atual. Cada slide com `aria-hidden` correto no JS de navegação.

- [ ] **Step 3: Atualizar o roteiro**

`slides/roteiro.md` com a fala de cada slide, tempos e a frase de transição para a demo.

- [ ] **Step 4: Gerar o PDF**

Renderizar cada slide com Playwright em 1440×900, salvar `slides/img/deck-01.png` … `deck-10.png`, remover `deck-11.png`/`deck-12.png` e as capturas antigas que não forem usadas, e montar `slides.pdf` com PIL. Conferir `pdfinfo slides.pdf` (10 páginas) e abrir uma amostra.

- [ ] **Step 5: Commitar**

```bash
git add slides.html slides/roteiro.md slides/img slides.pdf README.md
git commit -m "docs: slides do Mercadinho Serido"
```

## Task 13: Suíte completa e smoke test

**Files:**
- Modify: testes e UI conforme falhas.

- [ ] **Step 1: Rodar a suíte**

Run: `npm test`
Expected: 25–30 testes passando, 0 falhas.

- [ ] **Step 2: Checar sintaxe**

Run: `for f in js/*.js; do node --check "$f" || exit 1; done`
Expected: sem erros.

- [ ] **Step 3: Smoke test completo**

Playwright em 1366×900 e 360×800:
- abrir o exemplo; 10 produtos na tabela de compras;
- selecionar produto; SVG e “Como calculamos”;
- adicionar produto; editar; remover;
- lançar uma semana; conferir a mudança na compra;
- alternar mensal; excluir semana;
- carregar exemplo; limpar dados; estado vazio;
- sem erros de console e sem overflow.

- [ ] **Step 4: Corrigir falhas e repetir**

Corrigir o que falhar, rodar `npm test` e o smoke de novo. Commitar cada correção.

- [ ] **Step 5: Commitar**

```bash
git add -A
git commit -m "test: suite completa e smoke do mercadinho"
```

## Task 14: PR e loop de revisão

**Files:** correções conforme os achados.

- [ ] **Step 1: Abrir o PR**

```bash
git push -u origin feat/mercadinho
gh pr create --base main --head feat/mercadinho --title "feat: Mercadinho Seridó — SAD de compra semanal" --body-file /tmp/opencode/pr-mercadinho.md
```

O corpo do PR deve resumir a decisão, as 3 abas, a regra da compra, os testes e o link dos slides.

- [ ] **Step 2: Rodar o loop cubic**

Usar a skill `cubic-loop`:
- `get_pr_issues`; corrigir P1/P2 válidos; triar P3 com justificativa;
- `npm test` e smoke após cada rodada;
- repetir até `openIssueCount === 0` e `review.status === "completed"` sem novos commits, ou no máximo 3 iterações;
- marcar cada issue com `update_pr_issue_status`.

- [ ] **Step 3: Revisão final**

Rodar `npm test`, `node --check`, smoke e conferir o diff. Usar `verification-before-completion`: só declarar pronto com evidência (testes, URLs, capturas).

- [ ] **Step 4: Commitar correções**

```bash
git add -A
git commit -m "fix: correcoes da revisao do mercadinho"
git push
```

## Task 15: Merge, deploy e verificação

**Files:** `README.md` (URL final), se necessário.

- [ ] **Step 1: Merge**

```bash
gh pr merge <numero> --merge
```

- [ ] **Step 2: Acompanhar o Pages**

```bash
gh run list --workflow pages.yml --limit 2
gh run watch <run-id> --exit-status
```

- [ ] **Step 3: Verificar o site**

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://emiyakiritsugu3.github.io/SAD_02/
```

Playwright: abrir a URL publicada, conferir o exemplo, a tabela de compras, o gráfico, as abas e o mobile; sem erros de console.

- [ ] **Step 4: Atualizar o README**

Adicionar a URL publicada e a data da entrega. Commitar direto na `main` se for só documentação.

- [ ] **Step 5: Encerrar**

Resumo final: decisão, telas, regra, testes, links do app/slides/PR e o que ficou como trabalho futuro.

---

## Self-Review

**Cobertura da spec:**
- 3 abas → Tasks 6–9.
- Produtos, vendas, previsão, compra → Tasks 1–5.
- Exemplo/localStorage → Task 1.
- Gráfico 12+4 → Task 7.
- Resumo mensal → Task 8.
- Responsividade → Task 10.
- Remoção do frigorífico/docs → Task 11.
- Slides → Task 12.
- Testes/smoke → Task 13.
- Revisão/loop → Task 14.
- Deploy → Task 15.

**Consistência de tipos:** `Estado.carregar` retorna `{ estado, aviso }`; `Previsao.paraSerie` retorna `{ metodo, params, prev4, metricas } | null`; `Compras.sugerir` retorna `{ previsao, necessidade, sugestao, custo, semDados }`; o app usa `prev4[0]`.

**Revisão de foco:** os seis riscos do topo têm testes nas Tasks 1–5 e smoke nas Tasks 10/13.

**Proporção:** o plano define interfaces, testes e decisões; os corpos ficam para a execução.
