# Auditoria de mercado — SeridóFrigo

**Data:** 2026-11-26
**Pergunta:** o SAD de planejamento semanal de abate e estoque para um frigorífico
de caprinos/ovinos em Caicó/RN faz sentido diante do que já existe no mercado?

## 1. Método

- Pesquisa de produtos reais em quatro categorias: ERP para frigoríficos, APS/S&OP
  para a indústria da carne, ERP genérico de pequeno porte e planilhas.
- Fontes públicas consultadas em 26/11/2026: sites oficiais dos fornecedores,
  cases, comparativos de preço e artigos acadêmicos/técnicos.
- Comparação pelas capacidades que importam para a decisão do frigorífico.
- Limitação: preços de ERP frigorífico e de APS são "sob consulta"; as faixas
  usadas são indicativas e servem para comparar ordens de grandeza.

## 2. Mapa do mercado

### 2.1 ERP para frigoríficos (Brasil)

| Produto | Foco | Capacidades relevantes | Porte / preço |
|---|---|---|---|
| **Frigo-Data** | Indústria de frigoríficos | Compra de animais, abate, tipificação, desossa, rastreabilidade, estoque, BI | Pequeno a grande; sob consulta |
| **Sistec** | ERP frigorífico | Rastreabilidade SIF/MAPA, rendimento por carcaça, custos, câmara fria, WMS, NF-e/SPED, dashboards | Pequeno a grande; sob consulta |
| **Frigosoft (Atak)** | Chão de fábrica | Abate, desossa, industrializados, rastreabilidade, custeio, rendimento; todas as proteínas, inclusive ovinos | Indústria; licença por usuário; sob consulta |
| **AQx (Sil)** | Abate e quarteio | Abate, classificação, quarteio, embalagem, expedição; multiespécie (inclui caprinos); offline e API-first | Regional a grande; sob consulta |
| **Nevera Meat** | ERP cloud frigorífico | Produção, lotes, estoque, compras/vendas, financeiro, SIF/MAPA | Pequeno a grande; mensalidade sob consulta |
| **Avail Meat** | Camada administrativa | Integra ao sistema de produção via CSV/XML/API; comercial, estoque, custos, financeiro, fiscal | Frigoríficos que já têm sistema industrial; sob consulta |
| **FDC, Codexperts, SDC, CF Company** | ERP frigorífico | Rastreabilidade, rendimento, custos, SIF, NF-e, expedição | Pequeno a grande; sob consulta |

**Leitura:** é um mercado maduro, amplo e regulatório. Os produtos cobrem SIF/MAPA,
fiscal, balanças, etiquetas, lotes, WMS e chão de fábrica. Um MVP acadêmico não
compete nesse espaço — e não precisa.

### 2.2 APS/S&OP para a indústria da carne (global)

| Produto | Foco | Capacidades relevantes | Porte / preço |
|---|---|---|---|
| **RELEX** | Planejamento de supply chain | Previsão de demanda, S&OP, balanceamento de carcaça, gestão de excedentes, validade, cenários | Médio/grande; enterprise |
| **Imperia** | Planejamento de supply chain | Previsão semanal, compras e produção conectadas, redução de desperdício | Médio; enterprise |
| **Logic Factory** | Beef & pork planning | Otimização de cortes, cenários, yield, alocação por canal | Médio/grande; enterprise |
| **CSB** | ERP de carne | Planejamento de abate, produção, rastreabilidade, câmara fria | Médio/grande; sob consulta |
| **CutLogix** | Processamento de carne | Planejamento integrado, previsão, capacidade de câmara, inventário | Médio/grande; enterprise |
| **inecta** | Slaughterhouse software | Previsão de demanda, rastreabilidade, HACCP, produção | Médio/grande; sob consulta |
| **Cattlytics** | Slaughterhouse management | Compras, inventário, contabilidade, vendas, operação | Pequeno a grande; sob consulta |
| **CAI Provisions** | Meat ERP | MRP, ponto de pedido, lotes, freezer, produção | Pequeno/médio; sob consulta |

**Leitura:** os APS resolvem o problema completo (previsão, S&OP, balanceamento de
carcaça, cortes, cenários), mas com custo e complexidade de projeto enterprise.
Para um frigorífico regional de pequeno porte, é overkill.

### 2.3 ERP genérico de pequeno porte (Brasil)

