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
        ahp: state.ahp,
      }));
    } catch (_) { /* localStorage indisponível */ }
  }

  function carregar() {
    try {
      const raw = localStorage.getItem(CHAVE);
      if (!raw) return;
      const salvo = JSON.parse(raw);
      if (salvo.dados && Array.isArray(salvo.dados.PRODUTOS) && salvo.dados.DEMANDA) {
        state.dados = { ...DADOS.clonarDados(), ...salvo.dados };
      }
      if (["auto", "mediaMovel", "ses", "regressao"].includes(salvo.metodo)) state.metodo = salvo.metodo;
      if (salvo.parametros) state.parametros = { ...DADOS.PARAMETROS, ...salvo.parametros };
      if (salvo.cenario) state.cenario = { ...state.cenario, ...salvo.cenario };
      if (salvo.ahp?.matrizCriterios?.length === 4 &&
          salvo.ahp?.matrizesAlternativas?.preco?.length === 3) {
        state.ahp = salvo.ahp;
      }
    } catch (_) { /* estado corrompido: usa defaults */ }
  }

  function metodoEscolhido(serie) {
    if (state.metodo === "auto") return Previsao.escolherMelhor(serie, 4);
    const params = state.metodo === "ses"
      ? { alfa: 0.3 }
      : state.metodo === "mediaMovel" ? { janela: 4 } : {};
    return { metodo: state.metodo, params, metricas: Previsao.backtest(serie, state.metodo, params, 4) };
  }

  function calcularTudo() {
    state.planos = {};
    state.previsoes = {};
    for (const produto of state.dados.PRODUTOS) {
      const serie = state.dados.DEMANDA[produto.id] || [];
      const escolha = metodoEscolhido(serie);
      const prev4 = Previsao.prever(serie, escolha.metodo, escolha.params, 4);
      const seguranca = Estoque.estoqueSeguranca(serie, state.parametros.z, state.parametros.leadTimeSemanas);
      const plano = Plano.calcularPlano({
        produto,
        previsaoSemana: prev4[0] || 0,
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
      });
      state.previsoes[produto.id] = { escolha, prev4, seguranca, serie };
      state.planos[produto.id] = plano;
    }
    state.consolidado = Plano.consolidar(Object.values(state.planos));
    state.ahpResultado = Fornecedores.avaliar(state.ahp);
  }

  function metodoLabel() {
    const m = state.previsoes.caprino?.escolha?.metodo || state.metodo;
    return {
      auto: "Automático",
      mediaMovel: "Média móvel",
      ses: "Suavização exponencial",
      regressao: "Regressão linear",
    }[m] || m;
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

    const histCap = (state.dados.DEMANDA.caprino || []).slice(-12);
    const histOvi = (state.dados.DEMANDA.ovino || []).slice(-12);
    const nHist = Math.min(12, histCap.length, histOvi.length);
    const histTotal = histCap.slice(-nHist).map((v, i) => v + histOvi.slice(-nHist)[i]);
    const prevTotal = [0, 1, 2, 3].map((i) =>
      (state.previsoes.caprino?.prev4?.[i] || 0) + (state.previsoes.ovino?.prev4?.[i] || 0));
    const labels = [
      ...Array.from({ length: nHist }, (_, i) => `S${state.semanaAtual - nHist + 1 + i}`),
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
            <span class="badge estimativa">Série ilustrativa</span>
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
          <div class="lista-alertas">${alertasHtml}</div>
        </section>
      </div>

      <p class="nota">Preços e custos usam referências públicas (IBGE/Embrapa) e premissas editáveis. A série de demanda é ilustrativa; importe um CSV na aba Dados para usar dados reais.</p>
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
    if (state.aba === "painel") app.innerHTML = renderPainel();
    else app.innerHTML = renderEmConstrucao(state.aba);
  }

  function preencherSemanas() {
    const sel = document.getElementById("semana");
    if (!sel) return;
    const opcoes = [];
    for (let w = 40; w <= 52; w++) opcoes.push(`<option value="${w}" ${w === state.semanaAtual ? "selected" : ""}>S${w}</option>`);
    opcoes.push(`<option value="53" ${state.semanaAtual === 53 ? "selected" : ""}>S53 (próxima)</option>`);
    sel.innerHTML = opcoes.join("");
  }

  function restaurarDados() {
    state.dados = DADOS.clonarDados();
    state.metodo = "auto";
    state.parametros = { ...DADOS.PARAMETROS };
    state.cenario = { demandaPct: 0, precoPct: 0, capacidadePct: 0 };
    state.ahp = Fornecedores.restaurarExemplo();
    try { localStorage.removeItem(CHAVE); } catch (_) {}
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
      const acao = event.target.closest("[data-acao]");
      if (!acao) return;
      if (acao.dataset.acao === "recalcular") {
        calcularTudo();
        salvar();
        render();
        toast("Plano recalculado com os parâmetros atuais.");
      }
      if (acao.dataset.acao === "restaurar-dados") {
        restaurarDados();
        toast("Dados de exemplo restaurados.");
      }
    });

    const semana = document.getElementById("semana");
    if (semana) {
      semana.addEventListener("change", (event) => {
        state.semanaAtual = Number(event.target.value) || 52;
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
