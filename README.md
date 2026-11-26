# SeridóFrigo — SAD de planejamento semanal (Caicó/RN)

**Status:** MVP funcional (novembro/2026) — sistema + slides.
**Disciplina:** DCT2403 — Sistemas de Apoio à Decisão · UFRN/CERES.
**Posicionamento:** camada de decisão semanal para um pequeno frigorífico de caprinos e ovinos. **Não é um ERP.**

## O problema

O frigorífico compra animais, abate, estoca e vende. Toda semana, o gestor precisa decidir o tamanho da semana — e cada erro aparece rápido: ruptura, câmara cheia, animal comprado caro ou lote sem conformidade sanitária. A planilha registra o passado; ela não ajuda a decidir o próximo passo.

O projeto anterior era um assistente AHP genérico. O recorte atual atende ao feedback da disciplina: **um usuário, uma decisão, um domínio específico**.

## A decisão

**Usuário:** gestor de produção e estoque do Frigorífico Serra do Seridó (Caicó/RN; persona e dados ilustrativos).

Toda segunda-feira:

1. **Quanto abater?** Caprinos e ovinos, por espécie, dentro da capacidade e da câmara.
2. **Quanto estocar?** Cobertura, estoque de segurança, validade e risco de ruptura.
3. **De quem comprar?** Preço, qualidade, prazo, confiabilidade — e conformidade sanitária.

**Saída:** plano da semana + necessidade de compra + alertas + fornecedor recomendado.

## O que o sistema faz

- **Painel:** estoque, previsão, abate recomendado, compra, margem, capacidade, gráfico de demanda e alertas.
- **Previsão:** média móvel, suavização exponencial e regressão linear; backtest nas últimas 4 semanas; MAE/MAPE; modo automático pelo menor MAE.
- **Plano semanal:** estoque de segurança, cobertura, produção, animais, compra, margem e limites de capacidade/câmara.
- **Cenários:** sliders de demanda, preço e capacidade; tabela pessimista/base/otimista.
- **Fornecedores (AHP):** critérios pareados, CR ≤ 10%, ranking e **gate sanitário** (fornecedor sem conformidade é excluído antes do cálculo).
- **Dados e premissas:** fontes públicas, valores usados, importação CSV de demanda e estoque, restauração do exemplo.
- **Persistência:** parâmetros, matrizes AHP e cenários ficam no `localStorage`.

## O que ele não faz

Não substitui um ERP. Não cobre SIF/MAPA, NF-e, rastreabilidade de lote, balanças, WMS, controle fiscal ou otimização de cortes/carcaça. O plano é heurístico e explicável, não uma otimização global. A série de demanda é ilustrativa; o sistema importa CSV para o frigorífico plugar o histórico real.

Essas limitações estão explícitas na interface e nos slides — e são o argumento de posicionamento da auditoria de mercado (`docs/auditoria-mercado.md`).

## Como rodar

Não há build nem dependências de runtime.

```bash
python3 -m http.server 8000
```

Abra:

- Aplicação: <http://localhost:8000>
- Slides interativos: <http://localhost:8000/slides.html>
- Slides em PDF: `slides.pdf`

O `slides.pdf` é gerado a partir do deck renderizado (imagens), preservando o layout; o `slides.html` é a versão interativa e acessível.

Atalhos dos slides: `→`/espaço avançam; `←` voltam; `F` tela cheia; `N` notas do apresentador.

## Testes

```bash
npm test
```

A suíte usa `node:test` e cobre o motor AHP, previsão, estoque, plano, fornecedores e CSV. Estado atual: **51 testes passando**.

## Dados e premissas

| Fonte | Uso |
|---|---|
| IBGE — PPM 2025, tabela 3939 | Rebanho de Caicó/RN: 15.157 caprinos e 24.909 ovinos |
| Embrapa CIM/Cepea — Boletim Set/2026 | RN: R$ 12,62/kg vivo; carcaça no Nordeste: R$ 22–32/kg |
| Embrapa Caprinos e Ovinos | Custos de referência e coeficientes (peso ao abate, rendimento) |
| Série de demanda | Ilustrativa, 52 semanas, com sazonalidade e seed fixa |
| Fornecedores | Personas ilustrativas, incluindo um lote sem GTA para demonstrar o gate |

Detalhes, fórmulas e como atualizar: [`docs/fontes-e-premissas.md`](docs/fontes-e-premissas.md).

## Estrutura

```
SAD_02/
├── index.html
├── style.css
├── slides.html
├── slides.pdf
├── slides/
│   ├── fonts/            # Fraunces e Archivo (OFL)
│   ├── img/              # screenshots e slides renderizados
│   └── roteiro.md        # roteiro de apresentação e perguntas prováveis
├── js/
│   ├── ahp.js
│   ├── dados.js
│   ├── previsao.js
│   ├── estoque.js
│   ├── plano.js
│   ├── fornecedores.js
│   ├── csv.js
│   ├── importacao.js
│   ├── charts.js
│   └── app.js
├── test/
├── docs/
│   ├── contexto-e-decisoes.md
│   ├── auditoria-mercado.md
│   ├── fontes-e-premissas.md
│   └── superpowers/
│       ├── specs/
│       └── plans/
└── README.md
```

`material_do_prof/` é uso local e está no `.gitignore`; o material do professor não é redistribuído.

## Documentação

- **Spec:** [`docs/superpowers/specs/2026-11-26-sad-frigorifico-serido-design.md`](docs/superpowers/specs/2026-11-26-sad-frigorifico-serido-design.md)
- **Plano de implementação:** [`docs/superpowers/plans/2026-11-26-sad-frigorifico-serido-mvp.md`](docs/superpowers/plans/2026-11-26-sad-frigorifico-serido-mvp.md)
- **Auditoria de mercado:** [`docs/auditoria-mercado.md`](docs/auditoria-mercado.md)
- **Fontes e premissas:** [`docs/fontes-e-premissas.md`](docs/fontes-e-premissas.md)
- **Roteiro da apresentação:** [`slides/roteiro.md`](slides/roteiro.md)

## Próximos passos

1. Importar o histórico real de um frigorífico e validar o backtest.
2. Integrar ao ERP/planilha existente via CSV/API, sem substituir o sistema de registro.
3. Adicionar mix de cortes e programação linear.
4. Evoluir para multiusuário/cloud, alertas e trilha de auditoria.
5. Validar o recorte com um frigorífico, cooperativa ou EMATER.

## Créditos

- Dados: IBGE (PPM 2025); Embrapa CIM/Cepea (Set/2026); Embrapa Caprinos e Ovinos.
- Fontes dos slides: [Fraunces](https://fonts.google.com/specimen/Fraunces) e [Archivo](https://fonts.google.com/specimen/Archivo), Google Fonts (OFL).
- Disciplina: DCT2403 — Sistemas de Apoio à Decisão, UFRN/CERES.
