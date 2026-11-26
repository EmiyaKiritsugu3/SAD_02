# Contexto e decisões — SAD_02

**Data:** 2026-11-26
**Status:** MVP implementado em 2026-11-26; ver `README.md`
**Local do domínio:** Caicó/RN (Seridó)

> **Nota:** as seções 1–10 registram o histórico da definição. O recorte final e
> o MVP estão no README, na spec e na auditoria de mercado. Ver também a seção 11
> ao final deste documento.

## 1. Origem da nova fase

O projeto anterior (`saaty`) é um assistente AHP genérico: pergunta "o que você
quer decidir?", aceita critérios e opções livres e devolve um ranking. O
professor avaliou a proposta como **genérica demais** para a disciplina.

Feedback recebido (resumo):

- a proposta precisa escolher um **domínio específico**;
- o sistema AHP deve atuar nesse segmento;
- o objetivo é um **SAD para resolver um problema específico**, não um software
  genérico;
- a avaliação é sobre a capacidade de **atender a uma necessidade específica de
  um usuário**;
- exemplos citados pelo professor: compra de freezer para frigoríficos, carro
  para frota, notebook para empresa.

O professor não confirmou explicitamente que uma adaptação será aceita; isso
precisa ser validado antes de investir na implementação.

## 2. Decisões já tomadas

- **Repo novo:** `SAD_02` (este repositório), criado vazio em
  2026-11-26. O repo `saaty` fica como base/protótipo do motor AHP.
- **Não começar do zero:** reaproveitar o motor AHP, os testes, a persistência e
  a acessibilidade do `saaty`.
- **Recorte específico:** um domínio real do Seridó, com usuário e decisão
  concretos.
- **Local:** Caicó/RN.
- **Abordagem AHP:** AHP clássico com dados de apoio; TCO/custos e cenários
  como apoio à decisão; sensibilidade nos pesos dos critérios.
- **Sem build e sem dependências de runtime**, seguindo o padrão do projeto
  anterior; testes com `node:test`.

## 3. Histórico da exploração

1. **Frota de táxi em Campinas/SP** — desenhada com 4 critérios (TCO,
   confiabilidade/rede, segurança, conforto), 3 veículos (Corolla, Onix Plus,
   Cronos) e cenário de 30 táxis. Foi descartada quando o usuário preferiu um
   tema regional do Seridó.
2. **Tema regional do Seridó** — o usuário escolheu inicialmente **caprino de
   corte**, com as raças Boer, Canindé e Moxotó.
3. **Inclinação posterior** — o usuário comentou que "talvez fosse melhor um
   sistema mais industrial". O recorte de frigorífico/freezer industrial foi
   proposto como mais objetivo, mas **não foi confirmado**. A decisão final
   entre caprino de corte e frigorífico/freezer continua em aberto.

## 4. Candidato A — Caprino de corte (Caicó/RN)

**Usuário:** pequeno/médio produtor de caprinos de corte em Caicó/RN.

**Decisão:** qual raça introduzir/expandir para produção de carne.

**Alternativas propostas:** Boer, Canindé, Moxotó.

**Critérios propostos (4):**

1. **Desempenho produtivo** — ganho de peso, peso ao abate, rendimento de
   carcaça.
2. **Adaptação e resistência** — tolerância ao semiárido, resistência a
   parasitas, rusticidade.
3. **Custo total de implantação/manutenção** — aquisição, alimentação,
   sanidade e instalações em um horizonte de 3 anos.
4. **Mercado e valor comercial** — demanda regional, preço por kg e facilidade
   de escoamento.

**Perfil da propriedade (a definir):** tamanho do rebanho, área, água disponível,
sistema de produção, horizonte, orçamento e mercado-alvo.

**Resultado esperado:** ranking das raças, custo por animal/kg, recomendação,
premissas e sensibilidade a preço de alimentação e mercado.

**Dados/fontes a pesquisar:** Embrapa Caprinos e Ovinos, EMPARN/RN, UFERSA,
IFRN, artigos sobre desempenho de Boer/Canindé/Moxotó no semiárido, produtores e
cooperativas locais.

## 5. Candidato B — Frigorífico/freezer industrial (Caicó/RN)

**Usuário:** gestor/proprietário de um frigorífico de caprinos/ovinos em
Caicó/RN.

**Decisão:** qual equipamento de congelamento adquirir para ampliar a capacidade
(túnel, câmara ou outro sistema; modelos/fornecedores a definir).

**Critérios propostos (rascunho):**

1. Capacidade e desempenho de congelamento.
2. Consumo de energia.
3. Manutenção e rede de serviço.
4. Custo de aquisição.
5. Conformidade sanitária e área/instalação.

**Abordagem:** TCO de aquisição + energia + manutenção em um horizonte de
vários anos; cenários de volume de produção e preço de energia; sensibilidade
nos pesos dos critérios.

