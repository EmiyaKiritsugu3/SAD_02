# Verificação e smoke test — Mercadinho Seridó

**Atualizado em:** 2026-11-27
**Objetivo:** registrar o que é automatizado e como reproduzir o smoke manual do app e dos slides.

## Automatizado

```bash
npm test
```

- **54 testes** com `node:test`, cobrindo estado/persistência, produtos, semanas, séries, previsão, compra sugerida e arredondamento.
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
5. **Vendas:** a semana deve abrir em uma segunda-feira com os 10 produtos preenchidos.
6. **Data vazia:** limpe o campo de data; ele deve voltar para a segunda anterior, manter os 10 valores e, ao salvar, preservar os 10 produtos.
7. **Falha de gravação:** no console, faça `Storage.prototype.setItem = () => { throw new Error("quota"); }` e salve; o banner “Não foi possível gravar os dados…” deve aparecer, junto com o toast de erro.
8. **Nome longo:** cadastre um produto com 60 caracteres sem espaço, abra Compras em 360 px e confira que a página não tem overflow horizontal.
9. **Produtos:** adicionar, editar e remover; carregar exemplo e limpar dados.
10. **Mobile:** em 360 px, as abas, a tabela (com rolagem interna), o gráfico (com rolagem interna) e os botões continuam utilizáveis.

### Slides

1. Abra `http://localhost:8000/slides.html`.
2. Devem existir **10 slides**; `→` avança e `←` volta.
3. O PDF `slides.pdf` deve ter 10 páginas e abrir com o mesmo conteúdo.
4. O link do app no slide final deve apontar para `https://emiyakiritsugu3.github.io/SAD_02/`.

## Última execução

- `npm test` → **54/54 passando**.
- Smoke do app em 1366×900 e 360×800 → sem erros de console, sem overflow.
- Data vazia → semana preservada com 10 valores.
- Falha de `setItem` → banner persistente + toast de erro.
- Nome de 60 caracteres → sem overflow em 360 px.
- Filtro `cafe` → Café encontrado; badge atualizado.
- Backtest → 4 linhas previsto/real.
- Slides → 10 páginas; PDF 10 páginas.

## O que ainda é manual

O smoke acima é um roteiro reproduzível, mas não está automatizado no CI. A suíte `npm test` cobre os módulos de domínio; o smoke cobre a interface. Automatizar o smoke com Playwright no CI é um próximo passo, junto com a validação em um mercadinho real.