| Produto | Preço de entrada (2026) | Força | Limite para o frigorífico |
|---|---|---|---|
| **Omie** | ~R$ 119–229/mês (planos) | Estoque, compras, vendas, financeiro, NF-e, curva ABC | Genérico: sem rendimento de carcaça, SIF, lote de carne |
| **Bling** | ~R$ 60/mês | E-commerce/marketplace, estoque, NF-e | Genérico e focado em varejo digital |
| **Tiny/Olist** | ~R$ 55–66/mês | E-commerce, estoque, pedidos | Genérico |
| **ContaAzul** | ~R$ 179,90–289,90/mês | Financeiro, estoque, alertas | Genérico, foco financeiro/contábil |

**Leitura:** são baratos e onipresentes, mas não entendem abate, carcaça, SIF,
validade de carne ou planejamento de produção. Um "controle de estoque genérico"
seria esmagado por esses produtos e não seria um SAD.

### 2.4 Planilhas — o concorrente real

- O case da **RELEX/Group of Butchers** relata que a empresa fazia previsão de 1–2
  semanas em planilha, com média simples das últimas 10 semanas, antes de migrar
  para um APS. A migração melhorou a acurácia em ~10% e reduziu estoque em 5–10%.
- A **Ever.Ag** relata que muitos processadores de carne ainda controlam
  programação e estoque em planilhas e decidem compras "por intuição educada".
- Um estudo com o modelo **SCOR** em uma processadora de carne identificou
  fraquezas estruturais em previsão, compra de animais e coordenação entre áreas.

**Leitura:** a planilha é o concorrente real do pequeno frigorífico. Ela é barata e
flexível, mas não tem previsão automática, cenários, política de estoque,
auditabilidade nem ranking de fornecedores.

## 3. Comparação com o MVP SeridóFrigo

| Capacidade | SeridóFrigo (MVP) | ERP frigorífico | APS de carne | ERP genérico | Planilha |
|---|---|---|---|---|---|
| Rastreabilidade SIF/MAPA | Não | Sim | Parcial/integra | Não | Manual |
| Abate/desossa/carcaça | Agregado (kg/animais) | Sim, detalhado | Sim, por corte | Não | Manual |
| Estoque/câmara/validade | Agregado | Sim, lote/endereço | Sim | Sim, genérico | Manual |
| Previsão de demanda | Sim (média móvel, SES, regressão) | BI/relatórios | Sim, estatística/IA | Básica | Manual |
| Plano semanal | Sim (heurístico) | PCP/MRP | Sim, otimizado | Não | Manual |
| Cenários/sensibilidade | Sim | BI/relatórios | Sim | Limitado | Manual |
| Seleção de fornecedores | AHP + gate sanitário | Cadastro/cotação/scorecard | Sim | Cadastro | Manual |
| Integração | CSV/JSON | Completa (balanças, SIF, NF-e) | ERP/MES | NF-e/marketplace | Nenhuma |
| Preço | Gratuito/baixo | Sob consulta + implantação | Enterprise | R$ 60–700/mês | "Grátis" (custo oculto) |
| Público | Pequeno frigorífico regional | Pequeno a grande | Médio/grande | Pequeno comércio | Micro/pequeno |

## 4. Leitura estratégica

### 4.1 O que o MVP não é

- **Não é um ERP.** Não substitui Sistec, Frigo-Data, AQx, Nevera, Frigosoft ou
  Avail. Não cobre SIF/MAPA, NF-e, balanças, etiquetas, WMS, rastreabilidade de
  lote ou custo por corte.
- **Não é um APS enterprise.** Não tem IA, balanceamento de carcaça, otimização
  de cortes, granularidade diária ou integração MES.
- **Não é um controle de estoque genérico.** Nesse espaço, Omie, Bling, Tiny e
  ContaAzul já estão consolidados e são mais baratos.

### 4.2 Onde ele faz sentido

- **Camada de decisão semanal** para frigoríficos regionais que hoje usam
  planilha ou um ERP básico.
- Entrega o que a planilha não entrega: previsão com backtest, política de
  estoque, plano de abate/compra, cenários e ranking de fornecedores.
- É **complementar** ao ERP: importa CSV/JSON, não exige substituir o sistema
  existente.
- O AHP de fornecedores é um diferencial de **transparência e auditabilidade**:
  critérios explícitos, consistência e gate sanitário. Na literatura, seleção de
  fornecedores é um dos usos clássicos de AHP.
- O vocabulário regional (caprino, ovino, carcaça, câmara fria, lote) e o recorte
  de Caicó/RN dão identidade e reduzem o risco de "mais um ERP genérico".

### 4.3 Evidências de que a dor existe

- Processadores de carne usam planilhas e intuição para previsão e compra
  (RELEX, Ever.Ag).
