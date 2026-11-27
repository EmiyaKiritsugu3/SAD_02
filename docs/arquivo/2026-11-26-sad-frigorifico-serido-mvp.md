# SeridóFrigo MVP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar, em uma semana, um SAD web estático que apoie a decisão semanal de abate, estoque e compra de animais de um frigorífico de caprinos/ovinos em Caicó/RN, com previsão de demanda, plano semanal, cenários e ranking AHP de fornecedores.

**Architecture:** Aplicação estática (HTML/CSS/JS, sem build e sem dependências de runtime) com módulos de lógica em IIFE + `module.exports` para testes no Node. Os dados vêm de um pacote público documentado (IBGE/Embrapa) mais uma série de demanda ilustrativa; a persistência é `localStorage`. A UI é uma SPA por abas, com gráficos SVG próprios.

**Tech Stack:** HTML5, CSS3, JavaScript (ES2020, sem framework), `node:test` para testes, `python3 -m http.server` para servir localmente, Playwright para screenshots/PDF dos slides (se disponível).

**Spec:** `docs/superpowers/specs/2026-11-26-sad-frigorifico-serido-design.md`
**Auditoria:** `docs/auditoria-mercado.md`

## Global Constraints

- Sem build, sem `npm install`, sem dependências de runtime; `package.json` só com `scripts.test = "node --test"`.
- Scripts do browser carregados por `<script src>`; módulos de lógica são IIFE com namespace global e `module.exports` no Node.
- Todo texto de interface em português; valores monetários em BRL com `Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })`.
- Chave de persistência: `seridofrigo:v1`.
- Dados ilustrativos sempre rotulados como **estimativa**; fontes públicas como **fonte**; suposições como **premissa**.
- `material_do_prof/` é gitignored e não pode ser commitado.
- Acessibilidade: labels em todos os inputs, foco visível, contraste, navegação por teclado, `aria-live` para alertas.
- `npm test` deve passar antes de cada commit de lógica.
- Não implementar: SIF/MAPA, NF-e, rastreabilidade, balanças, WMS, CRUD completo, LP/Simplex, otimização de cortes.

## Review Focus

1. **CSV inválido ou incompleto** não pode corromper o estado: a importação deve falhar com mensagem e manter os dados anteriores (Task 7 + Task 12).
2. **Série curta** (menor que a janela da média móvel) não pode gerar `NaN`; deve usar os valores disponíveis ou cair para outro método (Task 3).
3. **Demanda zero ou estoque negativo** não pode gerar animais/margem negativos; o plano deve retornar zeros e alertas (Task 5).
4. **Matriz AHP inconsistente ou fornecedor sem conformidade sanitária** deve gerar aviso de CR e excluir o fornecedor do ranking, sem quebrar o cálculo (Task 6).
5. **Capacidade de abate e câmara fria simultâneas** não podem produzir produção negativa nem contar a mesma demanda duas vezes (Task 5).

---

### Task 1: Setup + motor AHP

**Files:**
- Create: `package.json`
- Create: `js/ahp.js`
- Create: `test/ahp.test.js`

**Interfaces:**
- Consumes: nada.
- Produces: `AHP.calcAHP(matrix) -> { weights: number[], lambdaMax, CI, CR, n, colSums, norm, Aw, lambdas }`; `AHP.RI -> Record<number, number>`; `AHP.findCycle(matrix) -> number[] | null`.

- [ ] **Step 1: Criar `package.json`**

```json
{
  "name": "seridofrigo",
  "private": true,
  "scripts": { "test": "node --test" }
}
```

- [ ] **Step 2: Escrever `test/ahp.test.js` (falhando)**

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const AHP = require("../js/ahp.js");

