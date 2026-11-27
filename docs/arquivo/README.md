# Legado — versão frigorífico

Esta pasta guarda a referência da versão anterior do projeto, o **SeridóFrigo** — um SAD de planejamento semanal de abate, estoque e compra de animais para um frigorífico de caprinos e ovinos em Caicó/RN.

O projeto foi substituído pelo **Mercadinho Seridó** porque o domínio do frigorífico exigia modelar carcaça, miúdos, cortes e o equilíbrio do animal inteiro. O mercadinho mantém a mesma ideia de SAD (previsão + decisão de compra) com muito menos complexidade.

## Onde está

- **Tag:** `legacy-frigorifico-v1`
- **Branch:** `legacy/frigorifico`
- **Commit:** `c875f81` (última versão publicada antes do pivô)

O código não fica na `main` e não é publicado junto com o mercadinho. Serve como histórico e referência para a apresentação da evolução do projeto.

## Como rodar

```bash
git worktree add /tmp/frigorifico-legado legacy-frigorifico-v1
cd /tmp/frigorifico-legado
python3 -m http.server 8000
```

Abra <http://localhost:8000>. O app é estático, sem build e sem dependências de runtime.

## O que a versão legado contém

- Painel, previsão, plano semanal, fornecedores (AHP) e dados/premissas.
- Série de demanda ilustrativa e dados públicos do IBGE/Embrapa.
- 57 testes automatizados (`npm test`).
- Slides em `slides.html` e `slides.pdf`.

## Documentos arquivados

- `auditoria-mercado.md` — análise de mercado da versão frigorífico.
- `contexto-e-decisoes.md` — contexto e decisões do projeto anterior.
- `fontes-e-premissas.md` — fontes públicas e premissas do frigorífico.
- `2026-11-26-sad-frigorifico-serido-design.md` — spec anterior.
- `2026-11-26-sad-frigorifico-serido-mvp.md` — plano anterior.

## Por que não foi mantida como projeto separado

Para a disciplina, uma tag e uma branch preservam o código e a história sem duplicar repositório, Pages e manutenção. Se o frigorífico precisar voltar a ficar **publicado** em outra URL, aí sim vale criar um repositório separado a partir desta tag.
