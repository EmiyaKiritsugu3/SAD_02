# Mercadinho Seridó — SAD de compra semanal — Design

**Data:** 2026-11-27
**Status:** MVP aprovado para implementação
**Substitui:** a versão frigorífico (SAD de abate/estoque), que permanece no histórico do Git.

## 1. Contexto e objetivo

O dono de um mercadinho de bairro em Caicó/RN decide toda semana quanto comprar de cada produto. Hoje ele faz isso por memória ou caderno: compra demais e imobiliza capital/perde validade, ou compra de menos e perde venda.

O **Mercadinho Seridó** é uma camada de decisão semanal, não um PDV nem um ERP. O dono continua usando o caixa/ERP para as transações; o app usa o histórico de vendas para prever a próxima semana e sugerir a compra.

**Decisão:** quanto comprar de cada produto para a próxima semana.

**Usuário:** dono/gestor do mercadinho, uma pessoa, uma rotina semanal.

**Sucesso:** cadastrar produtos e vendas semanais e obter uma lista de compras com quantidade e custo estimado, com previsão explicável, em poucos minutos.

## 2. Escopo

### Dentro

- Cadastro de produtos com nome, unidade, custo, preço, estoque atual e estoque mínimo. O custo é usado na estimativa da compra; o preço, na receita mensal. O estoque mínimo pode ser zero.
- Lançamento de vendas por semana, com uma linha por produto.
- Resumo mensal de vendas e receita.
- Previsão automática por produto (média móvel, suavização exponencial ou regressão).
- Lista de compras sugerida para a semana seguinte.
- Gráfico de 12 semanas + 4 previstas por produto.
- Dados de exemplo rotulados, `localStorage`, carregar exemplo e limpar dados.
- Três abas: **Compras**, **Vendas**, **Produtos**.
- Slides, README e deploy no GitHub Pages.

### Fora

- PDV, emissão fiscal, código de barras, balança.
- Fornecedores, cotações, AHP, negociação.
- Carcaça, miúdos, cortes e o domínio de frigorífico.
- Cenários, otimização, orçamento, lead time, validade e pedido de compra.
- CSV, dados públicos, multiusuário e nuvem.
- Controle automático de estoque: o estoque é atualizado manualmente pelo dono.

O que ficou fora pode virar trabalho futuro; o MVP precisa ser simples e defensável.

## 3. Telas e fluxos

### 3.1 Compras (tela inicial)

- Cabeçalho: “Compra da semana” + data da semana prevista (semana seguinte à última venda registrada).
- Resumo: número de produtos, custo total estimado e produtos sem dados suficientes.
- Tabela: produto, unidade, previsão da próxima semana, estoque atual, estoque mínimo, quantidade sugerida e custo estimado.
- Busca/filtro por nome.
- Linhas sem previsão mostram “sem dados” e não entram no total.
- Linhas com necessidade zero mostram “estoque cobre”.
- Ao selecionar um produto, exibe o gráfico 12 + 4 e o bloco recolhido “Como calculamos” (método, MAE/MAPE, fórmula da compra).
- Rodapé: custo total estimado da compra.
- Estado vazio: “Cadastre produtos e vendas para ver a compra sugerida”, com atalhos para Vendas e Produtos.
- Aviso se a última venda estiver há mais de 2 semanas: a compra é para a semana seguinte à última venda registrada, não para a semana corrente.

### 3.2 Vendas

- Seletor de semana (data) com botões anterior/próxima.
- A data é normalizada para a segunda-feira da semana; uma semana só pode ter um registro.
- Grade com uma linha por produto e um campo de quantidade vendida; a unidade aparece ao lado.
- Salvar cria ou atualiza a semana selecionada; os valores existentes são carregados ao trocar de semana.
- Excluir semana com confirmação.
- Alternância “Ver por mês”: seletor de mês, tabela por produto com quantidade e receita estimada, e totais.
- Estado vazio sem produtos: atalho para Produtos.
- Validação: quantidade vazia vale zero; negativos e valores não numéricos são rejeitados; semana com todos os valores zero não é salva.

### 3.3 Produtos

- Lista de produtos com nome, unidade, custo, preço, estoque atual e estoque mínimo.
- Adicionar produto: nome, unidade (`un`, `kg`, `L`), custo, preço, estoque atual, estoque mínimo.
- Editar produto; o ID e o histórico de vendas são preservados.
- Remover produto com confirmação; as vendas daquele produto são apagadas de todas as semanas. Ao remover, pelo menos um produto deve permanecer; “Limpar dados” pode deixar a lista vazia.
- “Carregar exemplo” restaura o conjunto de exemplo; “Limpar dados” apaga produtos e vendas e volta ao estado vazio.
- Nome único (comparação sem diferenciar maiúsculas/minúsculas).