const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} != ${b}`);

test("matriz consistente 3x3: pesos somam 1 e CR < 0.1", () => {
  const r = AHP.calcAHP([[1, 3, 5], [1 / 3, 1, 3], [1 / 5, 1 / 3, 1]]);
  close(r.weights.reduce((a, b) => a + b, 0), 1);
  assert.ok(r.CR < 0.1);
  close(r.weights[0], 0.637, 0.001);
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
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `node --test test/ahp.test.js`
Expected: FAIL com `Cannot find module '../js/ahp.js'`.

- [ ] **Step 4: Implementar `js/ahp.js`**

Copiar o núcleo puro de `~/Projetos_Antigravity/saaty/ahp.js` (branch `fix/integridade-respostas`, linhas 1–215: `calcAHP`, `RI`, `findCycle`), **sem a parte de DOM**. Envolver em IIFE:

```js
const AHP = (() => {
  function calcAHP(matrix) { /* copiar núcleo */ }
  const RI = { 1: 0, 2: 0, 3: 0.58, 4: 0.90, 5: 1.12, 6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49 };
  function findCycle(M) { /* copiar núcleo */ }
  return { calcAHP, RI, findCycle };
})();
if (typeof module !== "undefined" && module.exports) module.exports = AHP;
```

- [ ] **Step 5: Rodar e ver passar**

Run: `node --test test/ahp.test.js`
Expected: PASS (4 testes).

- [ ] **Step 6: Commit**

```bash
git add package.json js/ahp.js test/ahp.test.js
git commit -m "feat: motor AHP puro com testes"
```

---

### Task 2: Pacote de dados e série de demanda

**Files:**
- Create: `js/dados.js`
- Create: `test/dados.test.js`

**Interfaces:**
- Consumes: nada.
- Produces: `DADOS.EMPRESA`, `DADOS.REBANHO`, `DADOS.PRECOS`, `DADOS.PRODUTOS`, `DADOS.DEMANDA`, `DADOS.FORNECEDORES`, `DADOS.PARAMETROS`; `DADOS.gerarSerieDemanda({ base, semanas, seed, sazonalidade, ruido }) -> number[]`; `DADOS.clonarDados() -> DADOS`.

- [ ] **Step 1: Escrever `test/dados.test.js` (falhando)**

```js
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test test/dados.test.js`
Expected: FAIL com `Cannot find module '../js/dados.js'`.

- [ ] **Step 3: Implementar `js/dados.js`**

Valores obrigatórios:

- `EMPRESA`: `{ nome: "Frigorífico Serra do Seridó", municipio: "Caicó", uf: "RN", capacidadeAbateSemanal: 180, capacidadeCamaraKg: 6000 }`.
- `REBANHO.caprino`: série 2015–2025 com `{ ano, valor }`: 16765, 18650, 17400, 11418, 12380, 16350, 12837, 13500, 13550, 10840, 15157.
- `REBANHO.ovino`: 43141, 45300, 44230, 31909, 38200, 36600, 33988, 36900, 25000, 18200, 24909.
- `PRECOS`: `{ mes: "2026-09", fonte: "Embrapa CIM/Cepea", rnVivoKg: 12.62, carcacaNordesteKgMin: 22, carcacaNordesteKgMax: 32 }`.
- `PRODUTOS`:
  - caprino: `kgCarcacaAnimal: 12.6`, `precoVendaKg: 35`, `custoCompraKg: 28.04`, `custoAbateKg: 4`, `estoqueKg: 600`, `estoqueMinKg: 300`, `capacidadeAbateAnimais: 90`, `capacidadeCamaraKg: 3000`, `coberturaSemanas: 1`.
  - ovino: `kgCarcacaAnimal: 15.36`, `precoVendaKg: 38`, `custoCompraKg: 26.29`, `custoAbateKg: 4`, `estoqueKg: 800`, `estoqueMinKg: 400`, `capacidadeAbateAnimais: 90`, `capacidadeCamaraKg: 3000`, `coberturaSemanas: 1`.
- `PARAMETROS`: `{ z: 1.65, leadTimeSemanas: 1, metodo: "auto" }`.
- `FORNECEDORES`: 4 alternativas com `{ id, nome, cidade, conformidadeSanitaria, precoKgVivo, qualidade, prazoDias, confiabilidade }`; uma delas (`informal`) com `conformidadeSanitaria: false`.
- `DEMANDA`: `{ caprino: gerarSerieDemanda({ base: 700, seed: 42 }), ovino: gerarSerieDemanda({ base: 900, seed: 43 }) }`.
- `gerarSerieDemanda`: PRNG determinístico `mulberry32(seed)`; fatores: semanas 22–26 `+15%`, 48–52 `+15%`, 5–13 `−10%`; tendência `1 + 0.02 * (i / semanas)`; ruído `1 + (rng()*2 - 1) * ruido` com `ruido` padrão `0.08`; arredondar.
- `clonarDados()`: `JSON.parse(JSON.stringify(...))` de um objeto com os campos acima.

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test test/dados.test.js`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add js/dados.js test/dados.test.js
git commit -m "feat: pacote de dados publico e serie ilustrativa"
```

---

### Task 3: Previsão de demanda

**Files:**
- Create: `js/previsao.js`
- Create: `test/previsao.test.js`

**Interfaces:**
- Consumes: nada.
- Produces: `Previsao.mediaMovel(serie, janela) -> number`; `Previsao.suavizacaoExponencial(serie, alfa) -> number`; `Previsao.regressaoLinear(serie) -> { slope, intercept, prever(h) }`; `Previsao.prever(serie, metodo, params, h=4) -> number[]`; `Previsao.mae(previstos, reais) -> number`; `Previsao.mape(previstos, reais) -> number|null`; `Previsao.backtest(serie, metodo, params, h=4) -> { mae, mape, previstos, reais }`; `Previsao.escolherMelhor(serie, h=4) -> { metodo, params, metricas }`.

- [ ] **Step 1: Escrever `test/previsao.test.js` (falhando)**

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const P = require("../js/previsao.js");

test("média móvel de janela 2", () => {
  assert.equal(P.mediaMovel([10, 20, 30, 40], 2), 35);
});

test("média móvel com série curta não retorna NaN", () => {
  assert.equal(P.mediaMovel([10], 4), 10);
  assert.equal(P.mediaMovel([], 4), 0);
});

test("SES de série constante é a constante", () => {
  assert.equal(P.suavizacaoExponencial([100, 100, 100], 0.3), 100);
});

test("regressão linear projeta série linear", () => {
  const r = P.regressaoLinear([10, 20, 30, 40]);
  assert.ok(Math.abs(r.prever(1) - 50) < 1e-9);
  assert.ok(Math.abs(r.prever(4) - 80) < 1e-9);
});

test("MAE e MAPE", () => {
  assert.equal(P.mae([10, 20], [12, 18]), 2);
  assert.ok(Math.abs(P.mape([100], [110]) - 0.1) < 1e-9);
  assert.equal(P.mape([0], [10]), null);
});

test("backtest devolve métricas e previsões", () => {
  const r = P.backtest([10, 20, 30, 40, 50, 60], "regressao", {}, 2);
  assert.equal(r.previstos.length, 2);
  assert.equal(r.reais.length, 2);
  assert.ok(r.mae < 1);
});

test("escolherMelhor prefere regressão em série linear", () => {
  const r = P.escolherMelhor([10, 20, 30, 40, 50, 60]);
  assert.equal(r.metodo, "regressao");
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test test/previsao.test.js`
Expected: FAIL com `Cannot find module '../js/previsao.js'`.

- [ ] **Step 3: Implementar `js/previsao.js`**

Regras:

