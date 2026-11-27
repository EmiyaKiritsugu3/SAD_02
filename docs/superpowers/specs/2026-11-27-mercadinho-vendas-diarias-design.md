# Mercadinho Seridó — Vendas diárias e visões por período — Design

**Data:** 2026-11-27
**Status:** aprovado para implementação
**Substitui:** a parte de vendas semanais da spec `2026-11-27-mercadinho-serido-design.md`.

## 1. Contexto

O app já entrega a decisão semanal de compra. Para permitir uma futura integração com o caixa/PDV e consultas por dia, semana, mês e ano, as vendas passam a ser armazenadas **por dia**. A decisão continua **semanal**: o seletor de período muda apenas a visualização.

**Decisão:** quanto comprar de cada produto na próxima semana.
**Fonte de dados:** vendas diárias por produto.
**Visões:** dia, semana, mês e ano.
**Fora do escopo:** integração real com PDV, importação automática, multiusuário e vendas por hora.

## 2. Modelo de dados (versão 2)

```js
{
  versao: 2,
  produtos: [
    { id, nome, unidade, custo, preco, estoqueAtual, estoqueMinimo, criadoEm }
  ],
  dias: [
    { data: "2026-11-23", valores: { "p-arroz": 12, "p-feijao": 20 } }
  ],
  exemplo: true
}
```

- Um registro por dia; a data é canônica (`YYYY-MM-DD`), sem exigir segunda-feira.
- Quantidades ausentes valem zero; o dia salvo precisa ter pelo menos um valor positivo.
- `localStorage`: chave nova `mercadinho-serido:v2`; a chave antiga `mercadinho-serido:v1` é lida apenas para migração.
- Estado antigo **não-exemplo**: cada semana é distribuída em 7 dias por pesos determinísticos, preservando o total semanal exato.
- Estado antigo **exemplo**: é descartado e o exemplo diário novo é gerado (evita datas futuras e dados ilustrativos velhos).
- Estado v2 inválido: cai no exemplo com aviso.
- Storage bloqueado/indisponível: cai no exemplo; salvar retorna `false` e a interface mostra o banner persistente.

## 3. Agregações

- **Série semanal (para previsão):** agrupa os dias pela segunda-feira da semana; soma os valores por produto. Começa na primeira semana com venda, termina na última semana com registro e preenche lacunas com zero.
- **Resumo por período:** `resumoPeriodo(dias, produtos, periodo, referencia)`:
  - `dia`: a data de referência;
  - `semana`: segunda a domingo da semana da referência;
  - `mes`: primeiro ao último dia do mês;
  - `ano`: 1º de janeiro a 31 de dezembro.
  - Retorna `{ inicio, fim, porProduto: { id: { quantidade, receita } }, totalReceita }`.
- A previsão e a compra usam **sempre** a série semanal; o período não altera a decisão.

## 4. Interface

### Vendas

- **Lançamento do dia:** data (dia), botões anterior/próximo/hoje, grade com os produtos, salvar e excluir o dia.
- **Resumo do período:** seletor Dia / Semana / Mês / Ano; intervalo em texto; tabela por produto com quantidade e receita; total.
- O dia selecionado alimenta o lançamento; o período filtra apenas o resumo.
- Nota: “A previsão e a compra usam a semana; o período é só para consulta.”
- Estados: dia registrado/novo dia; sem produtos; sem vendas.

### Compras

- A lista, o gráfico 12+4, o backtest e a regra de compra continuam iguais.
- A série vem da agregação semanal dos dias.
- O aviso de atraso continua baseado na última semana registrada.

### Produtos

- Remover um produto apaga os valores dele de todos os dias; dias que ficarem vazios são removidos.

## 5. Exemplo e migração

- O exemplo mantém as 12 semanas e os mesmos totais semanais da versão anterior.
- Cada semana é distribuída em dias com pesos determinísticos; a semana corrente é distribuída apenas até a data de referência (sem vendas futuras).
- A soma semanal é idêntica à série antiga, então as métricas e os números dos slides permanecem.
- A migração de dados não-exemplo preserva o total de cada semana; o app avisa que os dados foram convertidos para o formato diário.

## 6. Testes

- Estado v2: exemplo com dias, sem datas futuras; validação de data canônica, dia único, valores válidos; migração v1→v2; storage bloqueado.
- Vendas: salvar/atualizar/excluir dia; remover produto; série semanal com lacunas; resumo dia/semana/mês/ano; última semana/próxima; atraso.
- Previsão/compra: manter os testes atuais; a série semanal do exemplo deve reproduzir os mesmos valores semanais.
- Smoke: lançar o dia, alternar período, conferir o resumo, voltar para Compras, mobile 360 px, slides.

## 7. Slides, docs e deploy

- Atualizar README, slides e roteiro: “vendas diárias, visão semanal/mensal/anual, decisão semanal, pronto para integrar ao caixa”.
- `docs/verificacao.md` com o novo smoke.
- Novo PR, revisão, merge e deploy no Pages.
- A versão frigorífico permanece no legado.

## 8. Critérios de aceite

1. O dono lança as vendas de um dia e vê o resumo por dia/semana/mês/ano.
2. A previsão 12+4 e a compra continuam semanais e com os mesmos números do exemplo.
3. Dados antigos são migrados sem perder o total semanal; o exemplo não tem datas futuras.
4. 60+ testes e smoke sem erros; mobile sem overflow.
5. O site publicado mostra a nova aba Vendas e os slides atualizados.
