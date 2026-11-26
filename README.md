# SAD_02 — SAD para uma decisão específica no Seridó (Caicó/RN)

> **Status:** em definição. Nenhum código de aplicação foi implementado ainda.
> **Aguardando:** definição final do domínio e confirmação do professor.

## Contexto

O projeto anterior (`saaty`) era um assistente AHP genérico: o usuário podia
decidir qualquer coisa, com critérios e opções livres. O professor considerou a
proposta **genérica demais** para a disciplina: o entregável precisa ser um
**SAD para um problema específico**, com usuário, decisão, critérios e
alternativas de um domínio real.

Esta nova fase parte desse feedback. A base técnica do AHP é reaproveitável; o
que muda é o recorte do produto.

## Domínio em avaliação

**Local:** Caicó/RN, região do Seridó.

Dois recortes foram discutidos:

- **A. Caprino de corte** — escolha de raça (Boer, Canindé, Moxotó) para
  produção de carne em uma propriedade de Caicó/RN.
- **B. Frigorífico/freezer industrial** — escolha de um equipamento de
  congelamento para um frigorífico de caprinos/ovinos da região.

A última inclinação do usuário foi por um **sistema mais industrial**
(recorte B), mas a decisão final ainda não foi tomada.

## Base técnica reaproveitável

O repo [saaty](https://github.com/EmiyaKiritsugu3/saaty) contém:

- motor AHP (`calcAHP`, matrizes, CR, pesos);
- fila de perguntas, detecção de ciclos e modo correção;
- persistência em `localStorage`;
- acessibilidade e testes (`node:test`, 24/24 passando);
- PR #2 verde, com correções de integridade de respostas.

Antes de copiar o motor para este repo, é preciso mergear a PR #2 ou copiar a
branch `fix/integridade-respostas`.

## Próximos passos

1. Fechar o domínio: caprino de corte **ou** frigorífico/freezer industrial.
2. Confirmar o recorte com o professor antes de implementar.
3. Escrever a spec do SAD neste repo.
4. Criar o plano de implementação e executar.
5. Validar com alguém do domínio (produtor, frigorífico ou cooperativa).

Ver [docs/contexto-e-decisoes.md](docs/contexto-e-decisoes.md) para o histórico
completo, critérios, alternativas e decisões em aberto.