- `mediaMovel`: média dos últimos `janela` valores; se a série for menor, usa todos; série vazia → `0`.
- `suavizacaoExponencial`: nível inicial `serie[0]`; para cada valor seguinte, `nivel = alfa * valor + (1 - alfa) * nivel`; série vazia → `0`.
- `regressaoLinear`: mínimos quadrados com `x = 1..n`; retorna `{ slope, intercept, prever(h) }`; série vazia → `{ slope: 0, intercept: 0, prever: () => 0 }`.
- `prever`: `h` valores; `mediaMovel` e SES repetem o valor; regressão usa `prever(h)`.
- `mae`: média de `|previsto - real|`; arrays vazios → `0`.
- `mape`: média de `|previsto - real| / real` ignorando `real === 0`; se nenhum válido → `null`.
- `backtest`: usa os últimos `h` valores como teste e o restante como treino; se a série for curta, usa todos os valores disponíveis.
- `escolherMelhor`: candidatos `[{ metodo: "mediaMovel", params: { janela: 4 } }, { metodo: "ses", params: { alfa: 0.3 } }, { metodo: "regressao", params: {} }]`; menor MAE; desempate na ordem acima.

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test test/previsao.test.js`
Expected: PASS (7 testes).

- [ ] **Step 5: Commit**

```bash
git add js/previsao.js test/previsao.test.js
git commit -m "feat: previsao de demanda com backtest"
```

---

### Task 4: Política de estoque

**Files:**
- Create: `js/estoque.js`
- Create: `test/estoque.test.js`

**Interfaces:**
- Consumes: nada.
- Produces: `Estoque.desvioPadrao(serie) -> number`; `Estoque.estoqueSeguranca(serie, z=1.65, leadTimeSemanas=1) -> number`; `Estoque.pontoPedido(demandaMedia, leadTimeSemanas, estoqueSeguranca) -> number`; `Estoque.cobertura(estoqueKg, demandaMedia) -> number`; `Estoque.classificacaoABC(itens) -> Array<{ id, receita, percentual, acumulado, classe }>`.

- [ ] **Step 1: Escrever `test/estoque.test.js` (falhando)**

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("../js/estoque.js");

test("desvio padrão populacional", () => {
  assert.equal(E.desvioPadrao([2, 4, 4, 4, 5, 5, 7, 9]), 2);
});

test("estoque de segurança", () => {
  assert.ok(Math.abs(E.estoqueSeguranca([2, 4, 4, 4, 5, 5, 7, 9], 1.65, 1) - 3.3) < 1e-9);
});

test("ponto de pedido", () => {
  assert.equal(E.pontoPedido(100, 1, 50), 150);
});

test("cobertura em semanas", () => {
  assert.equal(E.cobertura(500, 100), 5);
  assert.equal(E.cobertura(500, 0), Infinity);
});

test("classificação ABC", () => {
  const r = E.classificacaoABC([{ id: "a", receita: 80 }, { id: "b", receita: 15 }, { id: "c", receita: 5 }]);
  assert.deepEqual(r.map(x => x.classe), ["A", "B", "C"]);
  assert.equal(r[2].acumulado, 1);
});

test("série vazia não retorna NaN", () => {
  assert.equal(E.desvioPadrao([]), 0);
  assert.equal(E.estoqueSeguranca([], 1.65, 1), 0);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test test/estoque.test.js`
Expected: FAIL com `Cannot find module '../js/estoque.js'`.

- [ ] **Step 3: Implementar `js/estoque.js`**

Regras:

