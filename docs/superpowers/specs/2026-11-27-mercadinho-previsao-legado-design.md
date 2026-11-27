# Previsão com o shell do legado — design

**Data:** 2026-11-27
**Branch:** `feat/previsao-legado`
**Base:** `main` em `0441cc1`

## Objetivo

Aproximar o Mercadinho Seridó da leitura de SAD do projeto legado (frigorífico), sem trazer o domínio do frigorífico: manter a decisão semanal e os dados diários, trocar o shell e expor a previsão em uma aba própria.

## Decisões

- **Shell do legado:** sidebar escura com marca, topbar com título/subtítulo e ações, quatro abas: **Compras, Previsão, Vendas e Produtos**. Sem Fornecedores e sem AHP.
- **Previsão separada de Compras:** a aba mostra o método, um gráfico largo, a tabela de erro e as próximas 4 semanas. Compras continua sendo a decisão (quantidade e custo).
- **52 semanas no exemplo:** o histórico ilustrativo passa de 12 para 52 semanas, com a semana corrente até a data de referência. O gráfico de Previsão usa até 52 semanas + 4 previstas, como o legado.
- **Um produto selecionável:** o gráfico é único e largo; o produto é escolhido em um select (padrão: o de maior volume histórico). As tabelas mostram todos os produtos.
- **Método vale para a decisão:** o método escolhido (automático ou manual) alimenta a previsão usada em Compras. Média móvel usa janela de 1 a 12; suavização usa alfa de 0,05 a 0,95.
- **Semana de referência:** corta o histórico no ponto escolhido; a previsão é sempre das 4 semanas seguintes. O lançamento diário não é afetado.
- **Tabela de próximas semanas transposta:** produtos nas linhas e as 4 datas nas colunas, para caber os 10 produtos sem esconder metade da tabela.
- **Mobile:** a sidebar vira faixa horizontal; tabelas e gráficos rolam dentro do card; a página não ganha overflow.

## Fora de escopo

- Fornecedores, AHP, capacidade, câmara fria ou qualquer regra do frigorífico.
- Integração real com PDV/caixa, CSV, lead time, validade, orçamento ou multiusuário.
- Mudar a regra de compra ou o significado dos dados diários.

## Critérios de aceite

- Quatro abas navegáveis, com o visual de sidebar + topbar do legado.
- Previsão com 52 opções de semana, um gráfico de 52 + 4, 10 produtos na tabela de erro e 10 produtos × 4 semanas na tabela de próximas semanas.
- Troca de método e de produto recalcula a tela; o método escolhido muda a previsão de Compras.
- Exemplo com 362 dias e 52 semanas; Compras em **R$ 2.319,44**.
- `npm test` verde, smoke em 1440 e 360 px sem overflow e slides/PDF atualizados.

## Atualização — um gráfico

Com 10 produtos, dois gráficos lado a lado deixavam o histórico de 52 semanas pequeno e duplicavam o controle de produto. A aba passou a ter **um único gráfico largo** de 52 + 4, com um produto selecionável. A tabela de erro e a de próximas semanas continuam mostrando todos os produtos.
