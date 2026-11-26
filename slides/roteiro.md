# Roteiro de apresentação — SeridóFrigo

**Duração alvo:** 10–12 minutos + perguntas.
**Deck:** `slides.html` (interativo) ou `slides.pdf` (backup).
**Atalhos no HTML:** →/espaço avançam; ← voltam; `F` tela cheia; `N` notas do apresentador.

## 1. Abertura (30 s)

“Bom dia. O SeridóFrigo é um SAD para uma decisão específica: quanto abater, quanto estocar e de quem comprar, toda semana, em um frigorífico de caprinos e ovinos em Caicó/RN. Ele não é um ERP e não é um AHP genérico.”

## 2. Contexto (45 s)

- O frigorífico vive de uma rotina semanal: compra animal, abate, estoca e vende.
- O erro aparece rápido: ruptura, câmara cheia, compra cara ou lote sem conformidade.
- Dados públicos: 15.157 caprinos e 24.909 ovinos em Caicó/RN (IBGE PPM 2025).
- A capacidade de 180 animais/semana é premissa do caso.

## 3. Problema (45 s)

- Planilha registra o passado; não decide o próximo passo.
- Três dores: ruptura, excesso e compra ruim.
- A virada do projeto: de um AHP genérico para um SAD de um frigorífico real.

## 4. Usuário e decisão (45 s)

- Usuário: gestor de produção e estoque.
- Decisão: quanto abater (caprino/ovino), quanto estocar e de quem comprar.
- A decisão é recorrente; o sistema precisa ser usado toda semana.

## 5. Arquitetura SAD (50 s)

- Dados: IBGE, Embrapa/Cepea, CSV do frigorífico.
- Modelos: previsão, estoque, plano, cenários e AHP.
- Conhecimento: gate sanitário, capacidade, câmara, estoque mínimo.
- Interface: painel, previsão, plano, fornecedores e dados.
- “O SAD não substitui o ERP: consome dados e devolve decisão.”

## 6. Dados e premissas (50 s)

- O que é real: rebanho (IBGE), preços (Embrapa/Cepea), custos/coeficientes (Embrapa).
- O que é ilustrativo: série de demanda, fornecedores, capacidade/cobertura.
- O sistema importa CSV para o frigorífico plugar o histórico real.
- “Sem dado real, o SAD ainda é um SAD — desde que a premissa esteja na tela.”

## 7. Previsão (1 min)

- Três métodos: média móvel, suavização exponencial e regressão.
- Backtest nas últimas 4 semanas; o automático escolhe o menor MAE.
- Resultado do caso: caprino MAE 52 kg / MAPE 6,3%; ovino MAE 89 kg / MAPE 8,2%.
- O erro está na tela; não é caixa-preta.

## 8. Estoque e plano (1 min 10 s)

- Cadeia: previsão → estoque meta → produção → animais → compra.
- O plano respeita capacidade de abate e câmara.
- Resultado do caso: 176 animais no total; margem de R$ 10,1 mil no período; 97,8% da capacidade.
- A margem usa o custo do vendido; o custo de produção inclui o que vai para estoque.
- Alertas mostram quando a capacidade ou a câmara apertam.

## 9. Fornecedores (1 min)

- AHP clássico: critérios pareados, autovetor e CR ≤ 10%.
- Pesos do caso: preço 40%, qualidade 30%, prazo 15%, confiabilidade 15%.
- Gate sanitário: fornecedor sem GTA é excluído antes do cálculo.
- Ranking: Boa Vista (37,3%), Uauá (32,0%), Cooperativa (30,7%).
- “O mais barato não vence: prazo e confiabilidade pesam.”

## 10. Posicionamento (50 s)

- ERP frigorífico: SIF, NF-e, rastreabilidade, WMS — amplo e regulatório.
- APS enterprise: S&OP, IA, balanceamento de carcaça — poderoso e caro.
- SeridóFrigo: camada de decisão semanal, CSV, sem SIF/NF-e.
- O espaço: o pequeno frigorífico entre a planilha e o APS enterprise.

## 11. Limitações e próximos passos (40 s)

- Não faz: SIF/MAPA, NF-e, rastreabilidade, balanças, otimização de cortes.
- A série é ilustrativa; o plano é heurístico.
- Próximos passos: dado real, integração com ERP, mix de cortes/LP, validação com frigorífico.
- “Um SAD honesto mostra o limite do modelo, não só o resultado.”

## 12. Fechamento e demo (30 s + demo)

- “A decisão da semana em uma tela.”
- Demo: painel → previsão → plano → fornecedores → dados.
- Perguntas.

## Roteiro de demo (2–3 min)

1. **Painel:** mostrar os 6 KPIs, o gráfico de demanda, o alerta “sem alertas” e o fornecedor recomendado.
2. **Previsão:** trocar o método para “Regressão linear” e mostrar MAE/MAPE mudando; voltar para “Automático”.
3. **Plano:** abrir a aba, mudar a cobertura do caprino para 3 e mostrar o alerta de capacidade/câmara; clicar em “Restaurar parâmetros”.
4. **Fornecedores:** abrir a aba, mostrar o ranking, o gate sanitário e o CR 0%; alterar uma comparação para gerar CR alto e mostrar o alerta; restaurar exemplo.
5. **Dados:** mostrar a tabela de fontes, importar um CSV de demanda válido e um inválido; mostrar que o inválido não altera os dados; restaurar dados.

## Perguntas prováveis

**“Por que AHP e não uma planilha de pesos?”**
AHP torna as comparações explícitas, verifica a consistência (CR) e permite combinar critérios qualitativos e quantitativos. A planilha de pesos esconde os julgamentos.

**“Por que não fazer um ERP?”**
O mercado de ERP frigorífico é maduro e regulatório (SIF, NF-e, rastreabilidade, WMS). Um MVP de uma semana não compete nesse espaço. O valor está na camada de decisão que o ERP não entrega.

**“Os dados são reais?”**
Rebanho, preços e custos são de fontes públicas. A série de demanda e os fornecedores são ilustrativos e estão rotulados. O sistema importa CSV para dados reais.

**“Como validar com um frigorífico?”**
Importar o histórico real, rodar o backtest, comparar o plano com a decisão do gestor por 4–8 semanas e medir ruptura, estoque e aderência.

**“O que falta para virar produto?”**
Dados reais, integração com ERP/planilha, mix de cortes, multiusuário/cloud, validação comercial e conformidade LGPD.

**“Qual o modelo de negócio?”**
Assinatura baixa para pequenos frigoríficos, cobrada por planta/usuário, com implantação simples via CSV. O ERP continua sendo o sistema de registro; o SeridóFrigo é a camada de decisão.

## Créditos

- Fontes: Fraunces e Archivo (Google Fonts, OFL).
- Dados: IBGE PPM 2025; Embrapa CIM/Cepea Set/2026; Embrapa Caprinos e Ovinos.
- Screenshots: aplicação SeridóFrigo.