- `desvioPadrao`: populacional (divide por `n`); vazio → `0`.
- `estoqueSeguranca`: `z * desvioPadrao(serie) * Math.sqrt(leadTimeSemanas)`.
- `pontoPedido`: `demandaMedia * leadTimeSemanas + estoqueSeguranca`.
- `cobertura`: `estoqueKg / demandaMedia`; demanda 0 → `Infinity`.
- `classificacaoABC`: ordenar por receita decrescente; percentual = receita / total; acumulado; classe A até 80%, B até 95%, C acima; vazio → `[]`; total 0 → todas classe C.

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test test/estoque.test.js`
Expected: PASS (6 testes).

- [ ] **Step 5: Commit**

```bash
git add js/estoque.js test/estoque.test.js
git commit -m "feat: politica de estoque e classificacao ABC"
```

---

### Task 5: Plano semanal e cenários

**Files:**
- Create: `js/plano.js`
- Create: `test/plano.test.js`

**Interfaces:**
- Consumes: nada.
- Produces: `Plano.calcularPlano(input) -> resultado`; `Plano.simularCenario(input, cenario) -> resultado`; `Plano.consolidar(resultados) -> totais`.

`input`:
```js
{
  produto: { id, nome, kgCarcacaAnimal },
  previsaoSemana, estoqueAtualKg, estoqueSegurancaKg, coberturaSemanas,
  capacidadeAbateAnimais, capacidadeCamaraKg, estoqueMinKg,
  precoVendaKg, custoCompraKg, custoAbateKg, animaisVivos = 0
}
```

`resultado`:
```js
{
  produtoId, previsaoSemana, precoVendaKg, capacidadeAbateAnimais,
  estoqueMetaKg, producaoNecessariaKg, animaisNecessarios,
  animaisAbatidos, producaoKg, disponivelKg, demandaAtendidaKg,
  estoqueFinalKg, deficitAnimais, necessidadeCompraAnimais,
  receita, custoProducao, custoVendido, valorEstoque, margem, margemPorKg,
  capacidadeUtilizada, alertas: [{ tipo, mensagem }]
}
```

- [ ] **Step 1: Escrever `test/plano.test.js` (falhando)**

```js
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test test/plano.test.js`
Expected: FAIL com `Cannot find module '../js/plano.js'`.

- [ ] **Step 3: Implementar `js/plano.js`**

Regras:

0. Sanitizar entradas: `previsaoSemana`, `estoqueAtualKg`, `estoqueSegurancaKg`, `coberturaSemanas`, `capacidadeAbateAnimais`, `capacidadeCamaraKg`, `estoqueMinKg`, `precoVendaKg`, `custoCompraKg`, `custoAbateKg` e `animaisVivos` viram `Math.max(0, valor)`; valores não numéricos viram `0`. `produto.kgCarcacaAnimal` deve ser finito e > 0; caso contrário, usar `0.01` para evitar `Infinity`/`NaN`.
1. `estoqueMetaKg = previsaoSemana * coberturaSemanas + estoqueSegurancaKg`.
2. `producaoNecessariaKg = Math.max(0, estoqueMetaKg + previsaoSemana - estoqueAtualKg)`.
3. `animaisNecessarios = producaoNecessariaKg / kgCarcacaAnimal`.
4. `animaisDesejados = Math.ceil(animaisNecessarios)`.
5. Limite de câmara: `animaisMaxCamara = Math.max(0, Math.floor((capacidadeCamaraKg - estoqueAtualKg + previsaoSemana) / kgCarcacaAnimal))`.
6. `animaisAbatidos = Math.min(animaisDesejados, capacidadeAbateAnimais, animaisMaxCamara)`; nunca negativo.
7. `producaoKg = animaisAbatidos * kgCarcacaAnimal`.
8. `disponivelKg = estoqueAtualKg + producaoKg`.
9. `demandaAtendidaKg = Math.min(previsaoSemana, disponivelKg)`.
10. `estoqueFinalKg = disponivelKg - demandaAtendidaKg`.
11. `deficitAnimais = Math.max(0, animaisNecessarios - animaisAbatidos)`.
12. `necessidadeCompraAnimais = Math.max(0, animaisAbatidos - animaisVivos)`.
13. `receita = demandaAtendidaKg * precoVendaKg`.
14. `custoProducao = producaoKg * (custoCompraKg + custoAbateKg)`.
15. `custoVendido = demandaAtendidaKg * (custoCompraKg + custoAbateKg)`.
16. `valorEstoque = estoqueFinalKg * (custoCompraKg + custoAbateKg)`.
17. `margem = receita - custoVendido`; `margemPorKg = demandaAtendidaKg > 0 ? margem / demandaAtendidaKg : 0`.
18. `capacidadeUtilizada = capacidadeAbateAnimais > 0 ? animaisAbatidos / capacidadeAbateAnimais : 0`.

Alertas:
- `capacidade` se `animaisDesejados > capacidadeAbateAnimais`.
- `camara` se `animaisDesejados > animaisMaxCamara`.
- `ruptura` se `demandaAtendidaKg < previsaoSemana`.
- `estoque-minimo` se `estoqueFinalKg < estoqueMinKg`.
- `estoque-excedente` se `estoqueFinalKg > capacidadeCamaraKg`.

`simularCenario(input, { demandaPct, precoPct, capacidadePct })`: retorna `calcularPlano` com `previsaoSemana * (1 + demandaPct)`, `precoVendaKg * (1 + precoPct)`, `capacidadeAbateAnimais * (1 + capacidadePct)`. Incluir `previsaoSemana`, `precoVendaKg`, `capacidadeAbateAnimais` no resultado para os testes.

`consolidar(resultados)`: somar `animaisAbatidos`, `producaoKg`, `necessidadeCompraAnimais`, `receita`, `custoProducao`, `custoVendido`, `valorEstoque`, `margem`, `demandaAtendidaKg`, `deficitAnimais`; calcular `capacidadeUtilizada` como soma de animais / soma de capacidades (incluir `capacidadeAbateAnimais` no resultado).

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test test/plano.test.js`
Expected: PASS (8 testes).

- [ ] **Step 5: Commit**

```bash
git add js/plano.js test/plano.test.js
git commit -m "feat: plano semanal e cenarios"
```

---

### Task 6: Módulo AHP de fornecedores

**Files:**
- Create: `js/fornecedores.js`
- Create: `test/fornecedores.test.js`

**Interfaces:**
- Consumes: `AHP.calcAHP`.
- Produces: `Fornecedores.CRITERIOS`, `Fornecedores.ALTERNATIVAS`, `Fornecedores.MATRIZ_CRITERIOS`, `Fornecedores.MATRIZES_ALTERNATIVAS`, `Fornecedores.avaliar({ matrizCriterios, matrizesAlternativas, alternativas }) -> { criterios, alternativas, ranking, excluidos, alertas }`, `Fornecedores.restaurarExemplo()`.

- [ ] **Step 1: Escrever `test/fornecedores.test.js` (falhando)**

```js
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test test/fornecedores.test.js`
Expected: FAIL com `Cannot find module '../js/fornecedores.js'`.

- [ ] **Step 3: Implementar `js/fornecedores.js`**

Dados obrigatórios:

- `CRITERIOS`: `preco`, `qualidade`, `prazo`, `confiabilidade` (nomes: Preço, Qualidade da carcaça, Prazo de entrega, Confiabilidade).
- `ALTERNATIVAS`:
  - `boa-vista` — Fazenda Boa Vista (Caicó/RN), conformidade `true`.
  - `cooperativa` — Cooperativa Seridó (Caicó/RN), conformidade `true`.
  - `uaua` — Lote de Uauá/BA, conformidade `true`.
  - `informal` — Lote informal sem GTA, conformidade `false`.
- `MATRIZ_CRITERIOS`: construir a partir dos pesos `[0.40, 0.30, 0.15, 0.15]` com `M[i][j] = w[i] / w[j]` (consistente, CR ≈ 0).
- `MATRIZES_ALTERNATIVAS`: construir a partir dos pesos:
  - preco: `[0.20, 0.30, 0.50]` (Boa Vista, Cooperativa, Uauá).
  - qualidade: `[0.50, 0.30, 0.20]`.
  - prazo: `[0.50, 0.30, 0.20]`.
  - confiabilidade: `[0.45, 0.35, 0.20]`.
  - A matriz `informal` não precisa entrar no cálculo; ela é excluída pelo gate.
- `avaliar`:
  1. Filtrar alternativas com `conformidadeSanitaria === true`; as demais vão para `excluidos`.
  2. Calcular `AHP.calcAHP(matrizCriterios)`.
  3. Para cada critério, calcular `AHP.calcAHP(matriz)` e guardar os pesos. As matrizes `3×3` correspondem à ordem das alternativas conformes na lista fixa: `boa-vista`, `cooperativa`, `uaua`.
  4. Score final = soma `criterios.weights[j] * pesoAlternativa[j][i]`.
  5. Ordenar decrescente; rank 1..n.
  6. Alertas: `consistencia` se `CR > 0.10`; `excluido` para cada fornecedor sem conformidade.
