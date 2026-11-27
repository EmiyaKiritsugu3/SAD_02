# Verificação e smoke test — Mercadinho Seridó

**Atualizado em:** 2026-11-27
**Objetivo:** registrar o que é automatizado e como reproduzir o smoke manual do app e dos slides.

## Automatizado

```bash
npm test
```

- **77 testes** com `node:test`, cobrindo estado/persistência, política de cobertura, migração v1→v2, produtos, dias, série semanal, resumos por período, previsão, compra sugerida, mínimo automático/manual e arredondamento.
- `node --check` em todos os arquivos de `js/`.
- `pdfinfo slides.pdf` → **10 páginas**.

## Smoke manual com Playwright

### Preparação

```bash
python3 -m http.server 8000
```

Abra `http://localhost:8000` e limpe o `localStorage` para carregar o exemplo.

### App

1. **Compras:** a lista deve ter 10 produtos, o total deve ser **R$ 2.350,10** e o gráfico do Arroz deve aparecer. Na coluna **Mínimo**, o Arroz deve mostrar **5,6 AUTO**.
   - **Cobertura:** confira **1 dia**; mude para **2** e o total deve ir para **R$ 2.733,16** (Arroz **11,2 AUTO**). Volte para **1**.
2. **Backtest da compra:** abra “Como calculamos” e confira a tabela com 4 linhas (Semana, Previsto, Real) e a fórmula do mínimo. No Arroz: mínimo **5,6 (1 dia da previsão)**.
3. **Previsão:** a aba deve mostrar a semana de referência (`23/11/2026`), **52 opções** de semana, um gráfico de **52 + 4** e o produto mais vendido selecionado (Pão francês).
4. **Método:** troque para **Média móvel**; o badge deve virar **Manual**, a tabela de erro deve mostrar “Média móvel (4 semanas)” e o método deve continuar valendo em Compras. Volte para **Automático**.
5. **Produto do gráfico:** troque o produto no seletor; o histórico, a previsão e as métricas devem ser recalculados.
6. **Semana de referência:** escolha uma semana mais antiga; o histórico e a previsão devem ser recalculados, sem mexer nos lançamentos de Vendas. A lista de Compras continua na última semana lançada.
7. **Tabelas da Previsão:** a tabela de erro deve ter 10 produtos; a de próximas 4 semanas, 10 produtos e 4 colunas de datas.
8. **Filtro em Compras:** digite `cafe`; deve aparecer **Café 500 g**, com o badge **1 de 10**.
9. **Seleção em Compras:** clique em Feijão; o foco deve ir para o título do gráfico e a linha deve ficar com `aria-selected="true"`.
10. **Vendas (dia):** a data deve abrir em hoje, com os 10 produtos e os valores do exemplo.
11. **Períodos:** alterne **Dia / Semana / Mês / Ano** e confira o intervalo e o total:
    - Dia: `27/11/2026` → **R$ 814,60**;
    - Semana: `23/11 a 29/11/2026` → **R$ 3.555,50**;
    - Mês: `Novembro de 2026` → **R$ 14.496,90**;
    - Ano: `2026` → **R$ 158.168,40**.
12. **Salvar dia:** altere o arroz para `9`, salve e volte para Compras; a previsão e a compra devem ser recalculadas. O dia continua salvo no `localStorage`.
13. **Excluir dia:** exclua o dia salvo e confirme que ele some do resumo; a semana pode continuar com os outros dias.
14. **Falha de gravação:** no console, faça `Storage.prototype.setItem = () => { throw new Error("quota"); }` e salve; o banner “Não foi possível gravar os dados…” deve aparecer, junto com o toast de erro.
15. **Nome longo:** cadastre um produto com 60 caracteres sem espaço, abra Compras em 360 px e confira que a página não tem overflow horizontal.
16. **Produtos:** adicionar, editar e remover; carregar exemplo e limpar dados.
    - **Override manual:** edite o Arroz e coloque **estoque mínimo 4**; a coluna deve mostrar **4 MANUAL** e a compra deve cair para **36 un (R$ 810,00)**. Volte para **0** para o automático.
17. **Migração:** remova `mercadinho-serido:v2`, deixe um `localStorage` no formato v1 (semana) e recarregue; o app deve converter para dias, mostrar o aviso de migração e preservar o total semanal. O teste automatizado cobre o mesmo cenário.
18. **Mobile:** em 360 px, a sidebar vira uma faixa horizontal, as tabelas e os gráficos têm rolagem interna e a página não tem overflow horizontal.

### Slides

1. Abra `http://localhost:8000/slides.html`.
2. Devem existir **10 slides**; `→` avança e `←` volta.
3. O slide de Previsão deve mostrar **52 + 4** e as métricas novas (Arroz MAE 2,8 / MAPE 6,7%; Leite MAE 4,8 / MAPE 7,5%).
4. O slide da regra da compra deve mostrar o mínimo automático e o exemplo do Arroz: **39,1 + 5,6 − 8 = 36,7 → 37 un → R$ 832,50**.
5. O PDF `slides.pdf` deve ter 10 páginas e abrir com o mesmo conteúdo.
6. O link do app no slide final deve apontar para `https://emiyakiritsugu3.github.io/SAD_02/`.

## Última execução

- `npm test` → **77/77 passando**.
- Smoke do app em 1440×950 e 360×800 → sem erros de console, sem overflow.
- Compras → total **R$ 2.350,10**; Arroz **5,6 AUTO / 37 un / R$ 832,50**.
- Cobertura 2 dias → total **R$ 2.733,16**; Arroz **11,2 AUTO**.
- Override manual do Arroz (4) → **36 un / R$ 810,00**; a cobertura continua valendo para os outros.
- Vendas (exemplo em 27/11/2026) → Dia **R$ 814,60**, Semana **R$ 3.555,50**, Mês **R$ 14.496,90**, Ano **R$ 158.168,40**.
- Previsão → 52 opções de semana, 1 gráfico de 52 + 4, 10 linhas na tabela de erro, 10 produtos × 4 semanas na tabela de próximas semanas.
- Salvar dia → previsão/compra recalculadas; `localStorage` v2 com 362 dias no exemplo.
- Falha de `setItem` → banner persistente + toast de erro.
- Nome de 60 caracteres → sem overflow em 360 px.
- Filtro `cafe` → Café encontrado; badge atualizado.
- Backtest → 4 linhas previsto/real.
- Slides → 10 páginas; PDF 10 páginas.

## O que ainda é manual

O smoke acima é um roteiro reproduzível, mas não está automatizado no CI. A suíte `npm test` cobre os módulos de domínio; o smoke cobre a interface. Automatizar o smoke com Playwright no CI é um próximo passo, junto com a validação em um mercadinho real e a integração com o caixa/PDV.
