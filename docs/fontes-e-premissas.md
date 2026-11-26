# Fontes e premissas — SeridóFrigo

**Atualizado em:** 2026-11-26
**Status:** versão final do MVP.

## 1. Fontes públicas

| Fonte | Uso | Dado usado | Link |
|---|---|---|---|
| IBGE — Pesquisa da Pecuária Municipal (PPM), tabela 3939, variável 105 | Rebanho de Caicó/RN | 2025: 15.157 caprinos e 24.909 ovinos; série 2015–2025 | https://sidra.ibge.gov.br/tabela/3939 |
| Embrapa CIM / Cepea — Boletim de Cotações Set/2026 | Preço de referência | RN: R$ 12,62/kg vivo; carcaça no Nordeste: R$ 22–32/kg | https://www.embrapa.br/cim-inteligencia-e-mercado-de-caprinos-e-ovinos/cotacoes |
| Embrapa Caprinos e Ovinos — Doc 133/2019 | Custos de produção | COE, COT e CT por kg para caprino e ovino | https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1117113/1/CNPC-2019-Doc133.pdf |
| Embrapa / EMPAER — coeficientes técnicos | Conversão animal → carcaça | Peso ao abate 28–32 kg; rendimento de carcaça 45–50% | Documentos técnicos da Embrapa Caprinos e Ovinos |

## 2. Premissas do modelo

- **Demanda semanal ilustrativa:** 52 semanas, base ~700 kg de caprino e ~900 kg de ovino por semana; sazonalidade de +15% em junho (São João) e dezembro (Natal) e −10% entre as semanas 5 e 13; ruído determinístico de ±8%. Gerada com seed fixa; não é venda real.
- **Fornecedores ilustrativos:** Fazenda Boa Vista, Cooperativa Seridó, Lote de Uauá/BA (conformes) e Lote informal sem GTA (excluído). Preços, qualidade, prazo e confiabilidade são personas para demonstração.
- **Capacidade:** 180 animais/semana (90 caprinos + 90 ovinos); câmara fria de 6.000 kg (3.000 kg por espécie).
- **Cobertura:** 1 semana de demanda + estoque de segurança.
- **Estoque de segurança:** z = 1,65 (95% de nível de serviço) e lead time de 1 semana.
- **Preços e custos:** custos de compra derivados das referências públicas e das premissas de rendimento; preços de venda base (R$ 35/kg caprino e R$ 38/kg ovino) são premissas ilustrativas editáveis na aba Plano.
- **Margem:** receita − custo do que foi vendido; o custo de produção inclui o que vai para estoque e aparece separado na interface.

## 3. Fórmulas

### Previsão

- **Média móvel:** média das últimas N semanas.
- **Suavização exponencial:** nível inicial na primeira semana; `nível = α × valor + (1 − α) × nível`.
- **Regressão linear:** mínimos quadrados com `x = 1..n`; projeção `intercepto + inclinação × (n + h)`.
- **MAE:** média de `|previsto − real|`.
- **MAPE:** média de `|previsto − real| / real`, ignorando semanas com real = 0.
- **Backtest:** usa o histórico disponível para treinar e testa as últimas 4 semanas; na série padrão de 52 semanas, isso corresponde a 48 semanas de treino e 4 de teste.

### Estoque

- **Estoque de segurança:** `z × desvio padrão × √lead time`.
- **Ponto de pedido:** `demanda média × lead time + estoque de segurança`.
- **Cobertura:** `estoque atual / demanda média semanal`.
- **ABC:** ordena por receita; A até 80% acumulado, B até 95%, C acima.

### Plano semanal

- `estoque meta = previsão × cobertura + estoque de segurança`.
- `produção necessária = max(0, estoque meta + previsão − estoque atual)`.
- `animais necessários = produção necessária / kg de carcaça por animal`.
- `animais abatidos = floor(min(ceil(animais necessários), capacidade de abate, limite da câmara))`.
- `estoque final = estoque atual + produção − demanda atendida`.
- `necessidade de compra = max(0, animais abatidos − animais vivos)`.
- `margem = receita − custo do vendido`.
- **Cenários:** multiplicadores de demanda, preço e capacidade.

## 4. Como atualizar os dados

Na aba **Dados e premissas**, importe:

- **Demanda semanal** (`semana;caprino;ovino`):
  ```csv
  semana;caprino;ovino
  1;700;900
  2;710;910
  ```
- **Estoque atual** (`produto;estoque_kg`):
  ```csv
  produto;estoque_kg
  caprino;600
  ovino;800
  ```

O arquivo é processado no navegador; nada é enviado a servidor. Em caso de erro, os dados anteriores são mantidos. As semanas são ordenadas automaticamente e não podem se repetir.

**Formato numérico:** use ponto decimal (`12.5`) ou vírgula decimal quando o delimitador for ponto e vírgula (`12,5`). Evite separador de milhar: `1.200` é lido como 1,2.

## 5. Limitações

- A série de demanda é ilustrativa; o sistema não substitui o histórico real do frigorífico.
- Não há rastreabilidade SIF/MAPA, NF-e, balanças, WMS ou otimização de cortes.
- O plano é heurístico, não uma otimização global.
- O ranking AHP usa julgamentos humanos; a consistência é verificada pelo CR.

## 6. Validação

- **2026-11-26:** 57 testes automatizados passando (`npm test`).
- Aplicação verificada no navegador em 360 px, 768 px e 1366 px, sem erros de
  console e sem overflow horizontal.
- Importação CSV testada com arquivo válido e inválido; o inválido não altera o
  estado anterior.
- Persistência em `localStorage` e restauração de exemplo verificadas.
- Slides: 12 páginas, fontes locais (Fraunces/Archivo), PDF gerado a partir do
  deck renderizado.
- **Pendente:** validar os dados e o recorte com um frigorífico, cooperativa ou
  EMATER; confirmar a proposta com o professor.