- `restaurarExemplo`: retorna cópias das matrizes padrão.

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test test/fornecedores.test.js`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add js/fornecedores.js test/fornecedores.test.js
git commit -m "feat: modulo AHP de fornecedores com gate sanitario"
```

---

### Task 7: Importação CSV

**Files:**
- Create: `js/csv.js`
- Create: `test/csv.test.js`

**Interfaces:**
- Consumes: nada.
- Produces: `CSV.parse(texto) -> string[][]`; `CSV.importarDemanda(texto) -> { caprino: number[], ovino: number[] }`; `CSV.importarEstoque(texto) -> { caprino: number, ovino: number }`.

- [ ] **Step 1: Escrever `test/csv.test.js` (falhando)**

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const CSV = require("../js/csv.js");

test("parse aceita ponto e vírgula", () => {
  assert.deepEqual(CSV.parse("a;b\n1;2"), [["a", "b"], ["1", "2"]]);
});

test("parse aceita vírgula e aspas", () => {
  assert.deepEqual(CSV.parse('a,b\n"x,y",2'), [["a", "b"], ["x,y", "2"]]);
});

test("importarDemanda lê caprino e ovino", () => {
  const r = CSV.importarDemanda("semana;caprino;ovino\n1;700;900\n2;710;910");
  assert.deepEqual(r.caprino, [700, 710]);
  assert.deepEqual(r.ovino, [900, 910]);
});

test("importarEstoque lê o estoque atual", () => {
  const r = CSV.importarEstoque("produto;estoque_kg\ncaprino;600\novino;800");
  assert.deepEqual(r, { caprino: 600, ovino: 800 });
});

