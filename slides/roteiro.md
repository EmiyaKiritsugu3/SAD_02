# Roteiro de apresentação — Mercadinho Seridó

**Duração alvo:** 10–12 minutos + perguntas.
**Deck:** `slides.html` (interativo) ou `slides.pdf` (backup).
**Atalhos no HTML:** →/espaço avançam; ← voltam; `F` tela cheia; `N` notas do apresentador.

## 1. Abertura (30 s)

“Bom dia. O Mercadinho Seridó é um SAD para uma decisão específica: **quanto comprar de cada produto na próxima semana**, em um mercadinho de bairro em Caicó/RN. Ele não é um PDV e não é um ERP: é uma camada de decisão em cima do histórico de vendas que o dono já tem.”

## 2. Contexto (45 s)

- O mercadinho compra, estoca e vende. A rotina é semanal.
- O erro aparece rápido: falta na prateleira, sobra no estoque ou capital parado.
- A planilha registra o passado; não responde “quanto comprar agora?”.
- As vendas são registradas por dia; a decisão de compra é semanal. O exemplo tem 10 produtos e 12 semanas de histórico diário, e prevê 4 semanas.

## 3. Problema (45 s)

- **Ruptura:** o cliente procura e o produto não está.
- **Excesso:** o estoque enche, o dinheiro fica parado e a validade corre.
- **Compra sem histórico:** o dono repete o mês passado e não sabe o erro da previsão.
- “O recorte: um usuário, uma decisão, um domínio.”

## 4. Usuário e decisão (45 s)

- **Usuário:** o dono do mercadinho, uma pessoa, uma rotina semanal.
- **Decisão:** quanto comprar de cada produto para a próxima semana.
- **Fluxo:** o que vendeu → quanto vai vender → quanto comprar.
- **Saída:** lista de compras com quantidade e custo estimado.

## 5. Arquitetura SAD (50 s)

- **Dados:** produtos, vendas diárias, estoque atual e estoque mínimo.
- **Modelos:** média móvel, suavização exponencial, regressão e backtest.
- **Conhecimento:** unidade de medida, estoque mínimo e regra de compra.
- **Interface:** Compras, Vendas e Produtos.
- “O SAD não substitui o caixa/ERP: consome os dados e devolve decisão.”

## 6. Previsão (1 min)

- Três métodos: média móvel, suavização exponencial e regressão.
- Menos de 4 semanas: sem previsão.
- De 4 a 7 semanas: média móvel.
- A partir de 8 semanas: backtest nas últimas 4 semanas e escolha automática pelo menor MAE.
- Exemplo: arroz com MAE 1,8 unidade e MAPE 4,4%; leite com MAE 1,5 e MAPE 2,7%.
- “O erro está na tela, dentro de ‘Como calculamos’. Não é caixa-preta.”

## 7. Regra da compra (1 min 10 s)

- `necessidade = max(0, previsão + estoque mínimo − estoque atual)`.
- `un` arredonda para cima; `kg` e `L` usam uma casa decimal.
- Exemplo do arroz: 38,8 + 4 − 8 = 34,8 → **35 unidades**; a R$ 22,50 → **R$ 787,50**.
- O dono decide a compra final; o app é uma sugestão.
- Limite: o estoque é atualizado manualmente; o app não é um PDV.

## 8. Demonstração (1 min 30 s)

1. Abrir **Compras**: mostrar a lista, o custo total e os produtos sem dados.
2. Selecionar **Arroz**: abrir o gráfico 12 + 4 e “Como calculamos”.
3. Ir para **Vendas**: lançar o dia, alterar uma quantidade, salvar e alternar **Dia / Semana / Mês / Ano** no resumo.
4. Voltar para **Compras**: mostrar a previsão e a compra recalculadas.
5. Ir para **Produtos**: mostrar o cadastro, o exemplo e o “Limpar dados”.
6. Mostrar a visão **Mês** e **Ano** no resumo de Vendas.

## 9. Entrega e limites (50 s)

- **Entrega:** 3 abas, previsão automática, compra sugerida, exemplo rotulado, dados no navegador, 73 testes e deploy no GitHub Pages.
- **Limites:** estoque manual; sem lead time, validade, orçamento, fornecedores, CSV ou multiusuário.
- **Próximo passo:** validar com um mercadinho real e, depois, integrar ao caixa/ERP.
- A versão frigorífico ficou preservada como legado no Git.

## 10. Encerramento (20 s)

“Uma decisão simples, toda semana. O app está publicado em `emiyakiritsugu3.github.io/SAD_02`. Obrigado — perguntas?”

## Perguntas prováveis

**“Isso não é só um dashboard?”**
Não: a saída é uma decisão de compra com quantidade e custo, não um gráfico para o usuário interpretar sozinho. O gráfico é apoio; a lista de compras é a ação.

**“Por que não é um ERP/PDV?”**
O ERP registra a operação inteira; o Mercadinho Seridó decide em cima dos dados. Ele não emite nota, não controla caixa e não substitui o sistema da loja.

**“Como funciona com poucos dados?”**
Menos de 4 semanas: sem previsão. De 4 a 7: média móvel. A partir de 8: backtest e escolha automática. O app avisa quando não há dados suficientes.

**“E produtos perecíveis?”**
O MVP não modela validade. É uma evolução natural: incluir validade, lead time e alerta de vencimento. Hoje o dono controla isso manualmente.

**“Como você sabe que está certo?”**
73 testes automatizados, smoke test com Playwright e um conjunto de exemplo reproduzível. A validação com dados reais de um mercadinho é o próximo passo.

**“O que é real e o que é ilustrativo?”**
O conjunto inicial de 10 produtos e 12 semanas é ilustrativo e está rotulado. Os dados que o dono digita são reais e ficam no navegador. Não há dados públicos nesta versão.

**“Por que o estoque é manual?”**
Para manter o MVP simples e não duplicar um PDV. O dono atualiza o estoque depois de comprar/vender; a recomendação usa esse número.

## Checklist antes de apresentar

- [ ] `npm test` verde (73 testes).
- [ ] App aberto em `http://localhost:8000` com o exemplo carregado.
- [ ] Slides em `http://localhost:8000/slides.html` ou `slides.pdf`.
- [ ] Abrir a aba Compras e deixar o Arroz selecionado.
- [ ] Testar a demo uma vez: Vendas → lançar o dia → alternar período → salvar → Compras.
- [ ] Conferir o link do Pages no encerramento.