**Por que foi recomendado:** dados técnicos objetivos, TCO e sensibilidade
naturais, cadeia regional de caprinos/ovinos e possibilidade de validação com um
frigorífico local. O recorte ainda precisa ser confirmado.

**Dados/fontes a pesquisar:** fornecedores e orçamentos, Sebrae, MAPA/ANVISA,
frigoríficos da região, referências técnicas de congelamento industrial.

## 6. Decisões em aberto

1. **Domínio final:** caprino de corte ou frigorífico/freezer industrial.
2. **Aprovação do professor** para o novo recorte, antes de implementar.
3. **Dados e fontes:** valores, premissas e validação com o setor.
4. **Perfil base:** rebanho/propriedade ou volume/energia do frigorífico.
5. **Nome do produto** e identidade visual.
6. **Prazo da disciplina** e profundidade compatível.
7. **Validação:** acesso a um produtor, frigorífico, cooperativa ou EMATER.

## 7. Base técnica reaproveitável

Repo: https://github.com/EmiyaKiritsugu3/saaty

- `ahp.js`: `calcAHP`, `RI`, escala, fila de perguntas, ciclos, correção.
- `test/ahp.test.js`: 24 testes passando no projeto original.
- Persistência em `localStorage`, acessibilidade e foco pós-render.
- PR #2 verde, com correções de integridade e persistência.
- Branch com as correções: `fix/integridade-respostas`.
- Commits relevantes: `01c9d4b`, `b5cfdfd`, `ae83d44`, `5c4b6e1`, `07bf6ce`.

**Antes de copiar o motor:** mergear a PR #2 ou copiar a branch
`fix/integridade-respostas`. Não copiar o exemplo genérico de "escolher o
melhor carro"; ele será substituído pelo domínio escolhido.

## 8. Arquitetura sugerida

```
SAD_02/
├── index.html        # fluxo específico do domínio
├── ahp.js            # motor AHP puro + testes reaproveitados
├── dominio.js        # critérios, alternativas, dados, custos e cenários
├── style.css
├── test/
│   ├── ahp.test.js
│   └── dominio.test.js
├── docs/
│   ├── contexto-e-decisoes.md
│   ├── fontes-e-premissas.md
│   └── proposta-professor.md
└── README.md
```

Sem build e sem dependências de runtime; testes com `node:test`.

## 9. Próximos passos ao retomar

1. Decidir o domínio final (caprino de corte ou frigorífico/freezer).
2. Confirmar o recorte com o professor e pedir um "sim" explícito.
3. Escrever a spec do SAD (problema, usuário, decisão, critérios, alternativas,
   dados, TCO/cenários, sensibilidade, telas e testes).
4. Criar o plano de implementação.
5. Copiar o motor AHP e implementar o domínio.
6. Validar com alguém do setor e preparar a apresentação.

## 10. Rascunho de proposta para o professor

> Professor, entendi a crítica de que a proposta estava genérica. Estou
> reposicionando o trabalho como um SAD específico para [domínio] em Caicó/RN,
> com o usuário [perfil], a decisão [decisão] e critérios como [critérios]. O
> motor AHP continua, mas a interface, os dados e o vocabulário passam a ser
> desse domínio. O sistema entrega [resultado esperado]. Essa proposta atende ao
> recorte que a professora Karliane pediu? Posso seguir por esse caminho?

Preencher os colchetes quando o domínio for confirmado.

## 11. Atualização 2026-11-26 — MVP implementado

O projeto foi reposicionado e implementado como **SAD de planejamento semanal
de abate e estoque** para um frigorífico de caprinos/ovinos em Caicó/RN. O
motor AHP foi reaproveitado como **módulo de seleção de fornecedores**, com gate
sanitário.

**O que mudou em relação ao plano original:**

- O domínio não é mais a compra de um freezer; é a **decisão recorrente** de
  quanto abater, estocar e comprar a cada semana.
- O AHP deixou de ser o produto inteiro e passou a ser um módulo de decisão de
  compra, dentro de um fluxo maior (previsão → estoque → plano → fornecedor).
- A postura é de **camada de decisão** complementar ao ERP/planilha, não de ERP.
  A auditoria de mercado está em `docs/auditoria-mercado.md`.

**Entregue:**

- Aplicação estática (`index.html`) com painel, previsão, plano, fornecedores e
  dados.
- 38 testes com `node:test`.
- Slides (`slides.html`, `slides.pdf`) e roteiro (`slides/roteiro.md`).
- Dados públicos documentados + série de demanda ilustrativa + importação CSV.
- Spec, plano e auditoria em `docs/`.

**Pendências:**

1. Validar o recorte e a demo com o professor.
2. Importar dados reais de um frigorífico e comparar o plano com a decisão do
   gestor.
3. Evoluir para mix de cortes/LP e integração com ERP.