test("linha inválida lança erro e não retorna dados parciais", () => {
  assert.throws(() => CSV.importarDemanda("semana;caprino;ovino\n1;abc;900"));
  assert.throws(() => CSV.importarDemanda(""));
  assert.throws(() => CSV.importarEstoque("produto;estoque_kg\ncaprino;x"));
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test test/csv.test.js`
Expected: FAIL com `Cannot find module '../js/csv.js'`.

- [ ] **Step 3: Implementar `js/csv.js`**

Regras:

- Detectar delimitador pela primeira linha: `;` se houver mais `;` que `,`, senão `,`.
- Suportar campos entre aspas duplas com vírgula/ponto e vírgula internos.
- Ignorar linhas vazias.
- `importarDemanda`: exigir header com `semana`, `caprino`, `ovino` (case-insensitive, trim); validar `semana` como inteiro positivo, rejeitar duplicadas, ordenar os registros por semana e retornar também `semanas`; converter com `Number`; se qualquer valor for `NaN` ou negativo, lançar `Error("CSV de demanda inválido")`.
- `importarEstoque`: exigir header `produto`, `estoque_kg`; aceitar `caprino` e `ovino`; valores `NaN`/negativos → `Error("CSV de estoque inválido")`.
- `parse` vazio → `[]`.

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test test/csv.test.js`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
git add js/csv.js test/csv.test.js
git commit -m "feat: importacao CSV de demanda e estoque"
```

---

### Task 8: Shell da aplicação, estilos e dashboard

**Files:**
- Create: `index.html`
- Create: `style.css`
- Create: `js/charts.js`
- Create: `js/app.js`

**Interfaces:**
- Consumes: `DADOS`, `Previsao`, `Plano`, `Fornecedores`, `Estoque`, `AHP`.
- Produces: app funcional com a aba **Painel**.

- [ ] **Step 1: Criar `index.html`**

Estrutura:

```html
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SeridóFrigo — SAD de planejamento semanal</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <a class="skip-link" href="#conteudo">Pular para o conteúdo</a>
  <div class="app">
    <aside class="sidebar">
      <div class="brand"><span class="brand-mark">SF</span><div><strong>SeridóFrigo</strong><small>Caicó/RN</small></div></div>
      <nav aria-label="Navegação principal">
        <button data-aba="painel" class="nav-item ativo">Painel</button>
        <button data-aba="previsao" class="nav-item">Previsão</button>
        <button data-aba="plano" class="nav-item">Plano semanal</button>
        <button data-aba="fornecedores" class="nav-item">Fornecedores</button>
        <button data-aba="dados" class="nav-item">Dados e premissas</button>
      </nav>
      <div class="sidebar-foot"><span class="badge fonte">Dados públicos</span><span class="badge estimativa">Demanda ilustrativa</span></div>
    </aside>
    <main id="conteudo" class="main">
      <header class="topbar">
        <div><h1 id="titulo-aba">Painel</h1><p id="subtitulo-aba">A decisão da semana em uma tela.</p></div>
        <div class="semana"><label for="semana">Semana</label><select id="semana"></select></div>
      </header>
      <div id="app" aria-live="polite"></div>
    </main>
  </div>
  <script src="js/ahp.js"></script>
  <script src="js/dados.js"></script>
  <script src="js/previsao.js"></script>
  <script src="js/estoque.js"></script>
  <script src="js/plano.js"></script>
  <script src="js/fornecedores.js"></script>
  <script src="js/csv.js"></script>
  <script src="js/charts.js"></script>
  <script src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Criar `style.css`**

Definir:

- Variáveis: `--bg:#f6f0e6`, `--surface:#fffaf2`, `--ink:#2f241c`, `--muted:#7a6a5b`, `--terracotta:#b5522f`, `--terracotta-dark:#8c3d22`, `--olive:#5d6b4a`, `--gold:#c99a4b`, `--danger:#a33a2e`, `--line:#e2d5c3`.
- Layout: grid `240px 1fr`, sidebar escura (`#2f241c`) com texto claro, main claro; cards com borda `1px solid var(--line)`, raio 16px, sombra suave.
- Tipografia: títulos `Georgia, "Times New Roman", serif`; corpo `system-ui, -apple-system, "Segoe UI", sans-serif`.
- Componentes: `.kpi-grid`, `.kpi`, `.card`, `.grid-2`, `.tabela`, `.badge`, `.alerta`, `.botao`, `.slider`, `.nav-item.ativo`.
- Responsivo: `< 900px` sidebar vira topo horizontal; grids viram 1 coluna.
- Foco: `:focus-visible { outline: 3px solid var(--gold); outline-offset: 2px; }`.
- Print: esconder sidebar.

- [ ] **Step 3: Criar `js/charts.js`**

Funções:

- `Charts.linha({ series, labels, width=640, height=260, cor="#b5522f", rotuloY="kg" }) -> string` — SVG com eixo Y, grade, linha e pontos; escapar labels.
- `Charts.barras({ itens, width=640, height=260, cor="#5d6b4a" }) -> string` — `itens: [{ rotulo, valor }]`.
- `Charts.formatarKg(n)` e `Charts.formatarBRL(n)`.

Sem dependências; retornar string SVG pronta para `innerHTML`.

- [ ] **Step 4: Criar `js/app.js` (estado + dashboard)**

Estado:

```js
const CHAVE = "seridofrigo:v1";
const state = {
  aba: "painel",
  semanaAtual: 52,
  dados: DADOS.clonarDados(),
  metodo: "auto",
  parametros: { ...DADOS.PARAMETROS },
  planos: {},
  previsoes: {},
  cenario: { demandaPct: 0, precoPct: 0, capacidadePct: 0 },
  ahp: { matrizCriterios: Fornecedores.restaurarExemplo().matrizCriterios, matrizesAlternativas: Fornecedores.restaurarExemplo().matrizesAlternativas },
};
```

Funções:

- `carregar()` / `salvar()` no `localStorage` (merge defensivo com defaults).
- `calcularTudo()`: cortar cada série em `state.semanaAtual` com `Previsao.serieAte`, usar `Previsao.escolherMelhor(serieAte)` (ou método escolhido), `Estoque.estoqueSeguranca(serieAte, z, leadTime)`, `Plano.calcularPlano({...})` com o primeiro forecast como semana seguinte; guardar em `state.previsoes` e `state.planos`.
- `render()`: atualiza título/subtítulo, classes dos nav items, e chama `renderPainel()` (as outras abas ficam como placeholder até as Tasks 9–12).
- `renderPainel()`: KPIs (estoque total, previsão total, animais a abater, compra, margem, capacidade), gráfico de demanda (últimas 12 semanas + 4 previstas), barras estoque atual vs meta, lista de alertas, card do fornecedor recomendado (via `Fornecedores.avaliar`), e um resumo do plano por produto.
- Eventos: clique nos `[data-aba]`; mudança do `<select id="semana">` (preencher com 40–52 e "próxima").
- `escapeHtml`.

- [ ] **Step 5: Rodar a aplicação e verificar o dashboard**

Run: `python3 -m http.server 8000` (em background) e abrir `http://localhost:8000`.
Expected: sidebar, 6 KPIs, gráfico de demanda, barras de estoque, alertas e fornecedor recomendado; sem erros no console.

- [ ] **Step 6: Commit**

```bash
git add index.html style.css js/charts.js js/app.js
git commit -m "feat: shell da aplicacao e dashboard"
```

---

### Task 9: Tela de previsão

**Files:**
- Modify: `js/app.js`

**Interfaces:**
- Consumes: `state.previsoes`, `Previsao`.
- Produces: `renderPrevisao()`.

- [ ] **Step 1: Implementar `renderPrevisao()`**

Conteúdo:

- Seletor de método: `auto`, `mediaMovel`, `ses`, `regressao`; inputs para `janela`/`alfa` quando aplicável.
- Gráfico da série histórica (52 semanas) + 4 semanas previstas (linha tracejada).
- Tabela: semana, previsto caprino, previsto ovino.
- Cards de métricas: MAE e MAPE do método escolhido (por produto).
- Texto curto explicando o método e o backtest (últimas 4 semanas).

- [ ] **Step 2: Eventos**

- Mudança de método/parâmetros → recalcular `calcularTudo()` → `salvar()` → `render()`.
- Garantir que a aba `previsao` renderize sem erro quando `state.previsoes` estiver vazio (calcular antes).

- [ ] **Step 3: Verificar manualmente**

Abrir a aba Previsão; trocar método; conferir que gráfico/tabela/métricas mudam e que não há `NaN`.

- [ ] **Step 4: Commit**

```bash
git add js/app.js
git commit -m "feat: tela de previsao com metodos e metricas"
```

---

### Task 10: Tela de plano semanal e cenários

**Files:**
- Modify: `js/app.js`

**Interfaces:**
- Consumes: `state.planos`, `Plano.simularCenario`.
- Produces: `renderPlano()`.

- [ ] **Step 1: Implementar `renderPlano()`**

Conteúdo:

- Dois cards (Caprino/Ovino), cada um com:
  - Inputs: previsão da semana (readonly, vem do método), estoque atual, estoque de segurança, cobertura, capacidade de abate, capacidade da câmara, estoque mínimo, preço de venda, custo de compra, custo de abate.
  - Outputs: animais a abater, kg a produzir, estoque final, compra de animais, receita, custo de produção, margem, capacidade utilizada.
  - Alertas com ícone/cor por tipo.
- Seção de cenários: três sliders (demanda −20%..+20%, preço −15%..+15%, capacidade −20%..+20%) e uma tabela comparando **Pessimista / Base / Otimista** (ex.: demanda −10%, base, +10%) com animais, margem e alerta principal.
- Botão "Restaurar parâmetros".

- [ ] **Step 2: Eventos**

- `input`/`change` nos campos → atualizar `state.dados.PRODUTOS`, recalcular, salvar, renderizar.
- Sliders de cenário → atualizar `state.cenario`, recalcular cenários, salvar, renderizar.
- Evitar perda de foco: usar `data-campo` e re-render somente após `change` (não a cada tecla), ou preservar o elemento focado.

- [ ] **Step 3: Verificar manualmente**

Abrir Plano; alterar cobertura para 3 e ver alerta de câmara; reduzir capacidade e ver alerta de capacidade; conferir que os números batem com os testes.

- [ ] **Step 4: Commit**

```bash
git add js/app.js
git commit -m "feat: tela de plano semanal e cenarios"
```

---

### Task 11: Tela de fornecedores (AHP)

**Files:**
- Modify: `js/app.js`

**Interfaces:**
- Consumes: `Fornecedores.avaliar`, `state.ahp`.
- Produces: `renderFornecedores()`.

- [ ] **Step 1: Implementar `renderFornecedores()`**

Conteúdo:

- Explicação curta: critérios, escala 1–9, CR ≤ 10%, gate sanitário.
- Card de pesos dos critérios (barras) + CR.
- Editor da matriz de critérios: tabela 4×4 com inputs no triângulo superior; célula recíproca calculada; botão "Restaurar exemplo".
- `<details>` por critério com a matriz 3×3 das alternativas conformes (inputs no triângulo superior).
- Ranking final: tabela com posição, fornecedor, score, cidade, preço/kg vivo, conformidade.
- Lista de excluídos (ex.: "Lote informal sem GTA — sem conformidade sanitária").
- Alerta se CR > 0.10.

- [ ] **Step 2: Eventos**

- `change` em qualquer input de matriz → sanitizar (1/9..9), atualizar matriz recíproca, recalcular, salvar, renderizar.
- "Restaurar exemplo" → restaurar matrizes padrão.

- [ ] **Step 3: Verificar manualmente**

Abrir Fornecedores; conferir ranking (Boa Vista primeiro), CR, exclusão do informal; alterar uma comparação para gerar CR alto e ver o alerta.

- [ ] **Step 4: Commit**

```bash
git add js/app.js
git commit -m "feat: tela AHP de fornecedores"
```

---

### Task 12: Dados, premissas, CSV e persistência

**Files:**
- Modify: `js/app.js`
- Create: `docs/fontes-e-premissas.md` (versão inicial; completar na Task 15)

**Interfaces:**
- Consumes: `CSV.importarDemanda`, `CSV.importarEstoque`, `DADOS`.
- Produces: `renderDados()`, importação e reset.

- [ ] **Step 1: Implementar `renderDados()`**

Conteúdo:

- Tabela de fontes: IBGE PPM (rebanho), Embrapa CIM/Cepea (preços), Embrapa (custos/coeficientes), premissas.
- Badges `fonte`, `estimativa`, `premissa`.
- Valores usados: rebanho 2025, preço RN, custos, kg de carcaça, capacidade.
- Inputs de arquivo:
  - `input type="file" accept=".csv,text/csv"` para demanda.
  - `input type="file"` para estoque.
  - Exibir mensagem de sucesso/erro em `aria-live`.
- Botão "Restaurar dados de exemplo" com `confirm()`.
- Explicação do formato CSV (cabeçalhos e exemplo).

- [ ] **Step 2: Importação**

- Ler com `FileReader` (`readAsText`).
- Chamar `CSV.importarDemanda`/`importarEstoque`.
- Em sucesso: aplicar a importação com `Importacao.aplicarDemanda`/`aplicarEstoque` (que atualiza `DEMANDA` ou `PRODUTOS[*].estoqueKg`), recalcular, salvar, renderizar, mostrar mensagem.
- Em erro: **não alterar o estado**, mostrar `err.message` e manter os dados anteriores.

- [ ] **Step 3: Persistência**

- `salvar()` grava `state` (dados, método, parâmetros, matrizes AHP, cenário) em `localStorage`.
- `carregar()` faz merge defensivo: se o JSON estiver corrompido ou faltar campo, usa defaults.
- Botão de reset remove a chave e recarrega defaults.

- [ ] **Step 4: Verificar manualmente**

- Importar CSV válido de demanda; ver gráfico mudar.
- Importar CSV inválido; ver erro e dados antigos intactos.
- Recarregar a página; ver estado persistido.
- Resetar; ver dados padrão.

- [ ] **Step 5: Commit**

```bash
git add js/app.js docs/fontes-e-premissas.md
git commit -m "feat: dados, importacao CSV e persistencia"
```

---

### Task 13: Polimento, acessibilidade e responsividade

**Files:**
- Modify: `index.html`
- Modify: `style.css`
- Modify: `js/app.js`

- [ ] **Step 1: Acessibilidade**

- Skip link visível ao focar.
- Todos os inputs com `<label for>` ou `aria-label`.
- `aria-live="polite"` no container de alertas.
- `aria-current="page"` no nav ativo.
- Foco visível em botões, links, inputs.
- Contraste mínimo AA (conferir textos muted sobre surface).
- Tabelas com `<caption>` ou `aria-label`.

- [ ] **Step 2: Responsividade**

- Testar em 360px, 768px e 1280px.
- Sidebar vira topo; grids 2 colunas viram 1; tabelas com scroll horizontal.
- Sliders e botões com área de toque mínima de 44px.

- [ ] **Step 3: Estados vazios e erros**

- Se não houver dados/CSV, mostrar mensagem clara.
- Se um cálculo falhar, mostrar alerta e não quebrar a tela.

- [ ] **Step 4: Verificar manualmente**

Abrir no navegador, navegar por teclado (Tab/Shift+Tab), redimensionar, conferir console sem erros.

- [ ] **Step 5: Commit**

```bash
git add index.html style.css js/app.js
git commit -m "feat: acessibilidade e responsividade"
```

---

### Task 14: Slides

**Files:**
- Create: `slides.html`
- Create: `slides/img/` (screenshots, se disponível)

- [ ] **Step 1: Criar `slides.html`**

12 slides com navegação por teclado (←/→/espaço), contador e CSS de impressão:

1. Título: SeridóFrigo — SAD de planejamento semanal.
2. Contexto: frigorífico de caprinos/ovinos em Caicó/RN; rotina semanal.
3. Problema: planilha/intuição; ruptura, excesso, compra ruim.
4. Usuário e decisão: gestor; quanto abater, estocar e comprar.
5. Arquitetura SAD: dados, modelos, conhecimento, interface.
6. Dados e premissas: IBGE, Embrapa/Cepea, série ilustrativa; badges.
7. Previsão: métodos, backtest, MAE/MAPE.
8. Estoque e plano: segurança, cobertura, animais, capacidade, margem.
9. AHP fornecedores: critérios, CR, gate sanitário, ranking.
10. Análise competitiva: ERP × APS × planilha; por que não somos ERP.
11. Limitações e trabalhos futuros: dados reais, SIF, cortes, LP, integração.
12. Demonstração e perguntas.

- [ ] **Step 2: Screenshots**

Se Playwright estiver disponível, capturar Painel, Previsão, Plano e Fornecedores em `slides/img/` e inserir nos slides 7–10. Se não, usar diagramas CSS e deixar a demo ao vivo.

- [ ] **Step 3: PDF**

Gerar `slides.pdf` via Playwright (`page.pdf`) ou imprimir pelo navegador. Se nenhuma ferramenta estiver disponível, documentar no README como gerar (Ctrl+P → Salvar como PDF, paisagem).

- [ ] **Step 4: Verificar**

Abrir `slides.html`, navegar por teclado, conferir que nenhum slide transborda e que as imagens carregam.

- [ ] **Step 5: Commit**

```bash
git add slides.html slides/img slides.pdf 2>/dev/null || git add slides.html slides/img
git commit -m "docs: slides da apresentacao"
```

---

### Task 15: README, documentação e validação final

**Files:**
- Modify: `README.md`
- Modify: `docs/fontes-e-premissas.md`
- Modify: `docs/contexto-e-decisoes.md` (adicionar seção de atualização, sem apagar o histórico)

- [ ] **Step 1: Atualizar `README.md`**

Conteúdo:

- O que é o SeridóFrigo; problema; usuário; decisão.
- Posicionamento: camada de decisão complementar ao ERP/planilha; não é ERP.
- Funcionalidades e telas.
- Como rodar: `python3 -m http.server 8000` e abrir `http://localhost:8000`.
- Como testar: `npm test`.
- Dados e fontes (resumo + link para `docs/fontes-e-premissas.md`).
- Limitações e trabalhos futuros.
- Estrutura de arquivos.
- Créditos e disciplina.

- [ ] **Step 2: Completar `docs/fontes-e-premissas.md`**

- Tabela de fontes com links e valores exatos.
- Fórmulas de previsão, estoque e plano.
- Premissas (demanda ilustrativa, fornecedores fictícios, custos).
- Como atualizar os dados (CSV).
- Aviso sobre dados ilustrativos.

- [ ] **Step 3: Atualizar `docs/contexto-e-decisoes.md`**

Adicionar uma seção no topo ou no fim:

```md
## Atualização 2026-11-26 — novo recorte

O projeto foi reposicionado para um SAD de planejamento semanal de abate e
estoque de um frigorífico de caprinos/ovinos em Caicó/RN. O motor AHP foi
reaproveitado como módulo de seleção de fornecedores. Ver a spec em
`docs/superpowers/specs/2026-11-26-sad-frigorifico-serido-design.md` e a
auditoria em `docs/auditoria-mercado.md`.
```

- [ ] **Step 4: Validação final**

Run: `npm test`
Expected: todos os testes passam.

Run: `python3 -m http.server 8000` e abrir `http://localhost:8000`.
Checklist:
- [ ] Painel carrega sem erro no console.
- [ ] Previsão muda de método e mostra métricas.
- [ ] Plano calcula caprino/ovino e alerta capacidade/câmara.
- [ ] Fornecedores mostra ranking e exclui informal.
- [ ] CSV válido importa; CSV inválido mostra erro e mantém dados.
- [ ] Recarregar mantém estado; reset restaura.
- [ ] Navegação por teclado funciona.
- [ ] Layout em 360px, 768px e 1280px.
- [ ] Slides abrem e navegam.

- [ ] **Step 5: Commit final**

```bash
git add README.md docs/fontes-e-premissas.md docs/contexto-e-decisoes.md
git commit -m "docs: README, fontes e validacao final do MVP"
```

---

## Self-Review

**Spec coverage:**
- Usuário/decisão → Tasks 8–11 (dashboard, plano, fornecedores).
- Previsão → Task 3 + Task 9.
- Estoque → Task 4 + Task 10.
- Plano semanal → Task 5 + Task 10.
- AHP fornecedores + gate → Task 6 + Task 11.
- Cenários → Task 5 + Task 10.
- Dados/premissas → Task 2 + Task 12 + Task 15.
- CSV → Task 7 + Task 12.
- Interface/acessibilidade → Tasks 8, 13.
- Testes → Tasks 1–7; validação manual nas Tasks 8–13.
- Slides + análise competitiva → Task 14.
- README/docs → Task 15.

**Gaps corrigidos:** importação CSV incluída; slide competitivo incluído; `docs/auditoria-mercado.md` referenciado; `docs/fontes-e-premissas.md` criado.

**Type consistency:** `calcularPlano` retorna `previsaoSemana`, `precoVendaKg` e `capacidadeAbateAnimais` para os testes de cenário; `consolidar` usa esses campos; `Fornecedores.avaliar` usa `AHP.calcAHP`; `CSV` não altera estado (a UI só atualiza após sucesso).

**Review Focus:** cada item tem teste na task correspondente (CSV inválido → Task 7; série curta → Task 3; demanda zero → Task 5; AHP inconsistente/gate → Task 6; capacidade + câmara → Task 5).
