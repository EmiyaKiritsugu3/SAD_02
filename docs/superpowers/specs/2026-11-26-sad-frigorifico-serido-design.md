# SAD SeridóFrigo — Design

**Data:** 2026-11-26
**Status:** proposta para aprovação
**Prazo:** entrega em dezembro/2026 (sistema + slides), com marco de uma semana
**Repo:** SAD_02

## 1. Problema e contexto

O frigorífico de caprinos e ovinos do Seridó decide toda semana quanto abater,
quanto manter em estoque e de quem comprar animais. Hoje a decisão é feita com
planilha e intuição, o que gera ruptura, excesso de estoque, capacidade ociosa e
compras ruins.

O projeto anterior (`saaty`) era um assistente AHP genérico. O professor rejeitou
o escopo genérico e pediu um SAD para uma necessidade específica de um usuário.
A adaptação foi aprovada; o motor AHP será reaproveitado como módulo de seleção
de fornecedores.

## 2. Usuário e decisão

**Usuário:** gestor de produção e estoque do Frigorífico Serra do Seridó,
frigorífico de pequeno porte em Caicó/RN (persona e dados ilustrativos).

**Decisão semanal (toda segunda-feira):**

1. Quantos caprinos e ovinos abater na semana.
2. Quanto de carne manter em estoque e quanto atender da demanda prevista.
3. De qual fornecedor/lote comprar os animais que faltarem.

**Resultado esperado:** plano semanal com animais a abater, kg a produzir,
necessidade de compra, margem estimada, alertas de capacidade/estoque e
fornecedor recomendado.

## 3. Escopo

**Posicionamento (auditoria de mercado):** o SeridóFrigo **não é um ERP** nem um
APS enterprise. É uma **camada de decisão semanal** para pequenos frigoríficos
que hoje usam planilha ou um ERP básico. Importa dados (CSV/JSON) e entrega
previsão, plano, cenários e ranking de fornecedores. A análise completa está em
`docs/auditoria-mercado.md`.

**Dentro do MVP:**

- Dashboard com estoque, previsão, plano, capacidade, margem e alertas.
- Previsão de demanda semanal por espécie, com média móvel, suavização
  exponencial e regressão linear; backtest com MAE/MAPE e escolha do melhor
  método.
- Política de estoque: estoque de segurança, ponto de pedido, cobertura e
  classificação ABC (se o tempo permitir).
- Plano semanal heurístico: previsão + estoque meta − estoque atual, convertido
  em animais, com limites de capacidade de abate e câmara fria.
- Módulo AHP de fornecedores: 4 critérios, 3 fornecedores, razão de
  consistência (CR), ranking e recomendação. Conformidade sanitária entra como
  requisito eliminatório (componente de conhecimento).
- Cenários de sensibilidade: demanda, preço de venda e capacidade.
- Página de dados e premissas com fontes públicas, avisos e distinção entre
  dado observado e estimativa.
- Importação CSV de demanda e estoque (camada de decisão sobre dados existentes).
- Slide de análise competitiva (ERP × APS × planilha).
- Testes com `node:test`.
- Slides de apresentação.

**Fora do MVP (trabalhos futuros):**

- Rastreabilidade SIF/MAPA, NF-e, balanças, etiquetas, WMS, controle fiscal,
  otimização de cortes/carcaça, programação linear/Simplex, Data Warehouse/OLAP,
  mineração de dados completa, sistema especialista, CRUD completo de estoque,
  autenticação, backend, banco de dados, integração ao vivo com APIs e dados
  reais do frigorífico.
- Esses itens aparecem nos slides como limitações e evolução.

## 4. Dados e premissas

| Fonte | Uso | Dado observado |
|---|---|---|
| IBGE, PPM, tabela 3939, variável 105 | Rebanho de Caicó/RN | 2025: 15.157 caprinos e 24.909 ovinos; série 2015–2025 |
| Embrapa CIM/Cepea, Boletim Set/2026 | Preço de referência | RN: R$ 12,62/kg vivo; carcaça no Nordeste: R$ 22–32/kg |
| Embrapa Caprinos e Ovinos, Doc 133/2019 | Referência de custo | COE, COT e CT por kg para caprino e ovino |
| Embrapa/EMPAER, coeficientes técnicos | Conversão animal → carcaça | Peso ao abate 28–32 kg; rendimento de carcaça 45–50% |

**Premissas explícitas:**

- A série de demanda semanal é **ilustrativa**, com 52 semanas, calibrada para
  ~60 caprinos + 60 ovinos por semana, sazonalidade (junho e dezembro +15%,
  fevereiro e março −10%) e ruído determinístico. Está rotulada como estimativa
  na interface.
- Os três fornecedores são **personas ilustrativas**; nomes, preços e prazos
  são editáveis.
- Preços, custos, capacidade e parâmetros são editáveis; os valores base derivam
  das fontes acima.
- A interface separa visualmente **fonte pública**, **estimativa** e
  **premissa**.

## 5. Modelos

### 5.1 Previsão de demanda

- Média móvel (janela 4).
- Suavização exponencial simples (alfa 0,3).
- Regressão linear (tendência).
- Backtest nas últimas 4 semanas; métricas MAE e MAPE.
- Seleção automática do menor MAE; o usuário pode trocar o método.

### 5.2 Política de estoque

- Estoque de segurança = z × σ × √L, com z = 1,65 (95%) e L = 1 semana.
- Ponto de pedido = demanda média durante L + estoque de segurança.
- Cobertura = estoque atual / demanda média semanal.
- ABC por receita: A = 80%, B = 15%, C = 5% (se implementado).

### 5.3 Plano semanal

Para cada espécie:

1. Demanda prevista da semana (`D`, kg de carcaça).
2. Estoque meta = `D × cobertura + estoque de segurança`.
3. Produção necessária = `estoque meta + D − estoque atual`.
4. Animais = `produção / kg de carcaça por animal`.
5. Limites: capacidade de abate, capacidade da câmara e estoque mínimo.
6. Necessidade de compra = animais − estoque de animais vivos (ou = animais).
7. Margem = receita − (compra + abate + frio).

Se a produção necessária for negativa, o plano é zero e o excedente é
sinalizado. Se a capacidade for excedida, o plano é cortado no limite e um alerta
mostra o déficit.

**Cenários:** multiplicadores de demanda (−20% a +20%), preço (−15% a +15%) e
capacidade (−20% a +20%), recalculando plano e margem.

### 5.4 AHP de fornecedores

- **Critérios:** preço, qualidade da carcaça, prazo de entrega e confiabilidade.
- **Requisito eliminatório:** conformidade sanitária (fornecedor sem
  conformidade não entra no ranking).
- **Alternativas:** Fazenda Boa Vista (Caicó/RN), Cooperativa Seridó (Caicó/RN)
  e Lote de Uauá/BA.
- Matrizes pareadas com CR ≤ 10%; pesos dos critérios; pesos das alternativas
  por critério; score final e ranking.
- Reuso do motor `calcAHP` do projeto `saaty`.

## 6. Interface

- Aplicação estática, sem build e sem dependências de runtime; HTML, CSS e JS;
  persistência em `localStorage`.
- Navegação: **Painel**, **Previsão**, **Plano**, **Fornecedores**, **Dados**.
- Identidade SeridóFrigo: paleta terracota, areia, marrom e verde-oliva;
  tipografia serifada nos títulos.
- Gráficos em SVG, responsivos e acessíveis.
- Linguagem do domínio: abate, carcaça, cobertura, câmara fria, lote.
- Acessibilidade: labels, foco visível, contraste, navegação por teclado.

## 7. Arquitetura e arquivos

```
SAD_02/
├── index.html
├── slides.html
├── style.css
├── js/
│   ├── ahp.js            # motor AHP puro (reaproveitado)
│   ├── dados.js          # base pública + série ilustrativa + premissas
│   ├── previsao.js       # média móvel, SES, regressão, métricas
│   ├── estoque.js        # segurança, ponto de pedido, cobertura, ABC
│   ├── plano.js          # plano semanal e cenários
│   ├── fornecedores.js   # modelo AHP do domínio
│   ├── csv.js            # importação simples de demanda/estoque
│   └── app.js            # UI, gráficos, localStorage
├── test/
│   ├── ahp.test.js
│   ├── previsao.test.js
│   ├── estoque.test.js
│   └── plano.test.js
├── docs/
│   ├── contexto-e-decisoes.md
│   ├── auditoria-mercado.md
│   ├── fontes-e-premissas.md
│   └── superpowers/specs/2026-11-26-sad-frigorifico-serido-design.md
├── package.json
└── README.md
```

- Módulos de lógica como IIFE com namespace global no browser e
  `module.exports` no Node, seguindo o padrão do projeto anterior.
- `package.json` sem dependências; `npm test` executa `node --test`.
- Chave de persistência: `seridofrigo:v1`.

## 8. Testes

- **Previsão:** média móvel, SES, regressão, MAE/MAPE e backtest.
- **Estoque:** estoque de segurança, ponto de pedido, cobertura e ABC.
- **Plano:** conversão kg → animais, limites de capacidade, compra, margem e
  cenários.
- **AHP:** `calcAHP`, CR, ranking e gate sanitário.
- Critério de aceite: `npm test` verde e demo sem erros no navegador.

## 9. Entregáveis

1. Aplicação funcionando localmente (`index.html` ou
   `python3 -m http.server`).
2. Slides (`slides.html` + PDF), incluindo análise competitiva.
3. README com instruções, fontes e premissas.
4. Spec, auditoria de mercado e documentação de apoio.

## 10. Cronograma de uma semana

| Dia | Entrega |
|---|---|
| 26/11 (qui) | Spec aprovada, setup, dados públicos, motor AHP |
| 27/11 (sex) | Lógica de previsão, estoque e plano + testes |
| 28/11 (sáb) | Dashboard e tela de previsão |
| 29/11 (dom) | Tela de plano, cenários e AHP de fornecedores |
| 30/11 (seg) | Página de dados, importação CSV, polimento e integração |
| 01/12 (ter) | Slides (incluindo análise competitiva), screenshots e README |
| 02/12 (qua) | Buffer, testes finais e ensaio |
| 03/12 (qui) | Entrega/apresentação |

## 11. Riscos e cortes

- **Tempo curto:** cortar ABC e regressão; a importação CSV é must-have simples e
  não deve ser cortada. Manter dashboard, previsão, plano e AHP.
- **Editor AHP complexo:** usar matrizes pré-preenchidas + sliders; o cálculo e
  o ranking continuam demonstráveis.
- **Dados públicos insuficientes:** manter a base ilustrativa rotulada e as
  fontes na página de dados.
- **Pedido de artigo:** usar a spec, a auditoria e os slides como base e expandir
  depois.

## 12. Critérios de sucesso

- O gestor vê, em uma tela, a decisão da semana e o fornecedor recomendado.
- O sistema explica de onde vêm os números (fórmulas e fontes).
- O posicionamento fica claro: camada de decisão complementar ao ERP/planilha,
  não um ERP.
- O professor reconhece um SAD específico, com usuário, decisão, dados, modelos,
  conhecimento e interface.
- `npm test` verde; demonstração sem erros.
