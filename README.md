# Mercadinho Seridó — SAD de compra semanal

App estático que ajuda o dono de um mercadinho de bairro em Caicó/RN a decidir **quanto comprar de cada produto para a próxima semana**.

É uma **camada de decisão**, não um PDV nem um ERP. O dono continua usando o caixa para as vendas; o app usa o histórico diário de vendas para prever a demanda semanal e sugerir a compra.

- **Usuário:** dono/gestor do mercadinho.
- **Decisão:** quantidade de compra por produto na semana seguinte.
- **Domínio:** reposição de produtos de um pequeno mercadinho.
- **Site:** https://emiyakiritsugu3.github.io/SAD_02/
- **Slides:** `slides.html` e `slides.pdf`

## Como funciona

### 1. Produtos

Cadastre nome, unidade (`un`, `kg` ou `L`), custo, preço, estoque atual e estoque mínimo manual. O custo entra na compra; o preço, na receita por período. **Estoque mínimo 0 = automático:** o app usa 1 dia da previsão (ajustável em Compras).

### 2. Vendas

Lance um dia por vez, com a quantidade vendida de cada produto. O resumo pode ser consultado por **dia, semana, mês ou ano**, com quantidade e receita por produto. O período é só para consulta: a previsão e a compra usam a semana.

### 3. Previsão

A aba **Previsão** mostra o histórico semanal de até 52 semanas, a previsão das próximas 4 e o erro do método. O dono escolhe a **semana de referência** no topo e pode trocar o método:

- **Automático:** testa média móvel, suavização exponencial e regressão; escolhe o menor MAE no backtest.
- **Manual:** fixa o método e ajusta a janela da média móvel ou o alfa da suavização.

Um produto selecionável aparece em um gráfico largo, com o histórico e a previsão. As tabelas mostram **todos os produtos**: erro (MAE/MAPE) e as próximas 4 semanas. O método escolhido também alimenta a aba Compras.

### 4. Compras

Para cada produto com pelo menos 4 semanas de histórico, o app projeta a próxima semana e calcula:

```text
mínimo = estoque mínimo manual > 0
         ? estoque mínimo manual
         : (previsão da próxima semana ÷ 7) × dias de cobertura
necessidade = max(0, previsão da próxima semana + mínimo − estoque atual)
sugestão = unidade "un" ? arredonda para cima : arredonda com 1 casa
custo estimado = sugestão × custo unitário
```

A **cobertura do mínimo** fica na lista de compras: 1 dia por padrão, ajustável de 1 a 7. Um valor manual no produto (maior que 0) substitui o automático. O total da compra aparece no topo. O estoque é atualizado manualmente pelo dono; o app não controla compras ou vendas como movimentos de estoque.

### Modelos

- Média móvel (janela 4), suavização exponencial (α 0,3) e regressão linear.
- Menos de 4 semanas: sem previsão.
- De 4 a 7 semanas: média móvel.
- A partir de 8 semanas: backtest nas últimas 4 semanas e escolha automática pelo menor MAE.
- Gráfico com até 52 semanas + 4 previstas, com um produto selecionável.
- A semana corrente entra no histórico com os dias já lançados; a previsão é revista quando ela fecha.
- “Como o SAD prevê” e a tabela de erro mostram método, MAE, MAPE e backtest.

## Dados de exemplo

Na primeira abertura, o app carrega 10 produtos e 52 semanas de vendas diárias ilustrativas (01/12/2025 a 27/11/2026; a semana corrente vai até hoje), marcadas como **dados de exemplo**. Os produtos do exemplo usam **estoque mínimo 0 (automático, 1 dia da previsão)**. Em **Produtos** é possível:

- **Carregar exemplo** — restaura o conjunto de exemplo.
- **Limpar dados** — apaga produtos e vendas e começa do zero.

Qualquer edição remove o selo de exemplo. Os dados ficam no `localStorage` do navegador (`mercadinho-serido:v2`); nada é enviado a servidor. Se o navegador tiver o exemplo antigo de 12 semanas, ele é regenerado com 52 ao carregar; um exemplo editado (sem o selo) é preservado.

## Como rodar

Não há build nem dependências de runtime.

```bash
python3 -m http.server 8000
```

Abra:

- App: <http://localhost:8000>
- Slides: <http://localhost:8000/slides.html>
- PDF: `slides.pdf`

## Testes

```bash
npm test
```

**77 testes** com `node:test`, cobrindo estado/persistência, política de cobertura, migração do formato semanal, produtos, dias, série semanal, resumos por período, previsão, compra sugerida, mínimo automático/manual e arredondamento. O smoke test manual com Playwright está documentado em [`docs/verificacao.md`](docs/verificacao.md) e cobre as quatro abas, o CRUD de produtos, o lançamento diário, os períodos, a previsão 52 + 4, a cobertura do mínimo, o override manual, o exemplo/limpar, o backtest, a falha de gravação e o mobile em 360 px.

## Estrutura

```text
.
├── index.html
├── style.css
├── js/
│   ├── datas.js       # helpers de data compartilhados
│   ├── estado.js      # localStorage, validação e exemplo
│   ├── produtos.js    # cadastro e validação
│   ├── vendas.js      # dias, série semanal e resumos por período
│   ├── previsao.js    # média móvel, SES, regressão e backtest
│   ├── compras.js     # compra sugerida
│   ├── charts.js      # gráfico SVG
│   └── app.js         # interface das 4 abas
├── test/
├── slides.html
├── slides.pdf
├── slides/roteiro.md
├── docs/
│   ├── superpowers/specs/2026-11-27-mercadinho-serido-design.md
│   ├── superpowers/specs/2026-11-27-mercadinho-vendas-diarias-design.md
│   ├── superpowers/specs/2026-11-27-mercadinho-previsao-legado-design.md
│   ├── superpowers/plans/2026-11-27-mercadinho-serido-mvp.md
│   ├── superpowers/plans/2026-11-27-mercadinho-vendas-diarias-mvp.md
│   └── arquivo/       # legado do frigorífico
└── .github/workflows/pages.yml
```

## Limitações e próximos passos

- Estoque manual; o app não é PDV e não importa notas.
- Sem lead time, validade/perecíveis, orçamento ou comparação de fornecedores.
- Sem CSV, multiusuário ou integração com ERP.
- A base de dados diária está pronta para uma futura integração com o caixa/PDV; a integração em si não faz parte do MVP.
- A previsão é uma sugestão; o dono decide a compra final.

Esses itens ficam como trabalho futuro. O foco do MVP é a decisão semanal, com uma interface simples e explicável.

## Legado

A versão anterior, um SAD de planejamento de abate/estoque para um frigorífico, está preservada na tag `legacy-frigorifico-v1` e na branch `legacy/frigorifico`. Veja `docs/arquivo/README.md` para o motivo do pivô e como rodar o legado.

## Deploy

O workflow `.github/workflows/pages.yml` publica a `main` no GitHub Pages. O site é estático e usa caminhos relativos, então funciona na subpasta do projeto.