- Estudos de S&OP/SCOR apontam fraquezas em previsão, compra de animais e
  coordenação entre áreas.
- Ferramentas de APS existem, mas são enterprise; o pequeno frigorífico fica
  entre a planilha e o ERP que não planeja.
- AHP é método consolidado para seleção de fornecedores na literatura; falta uma
  implementação simples, domínio-específica e integrada ao plano semanal.

## 5. Veredito

| Pergunta | Resposta |
|---|---|
| Faz sentido como ERP? | **Não.** Mercado saturado, barreira regulatória e escopo inviável em uma semana. |
| Faz sentido como camada de decisão? | **Sim.** Há um nicho real entre a planilha e o APS enterprise. |
| Faz sentido como projeto da disciplina? | **Sim.** Atende ao recorte específico, usa AHP, dados, modelos, conhecimento e interface; a auditoria vira um slide forte de posicionamento. |
| O que precisa ficar explícito? | Dados ilustrativos, limitações (sem SIF/rastreabilidade/corte) e posicionamento complementar ao ERP. |

**Recomendação:** seguir com o MVP, reposicionado como **camada de decisão
semanal para pequenos frigoríficos**, e incluir a análise competitiva nos slides.
Não expandir para CRUD, rastreabilidade, fiscal ou otimização de cortes.

## 6. O que foi implementado e o que fica para depois

**Implementado no MVP:**

1. Importação CSV de demanda e estoque, com validação e preservação do estado.
2. Slide de análise competitiva com o mapa ERP × APS × planilha.
3. Posicionamento “não substitui o ERP; decide em cima dele” no README e nos slides.
4. AHP como módulo de compra, com CR por critério e gate sanitário.
5. Regressão linear, cenários e proveniência dinâmica dos dados.

**Próximos passos:**

- Expor a classificação ABC na interface.
- Importar o histórico real de um frigorífico e validar o backtest.
- Adicionar mix de cortes e programação linear.
- Integrar ao ERP/planilha existente via CSV/API.
- Evoluir para multi-usuário/cloud e validação em campo.

## 7. Fontes consultadas

- Frigo-Data — indústria de frigoríficos: https://frigo-data.com.br/modulos/industria-de-frigorificos.html
- Sistec — ERP para frigoríficos: https://www.sistecweb.com.br/segmento/frigorifico
- Frigosoft/Atak: https://atak.com.br/erp/frigosoft
- AQx/Sil Sistemas: https://silsistemas.com.br/produtos/aqx
- Nevera Meat: https://neverasistemas.com.br/erp-nevera-meat
- Avail Meat: https://availone.com.br/erp-frigorifico
- FDC Frigorífico: https://conteudo.fdcsistemas.com.br/fdc-frigorifico
- Codexperts: https://codexperts.com.br
- SDC Sistemas: https://www.sdcsistemas.com.br/Frigorificos
- RELEX — meat processors: https://www.relexsolutions.com/industries/cpg-manufacturing/meat-processors
- RELEX — case Group of Butchers: http://relexsolutions.com/resources/group-of-butchers-major-european-meat-supplier
- Imperia — meat industry: https://imperiascm.com/en-gb/industries/manufacturing/meat
- Logic Factory — beef & pork: https://thelogicfactory.com/industry/food-beverage/beef-pork
- CSB — meat: https://www.csb.com/en/industries/meat
- CutLogix: https://www.cutlogix.io/features-cutlogix-software
- inecta — slaughterhouse: https://www.inecta.com/slaughterhouse-processing-software
- Cattlytics: https://www.cattlytics.com/meat-slaughtering-software/
- CAI Provisions: https://caisoft.com/products/provisions-erp/
- Comparativo de ERPs pequenos (preços): https://nacao.digital/blog/sistema-de-controle-de-estoque
- Custo de ERP industrial: https://conquest.com.br/quanto-custa-um-erp-industrial-e-por-que-ele-se-paga-rapido
- Faixas de ERP no Brasil: https://www.ikki.digital/conteudos/quanto-custa-erp-em-2026-brasil
- Ever.Ag — dados na indústria da carne: https://ever.ag/blog/data-revolutionizes-the-meat-processing-industry
- Estudo SCOR em processadora de carne: https://ibimapublishing.com/p-articles/46MGT/2025/4636825/4636825.pdf
- AHP para seleção de fornecedores (revisão): https://link.springer.com/article/10.1007/s12597-025-01009-6
- AHP supplier selection (caso): https://journals.sagepub.com/doi/full/10.1177/1687814018822926