### 3.4 Navegação e responsividade

- Barra superior com o nome do app e as três abas.
- No celular, as abas viram uma barra horizontal; tabelas largas rolam horizontalmente; a grade de vendas continua utilizável.
- Mesma identidade visual da versão atual (terracota/oliva, Fraunces/Archivo), com o nome provisório **Mercadinho Seridó** e monograma **MS**.

## 4. Modelo de dados

### 4.1 Produto

```js
{
  id: "p-arroz-5kg-1732...", // slug único; produtos de exemplo têm IDs fixos
  nome: "Arroz 5 kg",
  unidade: "un",             // "un" | "kg" | "L"
  custo: 22.5,               // >= 0
  preco: 27.9,               // >= 0
  estoqueAtual: 8,           // >= 0
  estoqueMinimo: 4,          // >= 0
  criadoEm: "2026-09-01"     // ISO
}
```

### 4.2 Semana de vendas

```js
{
  data: "2026-11-23",        // segunda-feira da semana, ISO
  valores: {                 // productId -> quantidade vendida
    "p-arroz-5kg-...": 12,
    "p-feijao-1kg-...": 20
  }
}
```

- Uma semana por data; salvar a mesma semana atualiza os valores.
- Quantidades ausentes valem zero.
- A série de um produto começa na primeira semana com valor maior que zero e vai até a última semana registrada; semanas intermediárias ausentes valem zero.

### 4.3 Estado persistido

```js
{
  versao: 1,
  produtos: [ ... ],
  semanas: [ ... ], // ordenadas por data
  exemplo: true     // true enquanto o conjunto de exemplo não for editado
}
```

- Chave do `localStorage`: `mercadinho-serido:v1`.
- Tudo é processado no navegador; nenhum dado é enviado a servidor.
- Ao carregar, validar a estrutura; se estiver corrompida, carregar o exemplo e avisar.
- Qualquer edição de produto ou venda marca `exemplo: false`.
- “Carregar exemplo” recria os dados de exemplo e marca `exemplo: true`.
- “Limpar dados” apaga produtos e vendas e deixa o app vazio.

## 5. Previsão e compra

### 5.1 Previsão

- Modelos: média móvel (janela 4), suavização exponencial (alfa 0,3) e regressão linear.
- Menos de 4 semanas: sem previsão.
- De 4 a 7 semanas: média móvel das semanas disponíveis.
- A partir de 8 semanas: backtest nas últimas 4 semanas e escolha automática do menor MAE.
- Horizonte de 4 semanas.
- O gráfico mostra as últimas 12 semanas registradas + as 4 previstas (ou todas as disponíveis, se houver menos de 12), com o eixo Y começando em zero.
- “Como calculamos” mostra método, janela/alfa, MAE, MAPE e os valores do backtest.
- A previsão é sempre para a semana seguinte à última semana registrada.

### 5.2 Compra sugerida

Para cada produto com previsão:

```text
necessidade = max(0, previsão da próxima semana + estoque mínimo − estoque atual)
sugestão = unidade "un" ? ceil(necessidade) : arredondar(necessidade, 1)
custo estimado = sugestão × custo unitário
```

- Sem previsão: não sugerir quantidade; mostrar “sem dados”.
- `necessidade = 0`: mostrar “estoque cobre”.
- O total da compra soma apenas os produtos com sugestão.
- Não há limite de orçamento nem lead time no MVP.
- O dono pode ajustar a quantidade manualmente na hora da compra; o app é uma sugestão.

## 6. Dados de exemplo

- 10 produtos de mercadinho, incluindo itens em `un` e em `kg`.
- 12 semanas de vendas, terminando na última segunda-feira completa antes da data atual.
- Valores determinísticos, com sazonalidade leve e ruído fixo; rotulados como “dados de exemplo”.
- Produtos sugeridos: arroz 5 kg, feijão 1 kg, macarrão 500 g, açúcar 1 kg, café 500 g, óleo 900 ml, leite 1 L, pão, ovos (dúzia) e banana (kg).
- O exemplo existe para a demonstração; qualquer edição remove o selo de exemplo.

## 7. Arquivos e componentes

