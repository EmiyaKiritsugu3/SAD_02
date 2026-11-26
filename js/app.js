// SeridóFrigo — estado, cálculo e interface.
const App = (() => {
  const CHAVE = "seridofrigo:v1";
  const exemploAHP = Fornecedores.restaurarExemplo();

  const state = {
    aba: "painel",
    semanaAtual: 52,
    dados: DADOS.clonarDados(),
    metodo: "auto",
    parametros: { ...DADOS.PARAMETROS },
    planos: {},
    previsoes: {},
    consolidado: null,
    ahp: {
      matrizCriterios: exemploAHP.matrizCriterios,
      matrizesAlternativas: exemploAHP.matrizesAlternativas,
    },
    ahpResultado: null,
    cenario: { demandaPct: 0, precoPct: 0, capacidadePct: 0 },
    planoAvancado: false,
    erroCalculo: null,
    mensagem: null,
  };

  const nfNum = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
  const nfDec = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
  const nfBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const fmtNum = (n, d = 0) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: d }).format(Number(n) || 0);
  const fmtBRL = (n) => nfBRL.format(Number(n) || 0);
  const fmtKg = (n) => `${nfNum.format(Number(n) || 0)} kg`;
  const fmtPct = (n) => `${nfDec.format((Number(n) || 0) * 100)}%`;
  const escapeHtml = Charts.escapeHtml;

  const TITULOS = {
    painel: ["Painel", "A decisão da semana em uma tela."],
    previsao: ["Previsão de demanda", "Histórico, métodos e erro de previsão."],
    plano: ["Plano semanal", "Quanto abater, estocar e comprar."],
    fornecedores: ["Fornecedores", "Ranking AHP com gate sanitário."],
    dados: ["Dados e premissas", "Fontes públicas, estimativas e importação CSV."],
  };

  function toast(mensagem, erro = false) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = mensagem;
    el.classList.toggle("erro", erro);
    el.hidden = false;
    window.clearTimeout(toast._t);
    toast._t = window.setTimeout(() => { el.hidden = true; }, 3600);
  }

  function salvar() {
    try {
      localStorage.setItem(CHAVE, JSON.stringify({
        dados: state.dados,
        metodo: state.metodo,
        parametros: state.parametros,
        cenario: state.cenario,
        planoAvancado: state.planoAvancado,
        ahp: state.ahp,
      }));
    } catch (_) { /* localStorage indisponível */ }
  }

  function carregar() {
    try {
      const raw = localStorage.getItem(CHAVE);
      if (!raw) return;
      const salvo = JSON.parse(raw);
      if (salvo.dados && DADOS.dadosValidos(salvo.dados)) {
        state.dados = { ...DADOS.clonarDados(), ...salvo.dados };
        if (!Array.isArray(state.dados.DEMANDA.semanas)) {
          state.dados.DEMANDA.semanas = state.dados.DEMANDA.caprino.map((_, i) => i + 1);
        }
      }
      if (["auto", "mediaMovel", "ses", "regressao"].includes(salvo.metodo)) state.metodo = salvo.metodo;
      if (salvo.parametros) state.parametros = { ...DADOS.PARAMETROS, ...salvo.parametros };
      if (salvo.cenario) {
        state.cenario = {
          demandaPct: Number.isFinite(Number(salvo.cenario.demandaPct)) ? Number(salvo.cenario.demandaPct) : 0,
          precoPct: Number.isFinite(Number(salvo.cenario.precoPct)) ? Number(salvo.cenario.precoPct) : 0,
          capacidadePct: Number.isFinite(Number(salvo.cenario.capacidadePct)) ? Number(salvo.cenario.capacidadePct) : 0,
        };
      }
      if (typeof salvo.planoAvancado === "boolean") state.planoAvancado = salvo.planoAvancado;
      const mAlt = salvo.ahp?.matrizesAlternativas;
      if (salvo.ahp && DADOS.matrizValida(salvo.ahp.matrizCriterios, 4) &&
          mAlt && Object.values(mAlt).length === 4 &&
          Object.values(mAlt).every((M) => DADOS.matrizValida(M, 3))) {
        state.ahp = salvo.ahp;
      }
      const semanas = state.dados.DEMANDA.semanas || [];
      if (semanas.length > 0 && !semanas.includes(state.semanaAtual)) {
        state.semanaAtual = semanas[semanas.length - 1];
      }
    } catch (_) { /* estado corrompido: usa defaults */ }
  }

  function metodoEscolhido(serie) {
    if (state.metodo === "auto") return Previsao.escolherMelhor(serie, 4);
    const params = state.metodo === "ses"
      ? { alfa: Number(state.parametros.alfa) || 0.3 }
      : state.metodo === "mediaMovel" ? { janela: Number(state.parametros.janela) || 4 } : {};
    return { metodo: state.metodo, params, metricas: Previsao.backtest(serie, state.metodo, params, 4) };
  }

  function inputPlano(produto) {
    const prev = state.previsoes[produto.id];
    const seguranca = produto.estoqueSegurancaKgOverride !== undefined
      ? Math.max(0, Number(produto.estoqueSegurancaKgOverride) || 0)
      : (prev?.seguranca ?? 0);
    return {
      produto,
      previsaoSemana: prev?.prev4?.[0] || 0,
      estoqueAtualKg: produto.estoqueKg,
      estoqueSegurancaKg: seguranca,
      coberturaSemanas: produto.coberturaSemanas,
      capacidadeAbateAnimais: produto.capacidadeAbateAnimais,
      capacidadeCamaraKg: produto.capacidadeCamaraKg,
      estoqueMinKg: produto.estoqueMinKg,
      precoVendaKg: produto.precoVendaKg,
      custoCompraKg: produto.custoCompraKg,
      custoAbateKg: produto.custoAbateKg,
      animaisVivos: 0,
    };
  }

  function calcularTudo() {
    try {
      state.planos = {};
      state.previsoes = {};
      const semanas = state.dados.DEMANDA.semanas || [];
      if (semanas.length > 0 && !semanas.includes(state.semanaAtual)) {
        state.semanaAtual = semanas[semanas.length - 1];
      }
      for (const produto of state.dados.PRODUTOS) {
        const serie = state.dados.DEMANDA[produto.id] || [];
        const corte = Previsao.serieAte(serie, semanas, state.semanaAtual);
        const serieUsada = corte.serie;
        const semanasUsadas = corte.semanas;
        const escolha = metodoEscolhido(serieUsada);
        const prev4 = Previsao.prever(serieUsada, escolha.metodo, escolha.params, 4);
        const seguranca = produto.estoqueSegurancaKgOverride !== undefined
          ? Math.max(0, Number(produto.estoqueSegurancaKgOverride) || 0)
          : Estoque.estoqueSeguranca(serieUsada, state.parametros.z, state.parametros.leadTimeSemanas);
        const segurancaArredondada = Math.round(seguranca * 10) / 10;
        state.previsoes[produto.id] = {
          escolha, prev4, seguranca: segurancaArredondada,
          serie: serieUsada, semanas: semanasUsadas,
        };
        state.planos[produto.id] = Plano.calcularPlano(inputPlano(produto));
      }
      state.consolidado = Plano.consolidar(Object.values(state.planos));
      state.ahpResultado = Fornecedores.avaliar({ ...state.ahp, alternativas: state.dados.FORNECEDORES });
      state.erroCalculo = null;
    } catch (err) {
      state.erroCalculo = err.message || "Falha no cálculo.";
    }
  }

  function metodoLabel(metodo) {
    const m = metodo || state.previsoes.caprino?.escolha?.metodo || state.metodo;
    return {
      auto: "Automático",
      mediaMovel: "Média móvel",
      ses: "Suavização exponencial",
      regressao: "Regressão linear",
    }[m] || m;
  }

  function alertaPrincipal(planos) {
    const capacidadeTotal = planos.reduce((s, p) => s + p.capacidadeAbateAnimais, 0);
    const desejadosTotal = planos.reduce((s, p) => s + p.animaisDesejados, 0);
    const excesso = Math.max(0, desejadosTotal - capacidadeTotal);
    if (excesso > 0.001) {
      return `Capacidade total insuficiente: ${Math.ceil(excesso)} animais acima do limite.`;
    }
    const primeiro = planos.flatMap((p) => p.alertas)[0];
    return primeiro ? primeiro.mensagem : "Sem alertas";
  }

  function renderPainel() {
    const produtos = state.dados.PRODUTOS;
    const planos = produtos.map((p) => state.planos[p.id]).filter(Boolean);
    const c = state.consolidado || {};
    const ranking = state.ahpResultado?.ranking || [];
    const top = ranking[0];

    const estoqueTotal = produtos.reduce((s, p) => s + (Number(p.estoqueKg) || 0), 0);
    const metaTotal = planos.reduce((s, p) => s + p.estoqueMetaKg, 0);
    const previsaoTotal = planos.reduce((s, p) => s + p.previsaoSemana, 0);
    const capacidadeTotal = planos.reduce((s, p) => s + p.capacidadeAbateAnimais, 0);
    const camaraTotal = produtos.reduce((s, p) => s + (Number(p.capacidadeCamaraKg) || 0), 0);
    const estoqueFinalTotal = planos.reduce((s, p) => s + p.estoqueFinalKg, 0);

    const mapes = Object.values(state.previsoes).map((x) => x.escolha.metricas?.mape).filter((x) => x !== null && x !== undefined);
    const mapeMedio = mapes.length ? mapes.reduce((a, b) => a + b, 0) / mapes.length : null;

    const kpis = [
      { rotulo: "Estoque atual", valor: fmtKg(estoqueTotal), sub: `Meta ${fmtKg(metaTotal)}`, cor: "" },
      { rotulo: "Previsão da semana", valor: fmtKg(previsaoTotal), sub: `${metodoLabel()}${mapeMedio !== null ? ` · MAPE ${fmtPct(mapeMedio)}` : ""}`, cor: "olive" },
      { rotulo: "Abate recomendado", valor: `${fmtNum(c.animaisAbatidos)} animais`, sub: `Capacidade ${fmtNum(capacidadeTotal)}`, cor: "gold" },
      { rotulo: "Compra de animais", valor: `${fmtNum(c.necessidadeCompraAnimais)} animais`, sub: top ? `Fornecedor: ${top.nome}` : "Sem fornecedor conforme", cor: "" },
      { rotulo: "Margem estimada", valor: fmtBRL(c.margem), sub: `Receita ${fmtBRL(c.receita)}`, cor: "olive" },
      { rotulo: "Capacidade utilizada", valor: fmtPct(c.capacidadeUtilizada), sub: `Câmara ${fmtKg(estoqueFinalTotal)} / ${fmtKg(camaraTotal)}`, cor: "gold" },
    ];

    const origem = state.dados.DEMANDA.origem || "ilustrativa";
    const serieBadge = origem === "importado"
      ? `<span class="badge fonte">Dados importados</span>`
      : `<span class="badge estimativa">Série ilustrativa</span>`;
    const notaSerie = origem === "importado"
      ? "Série de demanda importada pelo usuário; confira a consistência dos dados antes de decidir."
      : "A série de demanda é ilustrativa; importe um CSV na aba Dados para usar dados reais.";

    const histCap = (state.previsoes.caprino?.serie || []).slice(-12);
    const histOvi = (state.previsoes.ovino?.serie || []).slice(-12);
    const nHist = Math.min(12, histCap.length, histOvi.length);
    const histTotal = histCap.slice(-nHist).map((v, i) => v + histOvi.slice(-nHist)[i]);
    const prevTotal = [0, 1, 2, 3].map((i) =>
      (state.previsoes.caprino?.prev4?.[i] || 0) + (state.previsoes.ovino?.prev4?.[i] || 0));
    const labels = [
      ...(state.previsoes.caprino?.semanas || []).slice(-nHist).map((w) => `S${w}`),
      ...Array.from({ length: 4 }, (_, i) => `S${state.semanaAtual + 1 + i}`),
    ];
    const series = [
      { nome: "Histórico", valores: [...histTotal, null, null, null, null], cor: "#b5522f" },
      { nome: "Previsão", valores: [...Array(nHist).fill(null), ...prevTotal], cor: "#5d6b4a", tracejado: true },
    ];

    const estoqueItens = produtos.flatMap((p) => [
      { rotulo: `${p.nome} atual`, valor: p.estoqueKg, cor: "#b5522f" },
      { rotulo: `${p.nome} meta`, valor: state.planos[p.id]?.estoqueMetaKg || 0, cor: "#c99a4b" },
    ]);

    const alertas = planos.flatMap((p) => (p.alertas || []).map((a) => ({ ...a, produto: p.produtoNome })));
    const alertasHtml = alertas.length
      ? alertas.map((a) => `<div class="alerta ${escapeHtml(a.tipo)}"><strong>${escapeHtml(a.produto)}</strong><span>${escapeHtml(a.mensagem)}</span></div>`).join("")
      : `<div class="alerta ok"><strong>Sem alertas</strong><span>Plano dentro da capacidade e do estoque mínimo.</span></div>`;

    const fornecedorHtml = ranking.length
      ? `<ol class="ranking-mini">${ranking.map((f) => `
          <li>
            <span class="pos">${f.rank}º</span>
            <div><strong>${escapeHtml(f.nome)}</strong><small>${escapeHtml(f.cidade)} · ${fmtBRL(f.precoKgVivo)}/kg vivo</small></div>
            <span class="score">${fmtPct(f.score)}</span>
          </li>`).join("")}</ol>
        <p class="nota">CR ${fmtPct(state.ahpResultado?.criterios?.CR || 0)} · ${ranking.length} fornecedores conformes · gate sanitário aplicado.</p>`
      : `<p class="nota">Nenhum fornecedor conforme. Ajuste o cadastro na aba Dados.</p>`;

    const linhasPlano = planos.map((p) => `
      <tr>
        <td><strong>${escapeHtml(p.produtoNome)}</strong></td>
        <td class="num">${fmtKg(p.previsaoSemana)}</td>
        <td class="num">${fmtNum(p.animaisAbatidos)}</td>
        <td class="num">${fmtKg(p.producaoKg)}</td>
        <td class="num">${fmtNum(p.necessidadeCompraAnimais)}</td>
        <td class="num">${fmtKg(p.estoqueFinalKg)}</td>
        <td class="num">${fmtBRL(p.margem)}</td>
      </tr>`).join("");

    return `
      <div class="kpi-grid">
        ${kpis.map((k) => `
          <article class="kpi ${k.cor}">
            <span class="kpi-rotulo">${escapeHtml(k.rotulo)}</span>
            <strong class="kpi-valor">${escapeHtml(k.valor)}</strong>
            <span class="kpi-sub">${escapeHtml(k.sub)}</span>
          </article>`).join("")}
      </div>

      <div class="grid-2">
        <section class="card span-2" aria-labelledby="titulo-demanda">
          <div class="card-head">
            <div>
              <h2 id="titulo-demanda">Demanda semanal</h2>
              <p>Últimas ${nHist} semanas e previsão das próximas 4.</p>
            </div>
            ${serieBadge}
          </div>
          ${Charts.linha({ series, labels, rotuloY: "kg" })}
        </section>

        <section class="card" aria-labelledby="titulo-estoque">
          <div class="card-head">
            <div>
              <h2 id="titulo-estoque">Estoque atual vs. meta</h2>
              <p>Meta = previsão × cobertura + segurança.</p>
            </div>
          </div>
          ${Charts.barras({ itens: estoqueItens, formato: Charts.formatarKg, height: 200 })}
        </section>

        <section class="card" aria-labelledby="titulo-fornecedor">
          <div class="card-head">
            <div>
              <h2 id="titulo-fornecedor">Fornecedor recomendado</h2>
              <p>Ranking AHP com conformidade sanitária.</p>
            </div>
            <button class="botao secundario" data-aba="fornecedores" type="button">Ver ranking</button>
          </div>
          ${fornecedorHtml}
        </section>

        <section class="card span-2" aria-labelledby="titulo-plano">
          <div class="card-head">
            <div>
              <h2 id="titulo-plano">Resumo do plano semanal</h2>
              <p>Quanto abater, produzir, comprar e manter em estoque.</p>
            </div>
            <button class="botao secundario" data-aba="plano" type="button">Abrir plano</button>
          </div>
          <div class="tabela-wrap">
            <table class="tabela">
              <caption>Plano calculado para a semana ${state.semanaAtual + 1}.</caption>
              <thead>
                <tr><th>Produto</th><th class="num">Previsão</th><th class="num">Abate</th><th class="num">Produção</th><th class="num">Compra</th><th class="num">Estoque final</th><th class="num">Margem</th></tr>
              </thead>
              <tbody>${linhasPlano}</tbody>
            </table>
          </div>
        </section>

        <section class="card span-2" aria-labelledby="titulo-alertas">
          <div class="card-head">
            <div>
              <h2 id="titulo-alertas">Alertas da semana</h2>
              <p>Capacidade, câmara fria, ruptura e estoque mínimo.</p>
            </div>
            <span class="badge ${alertas.length ? "alerta" : "ok"}">${alertas.length ? `${alertas.length} alerta(s)` : "Tudo ok"}</span>
          </div>
          <div class="lista-alertas" aria-live="polite">${alertasHtml}</div>
        </section>
      </div>

      <p class="nota">Preços e custos usam referências públicas (IBGE/Embrapa) e premissas editáveis. ${notaSerie}</p>
    `;
  }

  function renderPrevisao() {
    const produtos = state.dados.PRODUTOS;
    const origem = state.dados.DEMANDA.origem || "ilustrativa";
    const serieBadge = origem === "importado"
      ? `<span class="badge fonte">Dados importados</span>`
      : `<span class="badge estimativa">Série ilustrativa</span>`;
    const opcoes = [
      ["auto", "Automático (menor MAE)"],
      ["mediaMovel", "Média móvel"],
      ["ses", "Suavização exponencial"],
      ["regressao", "Regressão linear"],
    ].map(([valor, rotulo]) => `<option value="${valor}" ${state.metodo === valor ? "selected" : ""}>${rotulo}</option>`).join("");

    const controles = `
      <section class="card span-2" aria-labelledby="titulo-metodo">
        <div class="card-head">
          <div>
            <h2 id="titulo-metodo">Método de previsão</h2>
            <p>Escolha o método ou deixe o automático decidir pelo menor MAE no backtest.</p>
          </div>
          <span class="badge ${state.metodo === "auto" ? "ok" : "premissa"}">${state.metodo === "auto" ? "Automático" : "Manual"}</span>
        </div>
        <div class="form-grid">
          <label class="campo">Método
            <select data-campo="metodo">${opcoes}</select>
          </label>
          <label class="campo">Janela da média móvel
            <input type="number" data-campo="janela" min="1" max="12" step="1" value="${Number(state.parametros.janela) || 4}">
          </label>
          <label class="campo">Alfa da suavização
            <input type="number" data-campo="alfa" min="0.05" max="0.95" step="0.05" value="${Number(state.parametros.alfa) || 0.3}">
          </label>
        </div>
        <p class="nota">O backtest treina no histórico disponível e compara as últimas 4 semanas com o realizado. MAE é o erro médio absoluto em kg; MAPE é o erro percentual médio. A janela e o alfa são usados quando o método correspondente está selecionado.</p>
      </section>
    `;

    const graficos = produtos.map((p) => {
      const prev = state.previsoes[p.id];
      const serie = prev.serie;
      const n = serie.length;
      const labels = [
        ...(prev.semanas || serie.map((_, i) => i + 1)).map((w) => `S${w}`),
        ...prev.prev4.map((_, i) => `S${state.semanaAtual + 1 + i}`),
      ];
      const historico = [...serie, null, null, null, null];
      const previsao = n > 0
        ? [...Array(n - 1).fill(null), serie[n - 1], ...prev.prev4]
        : [...prev.prev4];
      const metricas = prev.escolha.metricas || {};
      const backtest = metricas.previstos?.length && metricas.reais?.length
        ? `Backtest — previsto: ${metricas.previstos.map((v) => fmtKg(v)).join(" · ")} | real: ${metricas.reais.map((v) => fmtKg(v)).join(" · ")}`
        : "Backtest indisponível para esta série.";

      return `
        <section class="card" aria-labelledby="prev-${p.id}">
          <div class="card-head">
            <div>
              <h2 id="prev-${p.id}">${escapeHtml(p.nome)}</h2>
              <p>Histórico de 52 semanas e previsão das próximas 4.</p>
            </div>
            ${serieBadge}
          </div>
          ${Charts.linha({
            series: [
              { nome: "Histórico", valores: historico, cor: "#b5522f" },
              { nome: "Previsão", valores: previsao, cor: "#5d6b4a", tracejado: true },
            ],
            labels,
            height: 300,
            rotuloY: "kg",
          })}
          <p class="nota">${escapeHtml(backtest)}</p>
        </section>
      `;
    }).join("");

    const linhasMetricas = produtos.map((p) => {
      const prev = state.previsoes[p.id];
      const m = prev.escolha.metricas || {};
      return `
        <tr>
          <td><strong>${escapeHtml(p.nome)}</strong></td>
          <td>${escapeHtml(metodoLabel(prev.escolha.metodo))}</td>
          <td class="num">${fmtKg(m.mae || 0)}</td>
          <td class="num">${m.mape == null ? "—" : fmtPct(m.mape)}</td>
        </tr>`;
    }).join("");

    const linhasPrevisao = [0, 1, 2, 3].map((i) => {
      const caprino = state.previsoes.caprino?.prev4?.[i] || 0;
      const ovino = state.previsoes.ovino?.prev4?.[i] || 0;
      return `
        <tr>
          <td>S${state.semanaAtual + 1 + i}</td>
          <td class="num">${fmtKg(caprino)}</td>
          <td class="num">${fmtKg(ovino)}</td>
          <td class="num destaque">${fmtKg(caprino + ovino)}</td>
        </tr>`;
    }).join("");

    return `
      <div class="grid-2">
        ${controles}
        ${graficos}
        <section class="card" aria-labelledby="titulo-metricas">
          <div class="card-head">
            <div>
              <h2 id="titulo-metricas">Erro do método escolhido</h2>
              <p>MAE e MAPE calculados no backtest de 4 semanas.</p>
            </div>
          </div>
          <div class="tabela-wrap">
            <table class="tabela">
              <caption>Quanto menor, melhor. O automático escolhe o menor MAE por produto.</caption>
              <thead><tr><th>Produto</th><th>Método</th><th class="num">MAE</th><th class="num">MAPE</th></tr></thead>
              <tbody>${linhasMetricas}</tbody>
            </table>
          </div>
        </section>
        <section class="card" aria-labelledby="titulo-proximas">
          <div class="card-head">
            <div>
              <h2 id="titulo-proximas">Próximas 4 semanas</h2>
              <p>Previsão usada como entrada do plano semanal.</p>
            </div>
          </div>
          <div class="tabela-wrap">
            <table class="tabela">
              <caption>Previsão em kg de carcaça por espécie.</caption>
              <thead><tr><th>Semana</th><th class="num">Caprino</th><th class="num">Ovino</th><th class="num">Total</th></tr></thead>
              <tbody>${linhasPrevisao}</tbody>
            </table>
          </div>
        </section>
        <section class="card span-2" aria-labelledby="titulo-como">
          <div class="card-head">
            <div>
              <h2 id="titulo-como">Como o SAD prevê</h2>
              <p>Transparência para o gestor e para a banca.</p>
            </div>
          </div>
          <ul class="lista-explicacao">
            <li><strong>Média móvel:</strong> média das últimas N semanas; reage rápido a mudanças, mas ignora tendência.</li>
            <li><strong>Suavização exponencial:</strong> dá mais peso às semanas recentes; o alfa controla a velocidade de reação.</li>
            <li><strong>Regressão linear:</strong> ajusta uma tendência aos dados; funciona melhor quando a demanda cresce ou cai de forma constante.</li>
            <li><strong>Automático:</strong> testa os três métodos nas últimas 4 semanas e escolhe o de menor MAE.</li>
            <li><strong>Limite:</strong> a série é ilustrativa. Importe CSV na aba Dados para usar o histórico real do frigorífico.</li>
          </ul>
        </section>
      </div>
    `;
  }

  function renderPlano() {
    const produtos = state.dados.PRODUTOS;
    const rotuloAlerta = {
      capacidade: "Capacidade", camara: "Câmara fria", ruptura: "Ruptura",
      "estoque-minimo": "Estoque mínimo", "estoque-excedente": "Excedente",
    };

    const campoNumero = (rotulo, nome, valor, step, produtoId, extra = "") => `
      <label class="campo">${rotulo}
        <input type="number" min="0" step="${step}" value="${Number(valor) || 0}" data-campo="${nome}" data-produto="${produtoId}" ${extra}>
      </label>`;

    const cards = produtos.map((p) => {
      const prev = state.previsoes[p.id];
      const plano = state.planos[p.id];
      const seguranca = p.estoqueSegurancaKgOverride !== undefined
        ? Number(p.estoqueSegurancaKgOverride)
        : prev.seguranca;
      const alertas = plano.alertas.length
        ? plano.alertas.map((a) => `<div class="alerta ${escapeHtml(a.tipo)}"><strong>${escapeHtml(rotuloAlerta[a.tipo] || a.tipo)}</strong><span>${escapeHtml(a.mensagem)}</span></div>`).join("")
        : `<div class="alerta ok"><strong>Sem alertas</strong><span>Plano dentro da capacidade e do estoque mínimo.</span></div>`;

      const mini = [
        ["Animais a abater", fmtNum(plano.animaisAbatidos)],
        ["Produção", fmtKg(plano.producaoKg)],
        ["Estoque final", fmtKg(plano.estoqueFinalKg)],
        ["Compra de animais", fmtNum(plano.necessidadeCompraAnimais)],
        ["Receita", fmtBRL(plano.receita)],
        ["Custo do vendido", fmtBRL(plano.custoVendido)],
        ["Margem do período", fmtBRL(plano.margem)],
        ["Capacidade utilizada", fmtPct(plano.capacidadeUtilizada)],
      ];

      return `
        <section class="card span-2 plano-card" aria-labelledby="plano-${p.id}">
          <div class="card-head">
            <div>
              <h2 id="plano-${p.id}">${escapeHtml(p.nome)}</h2>
              <p>Previsão ${fmtKg(prev.prev4[0])} · ${escapeHtml(metodoLabel(prev.escolha.metodo))} · segurança calculada ${fmtKg(seguranca)}</p>
            </div>
            <span class="badge ${plano.alertas.length ? "alerta" : "ok"}">${plano.alertas.length ? `${plano.alertas.length} alerta(s)` : "Dentro dos limites"}</span>
          </div>

          <div class="form-grid">
            <label class="campo">Previsão da semana
              <input type="number" value="${Math.round(prev.prev4[0])}" readonly>
            </label>
            ${campoNumero("Estoque atual (kg)", "estoqueKg", p.estoqueKg, 1, p.id)}
            ${campoNumero("Estoque de segurança (kg)", "estoqueSegurancaKg", seguranca, 1, p.id)}
            ${campoNumero("Cobertura (semanas)", "coberturaSemanas", p.coberturaSemanas, 0.5, p.id)}
            ${campoNumero("Capacidade de abate (animais)", "capacidadeAbateAnimais", p.capacidadeAbateAnimais, 1, p.id)}
            ${campoNumero("Capacidade da câmara (kg)", "capacidadeCamaraKg", p.capacidadeCamaraKg, 1, p.id)}
            ${campoNumero("Estoque mínimo (kg)", "estoqueMinKg", p.estoqueMinKg, 1, p.id)}
            ${campoNumero("Preço de venda (R$/kg)", "precoVendaKg", p.precoVendaKg, 0.01, p.id)}
            ${campoNumero("Custo de compra (R$/kg)", "custoCompraKg", p.custoCompraKg, 0.01, p.id)}
            ${campoNumero("Custo de abate (R$/kg)", "custoAbateKg", p.custoAbateKg, 0.01, p.id)}
          </div>

          <div class="mini-grid">
            ${mini.map(([rotulo, valor]) => `<div class="mini"><span>${escapeHtml(rotulo)}</span><strong>${escapeHtml(valor)}</strong></div>`).join("")}
          </div>
          <p class="nota">Custo de produção total (inclui o que vai para estoque): ${fmtBRL(plano.custoProducao)} · Valor do estoque final: ${fmtBRL(plano.valorEstoque)}.</p>

          <div class="lista-alertas" aria-live="polite">${alertas}</div>
        </section>
      `;
    }).join("");

    const slider = (rotulo, campo, valor, min, max) => `
      <label class="campo">${rotulo}
        <div class="slider-linha">
          <input type="range" min="${min}" max="${max}" step="1" value="${Math.round(valor * 100)}" data-slider="${campo}">
          <span class="valor-slider">${Math.round(valor * 100)}%</span>
        </div>
      </label>`;

    const cenarios = [
      { nome: "Cenário conservador", cenario: { demandaPct: -0.10, precoPct: -0.05, capacidadePct: -0.10 } },
      { nome: "Cenário base", cenario: { demandaPct: 0, precoPct: 0, capacidadePct: 0 } },
      { nome: "Cenário otimista", cenario: { demandaPct: 0.10, precoPct: 0.05, capacidadePct: 0.10 } },
      { nome: "Seu cenário", cenario: state.cenario },
    ];

    const linhasCenarios = cenarios.map(({ nome, cenario }) => {
      const planos = produtos.map((p) => Plano.simularCenario(inputPlano(p), cenario));
      const total = Plano.consolidar(planos);
      return `
        <tr>
          <td><strong>${escapeHtml(nome)}</strong></td>
          <td class="num">${fmtNum(total.animaisAbatidos)}</td>
          <td class="num">${fmtBRL(total.margem)}</td>
          <td>${escapeHtml(alertaPrincipal(planos))}</td>
        </tr>`;
    }).join("");

    const tabelaCenarios = `
      <div class="tabela-wrap">
        <table class="tabela">
          <caption>Se a semana for... Valores consolidados de caprino + ovino.</caption>
          <thead><tr><th>Cenário</th><th class="num">Animais a abater</th><th class="num">Margem</th><th>Alerta principal</th></tr></thead>
          <tbody>${linhasCenarios}</tbody>
        </table>
      </div>`;

    const planosAtual = produtos.map((p) => Plano.simularCenario(inputPlano(p), state.cenario));
    const totalAtual = Plano.consolidar(planosAtual);
    const estoqueFinalAtual = planosAtual.reduce((s, p) => s + p.estoqueFinalKg, 0);
    const caprinosAtual = planosAtual.find((p) => p.produtoId === "caprino")?.animaisAbatidos || 0;
    const ovinosAtual = planosAtual.find((p) => p.produtoId === "ovino")?.animaisAbatidos || 0;
    const alertaAtual = alertaPrincipal(planosAtual);
    const presets = cenarios.slice(0, 3);
    const cenarioAtualNome = presets.find((p) =>
      ["demandaPct", "precoPct", "capacidadePct"].every((chave) =>
        Math.abs(Number(state.cenario[chave]) - p.cenario[chave]) < 1e-9))
      ?.nome || "Cenário personalizado";
    const descreve = (v, negativo, positivo) => v < 0 ? negativo : v > 0 ? positivo : "Normal";
    const cenarioDescricao = [
      descreve(state.cenario.demandaPct, "Demanda mais fraca", "Demanda mais forte"),
      descreve(state.cenario.precoPct, "Preço abaixo", "Preço acima"),
      descreve(state.cenario.capacidadePct, "Capacidade reduzida", "Capacidade maior"),
    ].join(" · ");
    const cenarioExibicao = cenarioAtualNome === "Cenário personalizado" ? cenarioDescricao : cenarioAtualNome;
    const topFornecedor = state.ahpResultado?.ranking?.[0];
    const modoToggle = `<button class="botao secundario" data-acao="alternar-modo-plano" type="button">${state.planoAvancado ? "Modo simples" : "Ajustes avançados"}</button>`;

    const segmento = (campo, valor, rotulo) => {
      const ativo = Math.abs(Number(state.cenario[campo]) - valor) < 1e-9;
      return `<button type="button" class="segmento ${ativo ? "ativo" : ""}" data-cenario="${campo}" data-valor="${valor}" aria-pressed="${ativo}">${rotulo}</button>`;
    };
    const pergunta = (titulo, campo, opcoes) => `
      <div class="pergunta">
        <span class="mini">${titulo}</span>
        <div class="segmentos">${opcoes.map(([valor, rotulo]) => segmento(campo, valor, rotulo)).join("")}</div>
      </div>`;

    if (!state.planoAvancado) {
      return `
        <div class="grid-2">
          <section class="card span-2 resumo-decisao" aria-labelledby="titulo-resumo-plano">
            <div class="card-head">
              <div>
                <h2 id="titulo-resumo-plano">Plano da semana</h2>
                <p>${escapeHtml(cenarioExibicao)} · semana S${state.semanaAtual + 1}</p>
              </div>
              ${modoToggle}
            </div>
            <div class="resumo-grid">
              <div class="resumo-item"><span class="mini">Abater</span><strong>${fmtNum(totalAtual.animaisAbatidos)}</strong><small>animais · ${fmtNum(caprinosAtual)} caprinos + ${fmtNum(ovinosAtual)} ovinos</small></div>
              <div class="resumo-item"><span class="mini">Comprar</span><strong>${fmtNum(totalAtual.necessidadeCompraAnimais)}</strong><small>animais</small></div>
              <div class="resumo-item"><span class="mini">Estocar</span><strong>${fmtKg(estoqueFinalAtual)}</strong><small>estoque final estimado</small></div>
              <div class="resumo-item"><span class="mini">Margem</span><strong>${fmtBRL(totalAtual.margem)}</strong><small>no período</small></div>
            </div>
            <div class="lista-alertas" aria-live="polite">
              <div class="alerta ${alertaAtual === "Sem alertas" ? "ok" : "capacidade"}">
                <strong>${alertaAtual === "Sem alertas" ? "Sem alertas" : "Atenção"}</strong>
                <span>${escapeHtml(alertaAtual)}</span>
              </div>
            </div>
            <p class="nota">Fornecedor recomendado: <strong>${topFornecedor ? escapeHtml(topFornecedor.nome) : "—"}</strong>${topFornecedor ? ` · score ${fmtPct(topFornecedor.score)}` : ""}.</p>
          </section>

          <section class="card span-2" aria-labelledby="titulo-perguntas">
            <div class="card-head">
              <div>
                <h2 id="titulo-perguntas">Como será a semana?</h2>
                <p>Três perguntas rápidas. O resumo acima se ajusta na hora.</p>
              </div>
              <span class="badge ${cenarioAtualNome === "Cenário personalizado" ? "premissa" : "ok"}">${escapeHtml(cenarioAtualNome)}</span>
            </div>
            <div class="perguntas">
              ${pergunta("Demanda", "demandaPct", [[-0.1, "Mais fraca"], [0, "Normal"], [0.1, "Mais forte"]])}
              ${pergunta("Preço de venda", "precoPct", [[-0.05, "Abaixo"], [0, "Normal"], [0.05, "Acima"]])}
              ${pergunta("Capacidade de abate", "capacidadePct", [[-0.1, "Reduzida"], [0, "Normal"], [0.1, "Maior"]])}
            </div>
            <p class="nota">As respostas são independentes: a tabela de cenários combina os três fatores em referências. O resumo acima reflete a sua combinação; o plano base e os parâmetros do modelo ficam nos ajustes avançados.</p>
          </section>

          <section class="card span-2" aria-labelledby="titulo-cenarios">
            <div class="card-head">
              <div>
                <h2 id="titulo-cenarios">Se a semana for...</h2>
                <p>Compare a decisão em três cenários.</p>
              </div>
            </div>
            ${tabelaCenarios}
          </section>

          <details class="card span-2 detalhes-plano">
            <summary>Ajustes avançados por espécie</summary>
            <p class="nota">Edite cobertura, capacidade, preços e custos. O plano base é recalculado ao alterar. O resumo acima continua refletindo o cenário escolhido.</p>
            <div class="grid-2">${cards}</div>
          </details>
        </div>
      `;
    }

    return `
      <div class="grid-2">
        <section class="card span-2" aria-labelledby="titulo-plano-parametros">
          <div class="card-head">
            <div>
              <h2 id="titulo-plano-parametros">Parâmetros do plano</h2>
              <p>Os cartões abaixo mostram o plano base. A tabela simula choques de demanda, preço e capacidade.</p>
            </div>
            <div class="card-acoes">
              ${modoToggle}
              <button class="botao secundario" data-acao="restaurar-parametros" type="button">Restaurar parâmetros</button>
            </div>
          </div>
          <div class="slider-grid">
            ${slider("Demanda", "demandaPct", state.cenario.demandaPct, -20, 20)}
            ${slider("Preço de venda", "precoPct", state.cenario.precoPct, -15, 15)}
            ${slider("Capacidade de abate", "capacidadePct", state.cenario.capacidadePct, -20, 20)}
          </div>
          <p class="nota">Solte o slider para recalcular. Os valores percentuais são aplicados sobre a previsão, o preço de venda e a capacidade de cada produto.</p>
          <div style="margin-top:14px">${tabelaCenarios}</div>
        </section>

        ${cards}
      </div>
    `;
  }

  function parseValorMatriz(valor) {
    const s = String(valor ?? "").trim().replace(",", ".");
    if (s === "") return 1;
    if (s.includes("/")) {
      const [a, b] = s.split("/").map(Number);
      if (Number.isFinite(a) && Number.isFinite(b) && b !== 0) return a / b;
    }
    const n = Number(s);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }

  function formatarMatriz(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return "1";
    return String(Math.round(n * 1000) / 1000);
  }

  function matrizTabela(matriz, nomes, tipo, criterioId = "", rotuloPrimeira = "Critério", legenda = "Matriz de comparação") {
    const n = nomes.length;
    const head = nomes.map((nome) => `<th scope="col">${escapeHtml(nome)}</th>`).join("");
    let linhas = "";
    for (let i = 0; i < n; i++) {
      let celulas = "";
      for (let j = 0; j < n; j++) {
        if (i === j) {
          celulas += `<td class="matriz-diagonal" aria-label="Diagonal">1</td>`;
        } else if (j > i) {
          celulas += `<td><input class="matriz-input" type="text" inputmode="decimal" value="${formatarMatriz(matriz[i][j])}" data-matriz="${tipo}" ${criterioId ? `data-criterio="${criterioId}"` : ""} data-i="${i}" data-j="${j}" aria-label="Comparação entre ${escapeHtml(nomes[i])} e ${escapeHtml(nomes[j])}"></td>`;
        } else {
          celulas += `<td class="matriz-reciproca">${formatarMatriz(matriz[i][j])}</td>`;
        }
      }
      linhas += `<tr><th scope="row">${escapeHtml(nomes[i])}</th>${celulas}</tr>`;
    }
    return `<div class="tabela-wrap"><table class="tabela matriz"><caption>${escapeHtml(legenda)}</caption><thead><tr><th scope="col">${escapeHtml(rotuloPrimeira)}</th>${head}</tr></thead><tbody>${linhas}</tbody></table></div>`;
  }

  function renderFornecedores() {
    const resultado = state.ahpResultado || { criterios: { weights: [], CR: 0 }, ranking: [], excluidos: [] };
    const ranking = resultado.ranking || [];
    const excluidos = resultado.excluidos || [];
    const pesos = resultado.criterios?.weights || [];
    const cr = resultado.criterios?.CR || 0;
    const alternativas = state.dados.FORNECEDORES || Fornecedores.ALTERNATIVAS;
    const conformes = alternativas.filter((a) => a.conformidadeSanitaria);
    const nomesCrit = Fornecedores.CRITERIOS.map((c) => c.nome);
    const nomesAlt = conformes.map((a) => a.nomeCurto || a.nome);
    const criteriosAlternativas = resultado.criteriosAlternativas || {};

    const pesosItens = Fornecedores.CRITERIOS.map((c, i) => ({ rotulo: c.nome, valor: pesos[i] || 0 }));
    const crBadge = `<span class="badge ${cr <= 0.10 ? "ok" : "alerta"}">CR ${fmtPct(cr)}</span>`;
    const crAlerta = cr > 0.10
      ? `<div class="alerta capacidade"><strong>Consistência</strong><span>CR de ${fmtPct(cr)} acima de 10%. O ranking ainda é calculado, mas as comparações precisam ser revisadas.</span></div>`
      : `<div class="alerta ok"><strong>Consistência</strong><span>CR de ${fmtPct(cr)} dentro do limite de 10%.</span></div>`;

    const alternativasDetalhes = Fornecedores.CRITERIOS.map((c, i) => {
      const M = state.ahp.matrizesAlternativas[c.id];
      const crAlt = criteriosAlternativas[c.id]?.CR ?? 0;
      return `
        <details class="matriz-detalhe">
          <summary>${escapeHtml(c.nome)} <span class="badge ${cr <= 0.10 ? "ok" : "premissa"}">peso ${fmtPct(pesos[i] || 0)}</span> <span class="badge ${crAlt <= 0.10 ? "ok" : "alerta"}">CR ${fmtPct(crAlt)}</span></summary>
          <p class="nota">${escapeHtml(c.descricao)}</p>
          ${crAlt > 0.10 ? `<div class="alerta capacidade"><strong>Consistência</strong><span>CR de ${fmtPct(crAlt)} acima de 10% neste critério. Revise as comparações.</span></div>` : ""}
          ${M ? matrizTabela(M, nomesAlt, "alternativa", c.id, "Alternativa", `Comparações entre fornecedores — ${c.nome}`) : `<p class="nota">Matriz indisponível.</p>`}
        </details>`;
    }).join("");

    const linhasRanking = ranking.map((f) => `
      <tr>
        <td><strong>${f.rank}º</strong></td>
        <td><strong>${escapeHtml(f.nome)}</strong></td>
        <td>${escapeHtml(f.cidade)}</td>
        <td class="num">${fmtBRL(f.precoKgVivo)}</td>
        <td class="num destaque">${fmtPct(f.score)}</td>
        <td><span class="badge ok" aria-label="Conforme" title="Conforme">✓</span></td>
      </tr>`).join("");

    const excluidosHtml = excluidos.length
      ? `<ul class="lista-excluidos">${excluidos.map((a) => `<li><strong>${escapeHtml(a.nome)}</strong> — ${escapeHtml(a.cidade)} · sem conformidade sanitária</li>`).join("")}</ul>`
      : `<p class="nota">Nenhum fornecedor excluído pelo gate sanitário.</p>`;

    const linhasFornecedores = alternativas.map((a) => `
      <tr>
        <td><input class="fornecedor-input" type="text" value="${escapeHtml(a.nome)}" data-fornecedor="${a.id}" data-campo-fornecedor="nome" aria-label="Nome do fornecedor ${escapeHtml(a.nome)}"></td>
        <td><input class="fornecedor-input" type="text" value="${escapeHtml(a.cidade)}" data-fornecedor="${a.id}" data-campo-fornecedor="cidade" aria-label="Cidade do fornecedor ${escapeHtml(a.nome)}"></td>
        <td class="num"><input class="fornecedor-input" type="number" min="0" step="0.01" value="${Number(a.precoKgVivo) || 0}" data-fornecedor="${a.id}" data-campo-fornecedor="precoKgVivo" aria-label="Preço por kg vivo de ${escapeHtml(a.nome)}"></td>
        <td class="num"><input class="fornecedor-input" type="number" min="0" max="10" step="0.1" value="${Number(a.qualidade) || 0}" data-fornecedor="${a.id}" data-campo-fornecedor="qualidade" aria-label="Qualidade de ${escapeHtml(a.nome)}"></td>
        <td class="num"><input class="fornecedor-input" type="number" min="0" step="1" value="${Number(a.prazoDias) || 0}" data-fornecedor="${a.id}" data-campo-fornecedor="prazoDias" aria-label="Prazo em dias de ${escapeHtml(a.nome)}"></td>
        <td class="num"><input class="fornecedor-input" type="number" min="0" max="10" step="0.1" value="${Number(a.confiabilidade) || 0}" data-fornecedor="${a.id}" data-campo-fornecedor="confiabilidade" aria-label="Confiabilidade de ${escapeHtml(a.nome)}"></td>
        <td>${a.conformidadeSanitaria ? `<span class="badge ok">Conforme</span>` : `<span class="badge alerta">Excluído</span>`}</td>
      </tr>`).join("");

    return `
      <div class="grid-2">
        <section class="card span-2" aria-labelledby="titulo-ahp">
          <div class="card-head">
            <div>
              <h2 id="titulo-ahp">Como o AHP decide</h2>
              <p>Comparações pareadas, consistência e gate sanitário.</p>
            </div>
            ${crBadge}
          </div>
          <ul class="lista-explicacao">
            <li><strong>Escala 1–9:</strong> 1 = igual; 3 = moderadamente mais importante; 5 = forte; 7 = muito forte; 9 = extremo.</li>
            <li><strong>Matriz recíproca:</strong> se A é 3× mais importante que B, B é 1/3 de A. O sistema preenche a célula espelhada.</li>
            <li><strong>Consistência:</strong> CR ≤ 10% é o limite usual. Acima disso, revise as comparações.</li>
            <li><strong>Gate sanitário:</strong> fornecedor sem conformidade é excluído antes do cálculo. Nenhum peso compensa isso.</li>
            <li><strong>Score final:</strong> soma do peso de cada critério × prioridade da alternativa naquele critério.</li>
          </ul>
          <div style="margin-top:12px">${crAlerta}</div>
        </section>

        <section class="card" aria-labelledby="titulo-pesos">
          <div class="card-head">
            <div>
              <h2 id="titulo-pesos">Pesos dos critérios</h2>
              <p>Prioridade relativa resultante das comparações.</p>
            </div>
          </div>
          ${Charts.barras({ itens: pesosItens, formato: Charts.formatarPct, height: 210 })}
        </section>

        <section class="card" aria-labelledby="titulo-ranking">
          <div class="card-head">
            <div>
              <h2 id="titulo-ranking">Ranking final</h2>
              <p>Somente fornecedores com conformidade sanitária.</p>
            </div>
          </div>
          <div class="tabela-wrap">
            <table class="tabela">
              <caption>Score normalizado; maior é melhor.</caption>
              <thead><tr><th>#</th><th>Fornecedor</th><th>Cidade</th><th class="num">Preço/kg vivo</th><th class="num">Score</th><th>Gate</th></tr></thead>
              <tbody>${linhasRanking || `<tr><td colspan="6">Sem fornecedores conformes.</td></tr>`}</tbody>
            </table>
          </div>
          <p class="nota">${ranking.length ? `Recomendado: ${escapeHtml(ranking[0].nome)}.` : "Ajuste o cadastro de fornecedores."}</p>
        </section>

        <section class="card span-2" aria-labelledby="titulo-fornecedores-cadastro">
          <div class="card-head">
            <div>
              <h2 id="titulo-fornecedores-cadastro">Dados dos fornecedores</h2>
              <p>Edite nome, cidade, preço, qualidade, prazo e confiabilidade. O gate sanitário é fixo.</p>
            </div>
            <span class="badge premissa">Editável</span>
          </div>
          <div class="tabela-wrap">
            <table class="tabela">
              <caption>As comparações pareadas são julgamentos à parte; ajuste-as para refletir a nova cotação.</caption>
              <thead><tr><th>Fornecedor</th><th>Cidade</th><th class="num">Preço/kg vivo</th><th class="num">Qualidade</th><th class="num">Prazo (dias)</th><th class="num">Confiabilidade</th><th>Sanidade</th></tr></thead>
              <tbody>${linhasFornecedores}</tbody>
            </table>
          </div>
        </section>

        <section class="card span-2" aria-labelledby="titulo-matriz-criterios">
          <div class="card-head">
            <div>
              <h2 id="titulo-matriz-criterios">Matriz de comparação dos critérios</h2>
              <p>Edite o triângulo superior; o inferior é recíproco e calculado automaticamente.</p>
            </div>
            <button class="botao secundario" data-acao="restaurar-ahp" type="button">Restaurar exemplo</button>
          </div>
          ${matrizTabela(state.ahp.matrizCriterios, nomesCrit, "criterios", "", "Critério", "Comparações pareadas entre critérios")}
        </section>

        <section class="card span-2" aria-labelledby="titulo-matriz-alt">
          <div class="card-head">
            <div>
              <h2 id="titulo-matriz-alt">Comparações das alternativas por critério</h2>
              <p>Abra cada critério e ajuste as comparações entre os fornecedores conformes.</p>
            </div>
          </div>
          ${alternativasDetalhes}
        </section>

        <section class="card span-2" aria-labelledby="titulo-excluidos">
          <div class="card-head">
            <div>
              <h2 id="titulo-excluidos">Fornecedores excluídos</h2>
              <p>O gate sanitário remove o fornecedor do ranking, independentemente do preço.</p>
            </div>
            <span class="badge ${excluidos.length ? "alerta" : "ok"}">${excluidos.length} excluído(s)</span>
          </div>
          ${excluidosHtml}
        </section>
      </div>
    `;
  }

  function renderDados() {
    const caprino2025 = DADOS.REBANHO.caprino.find((x) => x.ano === 2025)?.valor || 0;
    const ovino2025 = DADOS.REBANHO.ovino.find((x) => x.ano === 2025)?.valor || 0;
    const produtos = state.dados.PRODUTOS;
    const semanas = state.dados.DEMANDA.semanas || [];
    const nSemanas = semanas.length || state.dados.DEMANDA.caprino?.length || 0;
    const primeiraSemana = semanas[0] ?? 1;
    const ultimaSemana = semanas[semanas.length - 1] ?? nSemanas;
    const origem = state.dados.DEMANDA.origem || "ilustrativa";
    const serieStatus = origem === "importado"
      ? `<span class="badge fonte">Importado</span>`
      : `<span class="badge estimativa">Estimativa</span>`;
    const capacidadeTotal = produtos.reduce((s, p) => s + Number(p.capacidadeAbateAnimais || 0), 0);
    const camaraTotal = produtos.reduce((s, p) => s + Number(p.capacidadeCamaraKg || 0), 0);
    const coberturas = [...new Set(produtos.map((p) => Number(p.coberturaSemanas) || 0))];
    const coberturaTxt = coberturas.length === 1
      ? `${fmtNum(coberturas[0], 1)} semana(s)`
      : `${coberturas.map((v) => fmtNum(v, 1)).join(" / ")} semanas`;
    const fornecedores = state.dados.FORNECEDORES || [];
    const fornecedoresConformes = fornecedores.filter((a) => a.conformidadeSanitaria).length;

    const linhasProdutos = produtos.map((p) => `
      <tr>
        <td><strong>${escapeHtml(p.nome)}</strong></td>
        <td class="num">${fmtNum(p.kgCarcacaAnimal, 2)} kg</td>
        <td class="num">${fmtBRL(p.precoVendaKg)}</td>
        <td class="num">${fmtBRL(p.custoCompraKg)}</td>
        <td class="num">${fmtBRL(p.custoAbateKg)}</td>
        <td class="num">${fmtKg(p.estoqueKg)}</td>
        <td class="num">${fmtNum(p.coberturaSemanas, 1)} sem.</td>
      </tr>`).join("");

    return `
      <div class="grid-2">
        <section class="card span-2" aria-labelledby="titulo-dados">
          <div class="card-head">
            <div>
              <h2 id="titulo-dados">Dados e premissas</h2>
              <p>O que é fonte pública, o que é estimativa e o que é premissa editável.</p>
            </div>
            <div class="badges">
              <span class="badge fonte">Fonte</span>
              <span class="badge estimativa">Estimativa</span>
              <span class="badge premissa">Premissa</span>
            </div>
          </div>
          <div class="tabela-wrap">
            <table class="tabela">
              <caption>Base atual: ${nSemanas} semanas (S${primeiraSemana}–S${ultimaSemana}) e ${produtos.length} produtos.</caption>
              <thead><tr><th>Fonte</th><th>Uso no SAD</th><th>Dado usado</th><th>Status</th></tr></thead>
              <tbody>
                <tr>
                  <td><strong>IBGE — PPM 2025</strong><br><small>Tabela 3939, variável 105</small></td>
                  <td>Rebanho de Caicó/RN</td>
                  <td>${fmtNum(caprino2025)} caprinos · ${fmtNum(ovino2025)} ovinos</td>
                  <td><span class="badge fonte">Fonte</span></td>
                </tr>
                <tr>
                  <td><strong>Embrapa CIM/Cepea</strong><br><small>Boletim Set/2026</small></td>
                  <td>Preço de referência</td>
                  <td>RN: ${fmtBRL(DADOS.PRECOS.rnVivoKg)}/kg vivo · carcaça NE: ${fmtBRL(DADOS.PRECOS.carcacaNordesteKgMin)}–${fmtBRL(DADOS.PRECOS.carcacaNordesteKgMax)}/kg</td>
                  <td><span class="badge fonte">Fonte</span></td>
                </tr>
                <tr>
                  <td><strong>Embrapa Caprinos e Ovinos</strong><br><small>Doc 133/2019 e coeficientes técnicos</small></td>
                  <td>Custos e conversão animal → carcaça</td>
                  <td>Peso ao abate 28–32 kg; rendimento 45–50%; COE/COT/CT de referência</td>
                  <td><span class="badge fonte">Fonte</span></td>
                </tr>
                <tr>
                  <td><strong>Série de demanda</strong><br><small>${origem === "importado" ? "Importada pelo usuário" : "Gerada com seed fixa"}</small></td>
                  <td>Previsão e plano</td>
                  <td>${nSemanas} semanas (S${primeiraSemana}–S${ultimaSemana}); ${origem === "importado" ? "dados do usuário" : "~60 caprinos + 60 ovinos/semana; sazonalidade de junho/dezembro"}</td>
                  <td>${serieStatus}</td>
                </tr>
                <tr>
                  <td><strong>Fornecedores</strong><br><small>Editáveis na aba Fornecedores</small></td>
                  <td>Ranking AHP</td>
                  <td>${fornecedoresConformes} conformes + ${fornecedores.length - fornecedoresConformes} excluído(s) por falta de GTA</td>
                  <td><span class="badge premissa">Editável</span></td>
                </tr>
                <tr>
                  <td><strong>Parâmetros do plano</strong><br><small>Editáveis na aba Plano</small></td>
                  <td>Capacidade, cobertura, preços e custos</td>
                  <td>Capacidade ${fmtNum(capacidadeTotal)} animais/semana; câmara ${fmtKg(camaraTotal)}; cobertura ${coberturaTxt}</td>
                  <td><span class="badge premissa">Premissa</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="card span-2" aria-labelledby="titulo-produtos">
          <div class="card-head">
            <div>
              <h2 id="titulo-produtos">Parâmetros por produto</h2>
              <p>Valores atuais usados no cálculo. Edite na aba Plano semanal.</p>
            </div>
          </div>
          <div class="tabela-wrap">
            <table class="tabela">
              <caption>Conversão e economia por espécie.</caption>
              <thead><tr><th>Produto</th><th class="num">kg carcaça/animal</th><th class="num">Preço venda</th><th class="num">Custo compra</th><th class="num">Custo abate</th><th class="num">Estoque atual</th><th class="num">Cobertura</th></tr></thead>
              <tbody>${linhasProdutos}</tbody>
            </table>
          </div>
        </section>

        <section class="card span-2" aria-labelledby="titulo-importar">
          <div class="card-head">
            <div>
              <h2 id="titulo-importar">Importar dados</h2>
              <p>O arquivo é processado no navegador; nada é enviado para servidor.</p>
            </div>
            <span class="badge premissa">CSV</span>
          </div>
          <div class="import-grid">
            <div class="import-card">
              <h3>Demanda semanal</h3>
              <p class="nota">Colunas: <code>semana;caprino;ovino</code>. Use ponto e vírgula, uma linha por semana. As semanas são ordenadas automaticamente.</p>
              <input type="file" accept=".csv,text/csv" data-import="demanda" aria-label="Importar CSV de demanda">
              <pre class="exemplo-csv">semana;caprino;ovino
1;700;900
2;710;910</pre>
            </div>
            <div class="import-card">
              <h3>Estoque atual</h3>
              <p class="nota">Colunas: <code>produto;estoque_kg</code>. Produtos aceitos: caprino e ovino.</p>
              <input type="file" accept=".csv,text/csv" data-import="estoque" aria-label="Importar CSV de estoque">
              <pre class="exemplo-csv">produto;estoque_kg
caprino;600
ovino;800</pre>
            </div>
          </div>
          <p class="nota">Após importar, a previsão e o plano são recalculados. Em caso de erro, os dados anteriores são mantidos.</p>
        </section>

        <section class="card span-2" aria-labelledby="titulo-reset">
          <div class="card-head">
            <div>
              <h2 id="titulo-reset">Restaurar exemplo</h2>
              <p>Volta aos dados públicos + série ilustrativa e limpa o estado salvo no navegador.</p>
            </div>
            <button class="botao perigo" data-acao="restaurar-dados" type="button">Restaurar dados</button>
          </div>
          <p class="nota">Use esta opção antes de uma demonstração ou depois de testar importações. Os dados importados não são enviados a nenhum servidor.</p>
        </section>
      </div>
    `;
  }

  function renderEmConstrucao(aba) {
    const nome = TITULOS[aba]?.[0] || aba;
    return `<section class="placeholder"><h2>${escapeHtml(nome)}</h2><p>Esta tela será conectada na próxima etapa da implementação.</p></section>`;
  }

  function render() {
    const [titulo, subtitulo] = TITULOS[state.aba] || TITULOS.painel;
    const elTitulo = document.getElementById("titulo-aba");
    const elSub = document.getElementById("subtitulo-aba");
    if (elTitulo) elTitulo.textContent = titulo;
    if (elSub) elSub.textContent = subtitulo;

    document.querySelectorAll(".nav-item[data-aba]").forEach((btn) => {
      const ativo = btn.dataset.aba === state.aba;
      btn.classList.toggle("ativo", ativo);
      if (ativo) btn.setAttribute("aria-current", "page");
      else btn.removeAttribute("aria-current");
    });

    const app = document.getElementById("app");
    if (!app) return;
    const avisoErro = state.erroCalculo
      ? `<div class="alerta capacidade" role="alert" style="margin-bottom:16px"><strong>Erro</strong><span>${escapeHtml(state.erroCalculo)}</span></div>`
      : "";
    try {
      let conteudo = "";
      if (state.aba === "painel") conteudo = renderPainel();
      else if (state.aba === "previsao") conteudo = renderPrevisao();
      else if (state.aba === "plano") conteudo = renderPlano();
      else if (state.aba === "fornecedores") conteudo = renderFornecedores();
      else if (state.aba === "dados") conteudo = renderDados();
      else conteudo = renderEmConstrucao(state.aba);
      app.innerHTML = avisoErro + conteudo;
    } catch (err) {
      app.innerHTML = avisoErro + `<div class="alerta capacidade" role="alert"><strong>Erro</strong><span>${escapeHtml(err.message || "Falha ao montar a tela.")}</span></div>`;
    }
  }

  function preencherSemanas() {
    const sel = document.getElementById("semana");
    if (!sel) return;
    const semanas = state.dados.DEMANDA.semanas || [];
    if (semanas.length === 0) return;
    if (!semanas.includes(state.semanaAtual)) state.semanaAtual = semanas[semanas.length - 1];
    sel.innerHTML = semanas
      .map((w) => `<option value="${w}" ${w === state.semanaAtual ? "selected" : ""}>S${w}</option>`)
      .join("");
  }

  function restaurarDados() {
    state.dados = DADOS.clonarDados();
    state.metodo = "auto";
    state.parametros = { ...DADOS.PARAMETROS };
    state.cenario = { demandaPct: 0, precoPct: 0, capacidadePct: 0 };
    state.planoAvancado = false;
    state.ahp = Fornecedores.restaurarExemplo();
    state.semanaAtual = 52;
    try { localStorage.removeItem(CHAVE); } catch (_) {}
    preencherSemanas();
    calcularTudo();
    render();
  }

  function ligarEventos() {
    document.addEventListener("click", (event) => {
      const nav = event.target.closest("[data-aba]");
      if (nav) {
        state.aba = nav.dataset.aba;
        render();
        return;
      }
      const cenario = event.target.closest("[data-cenario]");
      if (cenario) {
        state.cenario[cenario.dataset.cenario] = Number(cenario.dataset.valor) || 0;
        salvar();
        render();
        return;
      }
      const acao = event.target.closest("[data-acao]");
      if (!acao) return;
      if (acao.dataset.acao === "alternar-modo-plano") {
        state.planoAvancado = !state.planoAvancado;
        salvar();
        render();
        return;
      }
      if (acao.dataset.acao === "recalcular") {
        calcularTudo();
        salvar();
        render();
        if (!state.erroCalculo) toast("Plano recalculado com os parâmetros atuais.");
      }
      if (acao.dataset.acao === "restaurar-parametros") {
        for (const padrao of DADOS.PRODUTOS) {
          const produto = state.dados.PRODUTOS.find((p) => p.id === padrao.id);
          if (!produto) continue;
          for (const chave of ["estoqueMinKg", "capacidadeAbateAnimais", "capacidadeCamaraKg", "coberturaSemanas", "precoVendaKg", "custoCompraKg", "custoAbateKg"]) {
            produto[chave] = padrao[chave];
          }
          delete produto.estoqueSegurancaKgOverride;
        }
        state.cenario = { demandaPct: 0, precoPct: 0, capacidadePct: 0 };
        calcularTudo();
        salvar();
        render();
        if (!state.erroCalculo) toast("Parâmetros do plano restaurados.");
      }
      if (acao.dataset.acao === "restaurar-ahp") {
        state.ahp = Fornecedores.restaurarExemplo();
        calcularTudo();
        salvar();
        render();
        if (!state.erroCalculo) toast("Matrizes AHP restauradas.");
      }
      if (acao.dataset.acao === "restaurar-dados") {
        if (!window.confirm("Restaurar os dados de exemplo e limpar o estado salvo?")) return;
        restaurarDados();
        if (!state.erroCalculo) toast("Dados de exemplo restaurados.");
      }
    });

    const semana = document.getElementById("semana");
    if (semana) {
      semana.addEventListener("change", (event) => {
        state.semanaAtual = Number(event.target.value) || state.semanaAtual;
        calcularTudo();
        salvar();
        render();
      });
    }

    const app = document.getElementById("app");
    if (app) {
      app.addEventListener("change", (event) => {
        const importacao = event.target.closest("[data-import]");
        if (importacao) {
          const arquivo = importacao.files?.[0];
          if (!arquivo) return;
          const tipo = importacao.dataset.import;
          const leitor = new FileReader();
          leitor.onload = () => {
            try {
              if (tipo === "demanda") {
                state.dados = Importacao.aplicarDemanda(state.dados, String(leitor.result));
                state.semanaAtual = state.dados.DEMANDA.semanas[state.dados.DEMANDA.semanas.length - 1];
                preencherSemanas();
                toast(`Demanda importada. Semana de referência: S${state.semanaAtual}.`);
              } else if (tipo === "estoque") {
                state.dados = Importacao.aplicarEstoque(state.dados, String(leitor.result));
                toast("Estoque importado. Plano recalculado.");
              }
              calcularTudo();
              salvar();
              render();
            } catch (err) {
              toast(err.message || "Falha na importação.", true);
              render();
            }
          };
          leitor.onerror = () => toast("Falha ao ler o arquivo.", true);
          leitor.readAsText(arquivo, "utf-8");
          return;
        }

        const fornecedorInput = event.target.closest("[data-fornecedor]");
        if (fornecedorInput) {
          const alt = (state.dados.FORNECEDORES || []).find((a) => a.id === fornecedorInput.dataset.fornecedor);
          if (!alt) return;
          const campo = fornecedorInput.dataset.campoFornecedor;
          if (campo === "nome" || campo === "cidade") {
            alt[campo] = fornecedorInput.value.trim() || alt[campo];
          } else {
            const valor = Number(fornecedorInput.value);
            if (!Number.isFinite(valor) || valor < 0) { render(); return; }
            alt[campo] = valor;
          }
          calcularTudo();
          salvar();
          render();
          return;
        }

        const matrizInput = event.target.closest("[data-matriz]");
        if (matrizInput) {
          const tipo = matrizInput.dataset.matriz;
          const i = Number(matrizInput.dataset.i);
          const j = Number(matrizInput.dataset.j);
          let valor = parseValorMatriz(matrizInput.value);
          valor = Math.max(1 / 9, Math.min(9, valor));
          if (tipo === "criterios") {
            state.ahp.matrizCriterios[i][j] = valor;
            state.ahp.matrizCriterios[j][i] = 1 / valor;
          } else {
            const matriz = state.ahp.matrizesAlternativas[matrizInput.dataset.criterio];
            if (matriz) {
              matriz[i][j] = valor;
              matriz[j][i] = 1 / valor;
            }
          }
          calcularTudo();
          salvar();
          render();
          return;
        }

        const slider = event.target.closest("[data-slider]");
        if (slider) {
          const nome = slider.dataset.slider;
          state.cenario[nome] = (Number(slider.value) || 0) / 100;
          salvar();
          render();
          return;
        }

        const campo = event.target.closest("[data-campo]");
        if (!campo) return;
        const nome = campo.dataset.campo;

        if (campo.dataset.produto) {
          const produto = state.dados.PRODUTOS.find((p) => p.id === campo.dataset.produto);
          if (!produto) return;
          const valor = Number(campo.value);
          if (!Number.isFinite(valor) || valor < 0) { render(); return; }
          if (nome === "estoqueSegurancaKg") produto.estoqueSegurancaKgOverride = valor;
          else produto[nome] = valor;
          calcularTudo();
          salvar();
          render();
          return;
        }

        if (nome === "metodo") state.metodo = campo.value;
        if (nome === "janela") state.parametros.janela = Math.max(1, Math.min(12, Number(campo.value) || 4));
        if (nome === "alfa") state.parametros.alfa = Math.max(0.05, Math.min(0.95, Number(campo.value) || 0.3));
        calcularTudo();
        salvar();
        render();
      });
    }
  }

  function init() {
    carregar();
    preencherSemanas();
    calcularTudo();
    ligarEventos();
    render();
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else init();
  }

  return { state, init, calcularTudo, render, salvar, carregar, restaurarDados, toast };
})();
