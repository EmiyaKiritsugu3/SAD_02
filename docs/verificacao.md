# Verificação e smoke test — Mercadinho Seridó

**Atualizado em:** 2026-11-27
**Objetivo:** registrar o que é automatizado e como reproduzir o smoke manual do app e dos slides.

## Automatizado

```bash
npm test
```

- **73 testes** com `node:test`, cobrindo estado/persistência, migração v1→v2, produtos, dias, série semanal, resumos por período, previsão, compra sugerida e arredondamento.
- `node --check` em todos os arquivos de `js/`.
- `pdfinfo slides.pdf` → **10 páginas**.

## Smoke manual com Playwright

### Preparação

```bash
python3 -m http.server 8000
```

Abra `http://localhost:8000` e limpe o `localStorage` para carregar o exemplo.

### App

1. **Compras:** a lista deve ter 10 produtos, o total deve ser **R$ 2.145,72** e o gráfico do Arroz deve aparecer.
2. **Backtest:** abra “Como calculamos” e confira a tabela com 4 linhas (Semana, Previsto, Real).
3. **Filtro:** digite `cafe`; deve aparecer **Café 500 g**, com o badge **1 de 10**.
4. **Seleção:** clique em Feijão; o foco deve ir para o título do gráfico e a linha deve ficar com `aria-selected="true"`.
5. **Vendas (dia):** a data deve abrir em hoje, com os 10 produtos e os valores do exemplo.
6. **Períodos:** alterne **Dia / Semana / Mês / Ano** e confira o intervalo e o total:
   - Dia: `27/11/2026` → **R$ 791,00**;
   - Semana: `23/11 a 29/11/2026` → **R$ 3.364,40**;
   - Mês: `Novembro de 2026` → **R$ 13.204,00**;
   - Ano: `2026` → **R$ 39.810,30**.
7. **Salvar dia:** altere o arroz para `9`, salve e volte para Compras; a previsão e a compra devem ser recalculadas. O dia continua salvo no `localStorage`.
8. **Excluir dia:** exclua o dia salvo e confirme que ele some do resumo; a semana pode continuar com os outros dias.
9. **Falha de gravação:** no console, faça `Storage.prototype.setItem = () => { throw new Error("quota"); }` e salve; o banner “Não foi possível gravar os dados…” deve aparecer, junto com o toast de erro.
10. **Nome longo:** cadastre um produto com 60 caracteres sem espaço, abra Compras em 360 px e confira que a página não tem overflow horizontal.
11. **Produtos:** adicionar, editar e remover; carregar exemplo e limpar dados.
12. **Migração:** remova `mercadinho-serido:v2`, deixe um `localStorage` no formato v1 (semana) e recarregue; o app deve converter para dias, mostrar o aviso de migração e preservar o total semanal. O teste automatizado cobre o mesmo cenário.
13. **Mobile:** em 360 px, as abas, as tabelas (com rolagem interna), o gráfico (com rolagem interna) e os botões continuam utilizáveis.

### Slides

1. Abra `http://localhost:8000/slides.html`.
2. Devem existir **10 slides**; `→` avança e `←` volta.
3. O PDF `slides.pdf` deve ter 10 páginas e abrir com o mesmo conteúdo.
4. O link do app no slide final deve apontar para `https://emiyakiritsugu3.github.io/SAD_02/`.

## Última execução

- `npm test` → **73/73 passando**.
- Smoke do app em 1366×900 e 360×800 → sem erros de console, sem overflow.
- Compras → total **R$ 2.145,72** (igual ao exemplo semanal anterior).
- Vendas (exemplo em 27/11/2026) → Dia **R$ 791,00**, Semana **R$ 3.364,40**, Mês **R$ 13.204,00**, Ano **R$ 39.810,30**.
- Salvar dia → previsão/compra recalculadas; `localStorage` v2 com 82 dias no exemplo.
- Falha de `setItem` → banner persistente + toast de erro.
- Nome de 60 caracteres → sem overflow em 360 px.
- Filtro `cafe` → Café encontrado; badge atualizado.
- Backtest → 4 linhas previsto/real.
- Slides → 10 páginas; PDF 10 páginas.

## O que ainda é manual

O smoke acima é um roteiro reproduzível, mas não está automatizado no CI. A suíte `npm test` cobre os módulos de domínio; o smoke cobre a interface. Automatizar o smoke com Playwright no CI é um próximo passo, junto com a validação em um mercadinho real e a integração com o caixa/PDV.