```text
index.html
style.css
js/
  estado.js      # localStorage, validação, exemplo, limpar/carregar
  produtos.js    # cadastro, validação, IDs, remoção
  vendas.js      # normalização de semana, série, agregação mensal
  previsao.js    # modelos e backtest (reaproveitado)
  compras.js     # necessidade, arredondamento, custo, totais
  charts.js      # gráfico de linha 12 + 4 (reaproveitado)
  app.js         # renderização e eventos das 3 abas
test/
  produtos.test.js
  vendas.test.js
  previsao.test.js
  compras.test.js
  estado.test.js
```

Remover do MVP: `ahp.js`, `fornecedores.js`, `plano.js`, `estoque.js`, `csv.js`, `importacao.js` e `dados.js` (substituído pelo exemplo em `estado.js`). Os arquivos antigos permanecem no histórico do Git.

## 8. Erros e estados vazios

- `localStorage` inválido: carregar exemplo e mostrar aviso.
- Sem produtos: estados vazios em Compras e Vendas com atalho para Produtos.
- Sem vendas: Compras mostra “sem dados” por produto; o resumo indica quantos produtos precisam de histórico.
- Semana sem nenhum valor: não salvar; mensagem “registre pelo menos um produto”.
- Quantidade negativa ou inválida: bloquear o salvamento e destacar o campo.
- Produto duplicado: bloquear com mensagem.
- Remover o último produto: bloquear.
- Remover produto com vendas: confirmação explícita de que o histórico será apagado.
- Falha de cálculo: manter a tela anterior e mostrar um aviso; não quebrar a navegação.

## 9. Testes

- **produtos:** validação de campos, nome único, ID estável ao renomear, remoção do último produto, remoção com histórico.
- **vendas:** normalização para segunda-feira, atualização da mesma semana, série com lacunas, agregação mensal, receita.
- **previsao:** manter os testes atuais de média móvel, SES, regressão, backtest, `serieAte` e ausência de valores negativos.
- **compras:** fórmula, arredondamento por unidade, estoque mínimo, estoque que cobre, produto sem previsão, custo total.
- **estado:** carga válida, carga corrompida, exemplo, limpar, marcar/desmarcar exemplo.
- **smoke test (Playwright):** abrir o exemplo, ver a lista de compras, cadastrar um produto, lançar uma semana, conferir a atualização da previsão/compra, alternar o resumo mensal e verificar o mobile sem overflow.

Meta: 25–30 testes passando.

## 10. Slides, documentação e deploy

- Reescrever os slides para o mercadinho: problema (falta/sobra), decisão, modelo, demonstração, resultados e limites. Entre 8 e 10 páginas.
- Atualizar `slides.html`, `slides.pdf` e `slides/roteiro.md`; novo nome e monograma.
- Atualizar o README: decisão, telas, regra da compra, dados de exemplo, testes e limitações.
- Remover ou arquivar a documentação do frigorífico que não se aplica ao MVP: mover `docs/auditoria-mercado.md`, `docs/contexto-e-decisoes.md`, `docs/fontes-e-premissas.md`, a spec e o plano antigos para `docs/arquivo/` e remover as referências do README.
- Manter o workflow do GitHub Pages; publicar após o merge na `main` e verificar a URL.
- O app continua estático, sem build e sem dependências de runtime.

### 10.1 Legado do frigorífico

- A versão frigorífico fica preservada na tag `legacy-frigorifico-v1` e na branch `legacy/frigorifico`, no commit `c875f81`.
- Ela não é publicada junto com o mercadinho; serve como histórico e referência da evolução do projeto.
- `docs/arquivo/README.md` explica o motivo do pivô e como rodar o legado.
- Se o frigorífico precisar voltar a ficar publicado em outra URL, criar um repositório separado a partir dessa tag.

## 11. Critérios de aceite

1. O dono cadastra produtos e lança vendas semanais sem instrução técnica.
2. A tela Compras mostra uma sugestão por produto, com quantidade e custo estimado.
3. O gráfico mostra 12 semanas + 4 previstas e o “Como calculamos” explica o método.
4. O resumo mensal soma as semanas e mostra receita.
5. O app funciona em 360 px e 1366 px, sem overflow e sem erros de console.
6. Os testes passam e o site publicado abre com o exemplo.
7. Os slides contam a mesma história do app, sem mencionar o frigorífico como escopo atual.

## 12. Trabalho futuro

- Lead time e ponto de pedido.
- Validade/perecíveis e alerta de vencimento.
- Orçamento semanal e priorização de compra.
- Comparação de fornecedores e preços.
- Exportação de pedido de compra/CSV.
- Integração com PDV/ERP.
- Multiusuário e nuvem.
- A versão frigorífico (carcaça, miúdos, cortes e AHP) permanece no histórico do Git como projeto anterior.
