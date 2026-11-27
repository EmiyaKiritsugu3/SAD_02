// Mercadinho Seridó — interface das três abas.
const App = (() => {
  const state = {
    aba: "compras",
    produtos: [],
    dias: [],
    exemplo: false,
    produtoSelecionado: null,
    dataSelecionada: Vendas.normalizarDia(new Date()),
    periodo: "semana",
    periodoReferencia: Vendas.normalizarDia(new Date()),
    metodo: "auto",
    parametros: { janela: 4, alfa: 0.3 },
    semanaReferencia: null,
    produtoPrevisao: null,
    diasCobertura: 1,
    filtro: "",
    produtoEditando: null,
    erroPersistencia: null,
  };

  const nfBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const nfQtd = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
  let toastTimer = null;

  function esc(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function fmtBRL(valor) {
    return nfBRL.format(Number(valor) || 0);
  }

  function fmtQtd(valor) {
    return nfQtd.format(Number(valor) || 0);
  }

  function fmtData(iso) {
    if (!iso) return "";
    const [, mes, dia] = iso.split("-");
    return `${dia}/${mes}`;
  }

  function fmtDataLonga(iso) {
    if (!iso) return "";
    return new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR");
  }

  function fmtPct(valor) {
    if (valor === null || valor === undefined || !Number.isFinite(Number(valor))) return "—";
    return `${(Number(valor) * 100).toFixed(1).replace(".", ",")}%`;
  }

  function fmtMes(mes) {
    const texto = new Date(`${mes}-01T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  function normalizarBusca(texto) {
    const normalizado = String(texto ?? "").normalize("NFD");
    let saida = "";
    for (const caractere of normalizado) {
      const codigo = caractere.codePointAt(0);
      if (codigo >= 0x0300 && codigo <= 0x036f) continue;
      saida += caractere.toLowerCase();
    }
    return saida;
  }

  function metodoLabel(metodo) {
    return {
      mediaMovel: "Média móvel",
      ses: "Suavização exponencial",
      regressao: "Regressão linear",
    }[metodo] || metodo || "—";
  }

  function metodoDetalhe(prev) {
    if (!prev) return "";
    if (prev.metodo === "mediaMovel") return `${metodoLabel(prev.metodo)} (${prev.params?.janela || 4} semanas)`;
    if (prev.metodo === "ses") return `${metodoLabel(prev.metodo)} (α ${String(prev.params?.alfa ?? 0.3).replace(".", ",")})`;
    return metodoLabel(prev.metodo);
  }

  function toast(mensagem, erro = false) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = mensagem;
    el.classList.toggle("erro", erro);
    el.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 3800);
  }

  function atualizarAvisoPersistencia() {
    const el = document.getElementById("aviso-persistencia");
    if (!el) return;
    el.hidden = !state.erroPersistencia;
    el.textContent = state.erroPersistencia || "";
  }

  function salvar() {
    const ok = Estado.salvar({
      versao: 2,
      produtos: state.produtos,
      dias: state.dias,
      exemplo: state.exemplo,
      politica: { diasCobertura: state.diasCobertura },
    });
    state.erroPersistencia = ok ? null : "Não foi possível gravar os dados neste navegador. As alterações valem só nesta sessão.";
    atualizarAvisoPersistencia();
    return ok;
  }

  function salvarComAviso(mensagem) {
    const ok = salvar();
    toast(ok ? mensagem : "Alteração feita, mas não foi possível gravar no navegador.", !ok);
    return ok;
  }

  function aplicarEstado(estado) {
    state.produtos = Array.isArray(estado.produtos) ? estado.produtos : [];
    state.dias = Array.isArray(estado.dias) ? estado.dias : [];
    state.exemplo = Boolean(estado.exemplo);
    const dias = Number(estado.politica?.diasCobertura);
    state.diasCobertura = Number.isInteger(dias) && dias >= 1 && dias <= 7 ? dias : 1;
    if (!state.produtos.some((p) => p.id === state.produtoSelecionado)) {
      state.produtoSelecionado = state.produtos[0]?.id ?? null;
    }
    state.dataSelecionada = Vendas.normalizarDia(state.dataSelecionada || new Date());
    state.periodoReferencia = Vendas.normalizarDia(state.periodoReferencia || state.dataSelecionada || new Date());
    garantirSelecoes();
    state.produtoEditando = null;
  }

  function iniciar() {
    let estado;
    let aviso = null;
    try {
      const resultado = Estado.carregar();
      estado = resultado.estado;
      aviso = resultado.aviso;
    } catch (_) {
      estado = Estado.estadoExemplo();
      aviso = "Não foi possível acessar o armazenamento. Carregamos o exemplo.";
    }
    aplicarEstado(estado);
    ligarEventos();
    render();
    if (aviso) toast(aviso, true);
  }

  function semanasDisponiveis() {
    const semanas = new Set();
    for (const dia of state.dias) semanas.add(Vendas.normalizarSemana(dia.data));
    return [...semanas].sort((a, b) => a.localeCompare(b));
  }

  function garantirSelecoes() {
    const ids = state.produtos.map((p) => p.id);
    if (!ids.includes(state.produtoPrevisao)) {
      const ranking = state.produtos
        .map((p) => {
          const valores = Vendas.serieSemanal(state.dias, p.id).valores;
          return { id: p.id, total: valores.reduce((soma, valor) => soma + valor, 0) };
        })
        .sort((a, b) => b.total - a.total);
      state.produtoPrevisao = ranking[0]?.id ?? null;
    }
    const semanas = semanasDisponiveis();
    if (!semanas.includes(state.semanaReferencia)) {
      state.semanaReferencia = semanas.at(-1) ?? null;
    }
  }

  function normalizarParametros() {
    const janela = Math.round(Number(state.parametros.janela));
    state.parametros.janela = Number.isFinite(janela) ? Math.min(12, Math.max(1, janela)) : 4;
    const alfa = Number(state.parametros.alfa);
    state.parametros.alfa = Number.isFinite(alfa) ? Math.min(0.95, Math.max(0.05, alfa)) : 0.3;
  }

  function calcularPrevisao(serie) {
    const valores = Array.isArray(serie) ? serie : [];
    if (valores.length < 4) return null;
    normalizarParametros();
    const metodos = ["auto", "mediaMovel", "ses", "regressao"];
    const metodo = metodos.includes(state.metodo) ? state.metodo : "auto";
    if (metodo === "auto") {
      if (valores.length < 8) {
        const params = { janela: Math.min(4, valores.length) };
        return {
          metodo: "mediaMovel",
          params,
          prev4: Previsao.prever(valores, "mediaMovel", params, 4),
          metricas: Previsao.backtest(valores, "mediaMovel", params, 4),
        };
      }
      const escolha = Previsao.escolherMelhor(valores, 4);
      return { ...escolha, prev4: Previsao.prever(valores, escolha.metodo, escolha.params, 4) };
    }
    let params = {};
    if (metodo === "ses") params = { alfa: Number(state.parametros.alfa) || 0.3 };
    else if (metodo === "mediaMovel") {
      const janela = Math.min(Number(state.parametros.janela) || 4, valores.length);
      params = { janela };
    }
    return {
      metodo,
      params,
      prev4: Previsao.prever(valores, metodo, params, 4),
      metricas: Previsao.backtest(valores, metodo, params, 4),
    };
  }

  function acoesPrevisao() {
    garantirSelecoes();
    const semanas = semanasDisponiveis();
    const opcoes = semanas.length
      ? semanas.map((s) => `<option value="${s}" ${s === state.semanaReferencia ? "selected" : ""}>${fmtDataLonga(s)}</option>`).join("")
      : `<option value="">Sem vendas</option>`;
    return `
      <div class="semana">
        <label for="semana-referencia">Semana de referência</label>
        <select id="semana-referencia" ${semanas.length ? "" : "disabled"}>${opcoes}</select>
      </div>
      <button class="botao" type="button" data-acao="recalcular">Recalcular</button>`;
  }

  function acoesCompras() {
    const proxima = Vendas.proximaSemana(state.dias);
    if (!proxima) return `<div class="semana-label">Sem vendas registradas</div>`;
    return `<div class="semana-label">Compra para a semana de<br><strong>${fmtDataLonga(proxima)}</strong></div>`;
  }

  function acoesVendas() {
    const ultimo = Vendas.ultimoDia(state.dias);
    if (!ultimo) return `<div class="semana-label">Nenhuma venda registrada</div>`;
    return `<div class="semana-label">Último dia<br><strong>${fmtDataLonga(ultimo)}</strong></div>`;
  }

  function acoesProdutos() {
    const rotulo = state.exemplo ? "Dados de exemplo" : "Seus dados";
    return `<span class="badge ${state.exemplo ? "" : "ok"}">${rotulo}</span>`;
  }

  function renderTopbar() {
    const titulo = document.getElementById("titulo-aba");
    const subtitulo = document.getElementById("subtitulo-aba");
    const acoes = document.getElementById("topbar-acoes");
    if (!titulo || !subtitulo || !acoes) return;
    const info = {
      compras: ["Compras", "Quanto comprar de cada produto para a próxima semana."],
      previsao: ["Previsão de demanda", "Histórico, métodos e erro de previsão."],
      vendas: ["Vendas", "Lance o dia e consulte por dia, semana, mês ou ano."],
      produtos: ["Produtos", "Os produtos que o mercadinho compra e vende."],
    }[state.aba] || ["Compras", ""];
    titulo.textContent = info[0];
    subtitulo.textContent = info[1];
    const porAba = {
      previsao: acoesPrevisao,
      compras: acoesCompras,
      vendas: acoesVendas,
      produtos: acoesProdutos,
    };
    acoes.innerHTML = (porAba[state.aba] || acoesCompras)();
  }

  function render() {
    document.querySelectorAll(".nav-item[data-aba]").forEach((botao) => {
      const ativa = botao.dataset.aba === state.aba;
      botao.classList.toggle("ativo", ativa);
      if (ativa) botao.setAttribute("aria-current", "page");
      else botao.removeAttribute("aria-current");
    });
    const badge = document.getElementById("badge-exemplo");
    if (badge) badge.hidden = !state.exemplo;
    atualizarAvisoPersistencia();
    renderTopbar();

    if (state.aba === "previsao") renderPrevisao();
    else if (state.aba === "vendas") renderVendas();
    else if (state.aba === "produtos") renderProdutos();
    else renderCompras();
  }

  function previsoesMap() {
    const mapa = {};
    for (const produto of state.produtos) {
      const serie = Vendas.serieSemanal(state.dias, produto.id);
      const prev = calcularPrevisao(serie.valores);
      mapa[produto.id] = { serie, prev, previsao: prev?.prev4?.[0] ?? null };
    }
    return mapa;
  }

  function previsoesReferencia() {
    const mapa = {};
    for (const produto of state.produtos) {
      const completa = Vendas.serieSemanal(state.dias, produto.id);
      const corte = Previsao.serieAte(completa.valores, completa.semanas, state.semanaReferencia);
      mapa[produto.id] = {
        semanas: corte.semanas,
        valores: corte.serie,
        prev: calcularPrevisao(corte.serie),
      };
    }
    return mapa;
  }

  function cardGraficoPrevisao(produto, dados) {
    const temPrevisao = Boolean(dados.prev);
    const hist = dados.valores.slice(-52);
    const histSemanas = dados.semanas.slice(-52);
    const opcoesProduto = state.produtos
      .map((p) => `<option value="${esc(p.id)}" ${p.id === produto.id ? "selected" : ""}>${esc(p.nome)}</option>`)
      .join("");
    const futuras = temPrevisao
      ? dados.prev.prev4.map((_, i) => fmtData(Vendas.adicionarSemanas(histSemanas.at(-1), i + 1)))
      : [];

    let grafico = `<p class="sem-dados">Sem vendas registradas até a semana de referência.</p>`;
    if (hist.length > 0) {
      const labels = [...histSemanas.map(fmtData), ...futuras];
      const historico = [...hist, ...new Array(futuras.length).fill(null)];
      const linhaPrevisao = temPrevisao
        ? [...new Array(Math.max(0, hist.length - 1)).fill(null), hist.at(-1), ...dados.prev.prev4]
        : [];
      const series = temPrevisao
        ? [
            { nome: "Histórico", valores: historico, cor: "#b5522f" },
            { nome: "Previsão", valores: linhaPrevisao, cor: "#5d6b4a", tracejado: true },
          ]
        : [{ nome: "Histórico", valores: historico, cor: "#b5522f" }];
      grafico = Charts.linha({
        series,
        labels,
        width: 1000,
        height: 360,
        rotuloY: produto.unidade,
        ariaLabel: `${produto.nome}: histórico de até 52 semanas e previsão das próximas 4.`,
      });
    }

    const metricas = dados.prev?.metricas;
    const reais = metricas?.reais || [];
    const previstos = metricas?.previstos || [];
    const previstosTexto = previstos.map((v) => `${fmtQtd(v)} ${produto.unidade}`).join(" · ");
    const reaisTexto = reais.map((v) => `${fmtQtd(v)} ${produto.unidade}`).join(" · ");
    const backtest = reais.length
      ? `Backtest — previsto: ${previstosTexto} | real: ${reaisTexto}`
      : "Registre pelo menos 4 semanas até a referência para gerar a previsão e o backtest.";
    const mae = metricas?.mae;
    const mape = metricas?.mape;

    return `
      <section class="card span-2" aria-labelledby="prev-${esc(produto.id)}">
        <div class="card-head">
          <div>
            <h2 id="prev-${esc(produto.id)}">${esc(produto.nome)}</h2>
            <p>Histórico de até 52 semanas e previsão das próximas 4.</p>
          </div>
          <label class="campo campo-produto">Produto
            <select data-previsao-select aria-label="Produto do gráfico">${opcoesProduto}</select>
          </label>
        </div>
        ${grafico}
        ${temPrevisao ? `<div class="metricas">
          <span>Método: <strong>${esc(metodoDetalhe(dados.prev))}</strong></span>
          <span>MAE: <strong>${fmtQtd(mae)} ${esc(produto.unidade)}</strong></span>
          <span>MAPE: <strong>${fmtPct(mape)}</strong></span>
        </div>` : ""}
        <p class="nota">${esc(backtest)}</p>
      </section>`;
  }

  function renderPrevisao() {
    const app = document.getElementById("app");
    if (!app) return;

    if (state.produtos.length === 0) {
      app.innerHTML = estadoVazio(
        "Cadastre um produto para prever",
        "A previsão usa o histórico semanal de vendas de cada produto. Cadastre os produtos e lance alguns dias de venda.",
        `<button class="botao" type="button" data-acao="ir-produtos">Cadastrar produtos</button>
         <button class="botao secundario" type="button" data-acao="carregar-exemplo">Carregar exemplo</button>`,
      );
      return;
    }

    garantirSelecoes();
    normalizarParametros();
    const mapa = previsoesReferencia();
    const semanas = semanasDisponiveis();
    const referencia = state.semanaReferencia || semanas.at(-1);
    const ultimaSemana = semanas.at(-1);
    const referenciaAnterior = Boolean(referencia && ultimaSemana && referencia < ultimaSemana);
    const opcoesMetodo = [
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
          <span class="badge ${state.metodo === "auto" ? "ok" : ""}">${state.metodo === "auto" ? "Automático" : "Manual"}</span>
        </div>
        <div class="form-grid">
          <label class="campo">Método
            <select data-campo="metodo">${opcoesMetodo}</select>
          </label>
          <label class="campo">Janela da média móvel
            <input type="number" data-campo="janela" min="1" max="12" step="1" value="${state.parametros.janela}" ${state.metodo === "auto" ? "disabled" : ""}>
          </label>
          <label class="campo">Alfa da suavização
            <input type="number" data-campo="alfa" min="0.05" max="0.95" step="0.05" value="${state.parametros.alfa}" ${state.metodo === "auto" ? "disabled" : ""}>
          </label>
        </div>
        <p class="nota">A semana de referência no topo corta o histórico. O backtest treina antes das últimas 4 semanas e compara com o realizado. MAE é o erro médio absoluto; MAPE, o erro percentual médio. O método escolhido também alimenta a aba Compras. A escolha vale para esta sessão; no modo manual, o método é aplicado mesmo com pouco histórico e o backtest usa as semanas disponíveis.</p>
      </section>`;

    const produto = Produtos.porId(state.produtos, state.produtoPrevisao) || state.produtos[0];
    state.produtoPrevisao = produto.id;
    const graficoProduto = cardGraficoPrevisao(produto, mapa[produto.id]);

    const linhasMetricas = state.produtos.map((produto) => {
      const prev = mapa[produto.id].prev;
      if (!prev) {
        return `<tr><td>${esc(produto.nome)}</td><td>—</td><td class="num">—</td><td class="num">—</td></tr>`;
      }
      return `<tr>
        <td>${esc(produto.nome)}</td>
        <td>${esc(metodoDetalhe(prev))}</td>
        <td class="num">${fmtQtd(prev.metricas?.mae)} ${esc(produto.unidade)}</td>
        <td class="num">${fmtPct(prev.metricas?.mape)}</td>
      </tr>`;
    }).join("");

    const semanasFuturas = referencia
      ? [0, 1, 2, 3].map((i) => Vendas.adicionarSemanas(referencia, i + 1))
      : [];
    const linhasProximas = referencia ? state.produtos.map((produto) => {
      const valores = [0, 1, 2, 3].map((i) => mapa[produto.id].prev?.prev4?.[i]);
      return `<tr>
        <td><span class="produto-nome"><strong>${esc(produto.nome)}</strong><small>${esc(produto.unidade)}</small></span></td>
        ${valores.map((valor) => `<td class="num">${valor == null ? "—" : fmtQtd(valor)}</td>`).join("")}
      </tr>`;
    }).join("") : `<tr><td colspan="${semanasFuturas.length + 1}" class="sem-dados">Sem vendas registradas até a referência.</td></tr>`;

    app.innerHTML = `<div class="grid-2">
      ${controles}
      ${graficoProduto}
      <section class="card" aria-labelledby="titulo-metricas">
        <div class="card-head">
          <div>
            <h2 id="titulo-metricas" tabindex="-1">Erro de previsão por produto</h2>
            <p>MAE e MAPE do método escolhido para cada produto, no backtest de 4 semanas.</p>
          </div>
        </div>
        <div class="tabela-wrap">
          <table>
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
            <p>Previsão das 4 semanas seguintes à semana de referência.</p>
          </div>
        </div>
        <div class="tabela-wrap">
          <table class="tabela-previsao">
            <caption>Quantidade prevista por produto, na unidade de cada um.</caption>
            <thead><tr><th>Produto</th>${semanasFuturas.map((s) => `<th class="num">${fmtData(s)}</th>`).join("")}</tr></thead>
            <tbody>${linhasProximas}</tbody>
          </table>
        </div>
        ${referenciaAnterior ? `<p class="nota">A lista de Compras usa sempre a última semana lançada; a referência acima é só para consulta.</p>` : ""}
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
          <li><strong>Semana de referência:</strong> corta o histórico no ponto escolhido; a previsão é sempre das 4 semanas seguintes.</li>
          <li><strong>Semana corrente:</strong> se ainda não terminou, entra no histórico com os dias já lançados; a previsão é revista quando a semana fecha.</li>
          <li><strong>Limite:</strong> o histórico é ilustrativo. Lance as vendas diárias para usar os dados reais do mercadinho.</li>
        </ul>
      </section>
    </div>`;
  }

  function estadoVazio(titulo, texto, acoes) {
    return `
      <div class="estado-vazio">
        <h2>${esc(titulo)}</h2>
        <p>${esc(texto)}</p>
        <div class="acoes">${acoes}</div>
      </div>`;
  }

  function renderCompras() {
    const app = document.getElementById("app");
    if (!app) return;

    if (state.produtos.length === 0) {
      app.innerHTML = estadoVazio(
        "Comece cadastrando seus produtos",
        "Cadastre os produtos do mercadinho e lance as vendas de algumas semanas para o app prever a próxima compra.",
        `<button class="botao" type="button" data-acao="ir-produtos">Cadastrar produtos</button>
         <button class="botao secundario" type="button" data-acao="carregar-exemplo">Carregar exemplo</button>`,
      );
      return;
    }

    const dados = previsoesMap();
    const previsoes = Object.fromEntries(state.produtos.map((p) => [p.id, dados[p.id].previsao]));
    const itens = Compras.lista(state.produtos, previsoes, state.diasCobertura);
    const total = Compras.total(itens);
    const semDados = Compras.semDados(itens);
    const hoje = Vendas.normalizarSemana(new Date());
    const proxima = Vendas.proximaSemana(state.dias);
    const atrasada = Vendas.atrasada(Vendas.ultimaSemana(state.dias), hoje);
    const filtro = normalizarBusca(state.filtro);
    const visiveis = itens.filter((item) => !filtro || normalizarBusca(item.produto.nome).includes(filtro));

    if (!state.produtoSelecionado || !state.produtos.some((p) => p.id === state.produtoSelecionado)) {
      state.produtoSelecionado = visiveis[0]?.produto.id ?? state.produtos[0].id;
    }
    const produtoSel = Produtos.porId(state.produtos, state.produtoSelecionado) || state.produtos[0];
    const dadosSel = dados[produtoSel.id];
    const itemSel = itens.find((item) => item.produto.id === produtoSel.id);

    const linhas = itens.map((item) => {
      const p = item.produto;
      const previsao = item.semDados
        ? `<span class="sem-dados">sem dados</span>`
        : `<span class="previsao-valor">${fmtQtd(item.previsao)}</span>`;
      const compra = (() => {
        if (item.semDados) return `<span class="sem-dados">—</span>`;
        if (item.sugestao === 0) return `<span class="estoque-cobre">estoque cobre</span>`;
        return `<strong>${fmtQtd(item.sugestao)} ${esc(p.unidade)}</strong>`;
      })();
      const custo = item.semDados || item.sugestao === 0 ? "—" : fmtBRL(item.custo);
      const minimo = item.semDados
        ? `<span class="sem-dados">—</span>`
        : `<span class="minimo-valor">${fmtQtd(item.minimo)}</span> <small class="minimo-origem">${item.minimoManual ? "manual" : "auto"}</small>`;
      return `
        <tr class="linha-produto ${p.id === produtoSel.id ? "selecionado" : ""}"
            data-produto="${esc(p.id)}" data-nome="${esc(normalizarBusca(p.nome))}"
            aria-selected="${p.id === produtoSel.id}" tabindex="0" title="Ver a previsão deste produto">
          <td><span class="produto-nome"><strong>${esc(p.nome)}</strong><small>${esc(p.unidade)}</small></span></td>
          <td class="num">${previsao}</td>
          <td class="num">${fmtQtd(p.estoqueAtual)}</td>
          <td class="num">${minimo}</td>
          <td class="num">${compra}</td>
          <td class="num">${custo}</td>
        </tr>`;
    }).join("");

    const avisoSemVendas = state.dias.length === 0
      ? `<div class="aviso"><strong>Sem vendas ainda.</strong> Cadastre o primeiro dia para o app calcular a previsão e a compra.</div>`
      : "";
    const avisoAtraso = atrasada
      ? `<div class="aviso"><strong>Última venda antiga.</strong> A compra é para a semana seguinte à última venda registrada (${fmtDataLonga(proxima)}). Atualize as vendas para uma previsão mais recente.</div>`
      : "";

    app.innerHTML = `
      ${state.exemplo ? `<div class="aviso"><strong>Dados de exemplo.</strong> Edite ou limpe em Produtos para usar os seus.</div>` : ""}
      ${avisoSemVendas}
      ${avisoAtraso}
      <div class="cards-resumo">
        <article class="card-resumo"><small>Produtos</small><strong>${itens.length}</strong></article>
        <article class="card-resumo"><small>Custo estimado</small><strong>${fmtBRL(total)}</strong></article>
        <article class="card-resumo"><small>Sem dados</small><strong>${semDados}</strong></article>
      </div>
      <section class="card" aria-labelledby="titulo-lista-compras">
        <div class="card-head">
          <div><h2 id="titulo-lista-compras">Lista de compras</h2><p>Previsão da próxima semana + mínimo − estoque atual.</p></div>
          <span class="badge" id="badge-filtro" data-total="${itens.length}">${visiveis.length} de ${itens.length}</span>
        </div>
        <div class="filtro">
          <label for="filtro-compras">Buscar</label>
          <input id="filtro-compras" data-campo="filtro" type="search" placeholder="Nome do produto" value="${esc(state.filtro)}">
          <label for="cobertura-minimo">Cobertura do mínimo</label>
          <input id="cobertura-minimo" class="filtro-numero" data-campo="cobertura" type="number" min="1" max="7" step="1" value="${state.diasCobertura}" inputmode="numeric">
          <span class="filtro-unidade">dia(s)</span>
        </div>
        <div class="tabela-wrap">
          <table id="tabela-compras">
            <thead><tr><th>Produto</th><th class="num">Previsão</th><th class="num">Estoque</th><th class="num">Mínimo</th><th class="num">Comprar</th><th class="num">Custo</th></tr></thead>
            <tbody>${linhas}<tr id="sem-resultado" hidden><td colspan="6" class="sem-dados">Nenhum produto encontrado.</td></tr></tbody>
          </table>
        </div>
        <p class="nota">Mínimo automático = previsão da semana ÷ 7 × cobertura. Um estoque mínimo manual no produto substitui o automático. O estoque é atualizado por você; o app não controla o caixa nem as compras.</p>
      </section>
      ${renderGraficoProduto(produtoSel, dadosSel, itemSel)}
    `;
    filtrarLinhas();
  }

  function renderGraficoProduto(produto, dados, item) {
    const prev = dados?.prev;
    if (!prev) {
      return `
        <section class="card grafico-card">
          <div class="card-head"><div><h2>${esc(produto.nome)}</h2><p>Previsão de vendas por semana.</p></div></div>
          <p class="sem-dados">Ainda não há previsão para este produto. Registre pelo menos 4 semanas de vendas.</p>
          <div class="acoes"><button class="botao secundario" type="button" data-acao="ir-vendas">Ir para Vendas</button></div>
        </section>`;
    }

    const serie = dados.serie;
    const hist = serie.valores.slice(-12);
    const semanas = serie.semanas.slice(-12);
    const nHist = Math.min(12, hist.length);
    const ultima = semanas.at(-1);
    const labels = [
      ...semanas.map(fmtData),
      ...prev.prev4.map((_, i) => fmtData(Vendas.adicionarSemanas(ultima, i + 1))),
    ];
    const historico = [...hist, null, null, null, null];
    const previsao = [...new Array(hist.length - 1).fill(null), hist.at(-1), ...prev.prev4];
    const grafico = Charts.linha({
      series: [
        { nome: "Histórico", valores: historico, cor: "#b5522f" },
        { nome: "Previsão", valores: previsao, cor: "#5d6b4a", tracejado: true },
      ],
      labels,
      height: 300,
      rotuloY: produto.unidade,
    });
    const mae = prev.metricas?.mae;
    const mape = prev.metricas?.mape;
    const reais = prev.metricas?.reais || [];
    const previstos = prev.metricas?.previstos || [];
    const semanasBacktest = serie.semanas.slice(-reais.length);
    const backtest = reais.length > 0
      ? `<div class="tabela-wrap"><table class="tabela-backtest"><thead><tr><th>Semana</th><th class="num">Previsto</th><th class="num">Real</th></tr></thead><tbody>${reais.map((real, i) => `<tr><td>${fmtData(semanasBacktest[i])}</td><td class="num">${fmtQtd(previstos[i])} ${esc(produto.unidade)}</td><td class="num">${fmtQtd(real)} ${esc(produto.unidade)}</td></tr>`).join("")}</tbody></table></div>`
      : `<p class="sem-dados">Backtest indisponível para este produto.</p>`;
    const minimo = item?.minimo ?? 0;
    const origemMinimo = item?.minimoManual
      ? "manual"
      : (state.diasCobertura === 1 ? "1 dia da previsão" : `${state.diasCobertura} dias da previsão`);
    return `
      <section class="card grafico-card" aria-labelledby="grafico-produto">
        <div class="card-head">
          <div><h2 id="grafico-produto" tabindex="-1">${esc(produto.nome)}</h2><p>Últimas ${nHist} semanas e previsão das próximas 4.</p></div>
          <span class="badge">${nHist} + 4 · ${esc(produto.unidade)}</span>
        </div>
        ${grafico}
        <details class="detalhes">
          <summary>Como calculamos</summary>
          <p><strong>Método:</strong> ${esc(metodoDetalhe(prev))}. O histórico é cortado na última semana lançada; a previsão é para a semana seguinte. O método pode ser trocado na aba Previsão.</p>
          <div class="metricas">
            <span>MAE: <strong>${mae == null ? "—" : `${fmtQtd(mae)} ${esc(produto.unidade)}`}</strong></span>
            <span>MAPE: <strong>${mape == null ? "—" : `${(mape * 100).toFixed(1).replace(".", ",")}%`}</strong></span>
          </div>
          <p><strong>Backtest:</strong> últimas ${reais.length} semanas.</p>
          ${backtest}
          <code class="formula">compra = max(0, previsão + mínimo − estoque)
previsão = ${fmtQtd(dados.previsao)} ${esc(produto.unidade)}
estoque = ${fmtQtd(produto.estoqueAtual)} ${esc(produto.unidade)}
mínimo = ${fmtQtd(minimo)} ${esc(produto.unidade)} (${esc(origemMinimo)})</code>
        </details>
      </section>`;
  }

  function periodoLabel(resumo, periodo) {
    if (periodo === "dia") return fmtDataLonga(resumo.inicio);
    if (periodo === "semana") return `${fmtData(resumo.inicio)} a ${fmtDataLonga(resumo.fim)}`;
    if (periodo === "mes") return fmtMes(resumo.inicio.slice(0, 7));
    return resumo.inicio.slice(0, 4);
  }

  function renderVendas() {
    const app = document.getElementById("app");
    if (!app) return;

    if (state.produtos.length === 0) {
      app.innerHTML = estadoVazio(
        "Cadastre um produto primeiro",
        "As vendas são lançadas por produto. Cadastre pelo menos um produto para começar.",
        `<button class="botao" type="button" data-acao="ir-produtos">Cadastrar produtos</button>
         <button class="botao secundario" type="button" data-acao="carregar-exemplo">Carregar exemplo</button>`,
      );
      return;
    }

    state.dataSelecionada = Vendas.normalizarDia(state.dataSelecionada);
    const dia = state.dias.find((d) => d.data === state.dataSelecionada);
    const valores = dia?.valores || {};
    const linhas = state.produtos.map((produto) => {
      const passo = produto.unidade === "un" ? "1" : "0.1";
      return `
        <tr>
          <td><span class="produto-nome"><strong>${esc(produto.nome)}</strong><small>${esc(produto.unidade)}</small></span></td>
          <td class="num"><input type="number" min="0" step="${passo}" value="${valores[produto.id] ?? 0}"
            data-venda-produto="${esc(produto.id)}" aria-label="Quantidade vendida de ${esc(produto.nome)}"></td>
        </tr>`;
    }).join("");

    const resumo = Vendas.resumoPeriodo(state.dias, state.produtos, state.periodo, state.periodoReferencia);
    const opcoesPeriodo = [["dia", "Dia"], ["semana", "Semana"], ["mes", "Mês"], ["ano", "Ano"]]
      .map(([valor, rotulo]) => `<option value="${valor}" ${state.periodo === valor ? "selected" : ""}>${rotulo}</option>`)
      .join("");
    const linhasResumo = state.produtos.map((produto) => {
      const item = resumo.porProduto[produto.id] || { quantidade: 0, receita: 0 };
      return `<tr>
        <td><span class="produto-nome"><strong>${esc(produto.nome)}</strong><small>${esc(produto.unidade)}</small></span></td>
        <td class="num">${fmtQtd(item.quantidade)} ${esc(produto.unidade)}</td>
        <td class="num">${fmtBRL(item.receita)}</td>
      </tr>`;
    }).join("");
    const produtosComVenda = state.produtos.filter((p) => (resumo.porProduto[p.id]?.quantidade || 0) > 0).length;

    app.innerHTML = `
      ${state.exemplo ? `<div class="aviso"><strong>Dados de exemplo.</strong> Edite ou limpe em Produtos para usar os seus.</div>` : ""}
      <section class="card" aria-labelledby="titulo-lancamento">
        <div class="card-head">
          <div><h2 id="titulo-lancamento" tabindex="-1">Lançamento do dia</h2><p>Escolha o dia, preencha as quantidades e salve.</p></div>
          <span class="badge ${dia ? "ok" : ""}">${dia ? "Dia registrado" : "Novo dia"}</span>
        </div>
        <div class="semana-barra">
          <label class="campo">Dia
            <input id="dia-data" type="date" max="${Vendas.normalizarDia(new Date())}" value="${state.dataSelecionada}">
          </label>
          <div class="acoes">
            <button class="botao secundario pequeno" type="button" data-acao="dia-anterior">← Dia anterior</button>
            <button class="botao secundario pequeno" type="button" data-acao="hoje">Hoje</button>
            <button class="botao secundario pequeno" type="button" data-acao="dia-proximo">Próximo dia →</button>
          </div>
        </div>
        <div class="tabela-wrap">
          <table class="tabela-vendas">
            <thead><tr><th>Produto</th><th class="num">Quantidade vendida</th></tr></thead>
            <tbody>${linhas}</tbody>
          </table>
        </div>
        <div class="acoes">
          <button class="botao" type="button" data-acao="salvar-dia">Salvar dia</button>
          ${dia ? `<button class="botao perigo" type="button" data-acao="excluir-dia">Excluir dia</button>` : ""}
        </div>
        <p class="nota">Quantidades vazias valem zero. Um dia sem nenhum valor não é salvo.</p>
      </section>
      <section class="card" aria-labelledby="titulo-resumo">
        <div class="card-head">
          <div><h2 id="titulo-resumo">Resumo do período</h2><p>${esc(periodoLabel(resumo, state.periodo))}</p></div>
          <span class="badge">${produtosComVenda} produto(s) com venda</span>
        </div>
        <div class="semana-barra">
          <label class="campo">Período
            <select id="periodo-select">${opcoesPeriodo}</select>
          </label>
          <div class="acoes">
            <button class="botao secundario pequeno" type="button" data-acao="periodo-anterior">← Período</button>
            <button class="botao secundario pequeno" type="button" data-acao="periodo-hoje">Hoje</button>
            <button class="botao secundario pequeno" type="button" data-acao="periodo-proximo">Período →</button>
          </div>
        </div>
        <div class="tabela-wrap">
          <table>
            <thead><tr><th>Produto</th><th class="num">Quantidade</th><th class="num">Receita</th></tr></thead>
            <tbody>${linhasResumo}</tbody>
          </table>
        </div>
        <div class="resumo-total"><span>Receita estimada no período</span><strong>${fmtBRL(resumo.totalReceita)}</strong></div>
        <p class="nota">A previsão e a compra usam a semana; o período é só para consulta.</p>
      </section>`;
  }

  function valorForm(valor) {
    return valor === undefined || valor === null ? "" : String(valor);
  }

  function renderProdutos() {
    const app = document.getElementById("app");
    if (!app) return;
    const editando = state.produtoEditando ? Produtos.porId(state.produtos, state.produtoEditando) : null;
    const p = editando || { nome: "", unidade: "un", custo: "", preco: "", estoqueAtual: 0, estoqueMinimo: 0 };
    const opcoesUnidade = Produtos.UNIDADES.map((u) => `<option value="${u}" ${p.unidade === u ? "selected" : ""}>${u}</option>`).join("");
    const linhas = state.produtos.map((produto) => {
      const minimo = produto.estoqueMinimo > 0
        ? `${fmtQtd(produto.estoqueMinimo)} ${esc(produto.unidade)} <small class="minimo-origem">manual</small>`
        : `<span class="sem-dados">auto</span>`;
      return `
      <tr>
        <td><span class="produto-nome"><strong>${esc(produto.nome)}</strong><small>${esc(produto.unidade)}</small></span></td>
        <td class="num">${fmtBRL(produto.custo)}</td>
        <td class="num">${fmtBRL(produto.preco)}</td>
        <td class="num">${fmtQtd(produto.estoqueAtual)} ${esc(produto.unidade)}</td>
        <td class="num">${minimo}</td>
        <td>
          <div class="acoes-linha">
            <button class="botao secundario pequeno" type="button" data-acao="editar-produto" data-produto="${esc(produto.id)}">Editar</button>
            <button class="botao perigo pequeno" type="button" data-acao="remover-produto" data-produto="${esc(produto.id)}">Remover</button>
          </div>
        </td>
      </tr>`;
    }).join("");

    app.innerHTML = `
      <section class="card form-produto" aria-labelledby="titulo-form-produto">
        <div class="card-head">
          <div><h2 id="titulo-form-produto">${editando ? "Editar produto" : "Novo produto"}</h2><p>O custo é usado na compra; o preço, na receita.</p></div>
        </div>
        <form id="form-produto" novalidate>
          <div class="form-grid">
            <label class="campo campo-largo">Nome
              <input name="nome" type="text" maxlength="60" value="${esc(p.nome)}" placeholder="Ex.: Arroz 5 kg" required>
            </label>
            <label class="campo">Unidade
              <select name="unidade">${opcoesUnidade}</select>
            </label>
            <label class="campo">Custo unitário
              <input name="custo" type="number" min="0" step="0.01" value="${valorForm(p.custo)}" inputmode="decimal">
            </label>
            <label class="campo">Preço de venda
              <input name="preco" type="number" min="0" step="0.01" value="${valorForm(p.preco)}" inputmode="decimal">
            </label>
            <label class="campo">Estoque atual
              <input name="estoqueAtual" type="number" min="0" step="0.1" value="${valorForm(p.estoqueAtual)}" inputmode="decimal">
            </label>
            <label class="campo">Estoque mínimo manual
              <input name="estoqueMinimo" type="number" min="0" step="0.1" value="${valorForm(p.estoqueMinimo)}" inputmode="decimal">
              <small class="campo-ajuda">0 = automático (previsão ÷ 7 × cobertura)</small>
            </label>
          </div>
          <div class="acoes">
            <button class="botao" type="submit">${editando ? "Atualizar produto" : "Adicionar produto"}</button>
            ${editando ? `<button class="botao secundario" type="button" data-acao="cancelar-edicao">Cancelar</button>` : ""}
          </div>
          <p id="erro-produto" class="erro" role="alert"></p>
        </form>
      </section>
      <section class="card" aria-labelledby="titulo-lista-produtos">
        <div class="card-head">
          <div><h2 id="titulo-lista-produtos" tabindex="-1">Produtos cadastrados</h2><p>${state.produtos.length} produto(s).</p></div>
          <div class="acoes">
            <button class="botao secundario pequeno" type="button" data-acao="carregar-exemplo">Carregar exemplo</button>
            <button class="botao perigo pequeno" type="button" data-acao="limpar-dados">Limpar dados</button>
          </div>
        </div>
        <div class="tabela-wrap">
          <table class="lista-produtos">
            <thead><tr><th>Produto</th><th class="num">Custo</th><th class="num">Preço</th><th class="num">Estoque</th><th class="num">Mínimo</th><th></th></tr></thead>
            <tbody>${linhas || `<tr><td colspan="6" class="sem-dados">Nenhum produto cadastrado.</td></tr>`}</tbody>
          </table>
        </div>
      </section>`;
  }

  function filtrarLinhas() {
    const input = document.querySelector('[data-campo="filtro"]');
    const linhas = [...document.querySelectorAll("#tabela-compras tbody tr[data-produto]")];
    const semResultado = document.getElementById("sem-resultado");
    if (!input || linhas.length === 0) return;
    const filtro = normalizarBusca(input.value.trim());
    let visiveis = 0;
    for (const linha of linhas) {
      const combina = !filtro || (linha.dataset.nome || "").includes(filtro);
      linha.hidden = !combina;
      if (combina) visiveis++;
    }
    const badge = document.getElementById("badge-filtro");
    if (badge) badge.textContent = `${visiveis} de ${badge.dataset.total}`;
    if (semResultado) semResultado.hidden = visiveis > 0;
  }

  function deslocarPeriodo(delta) {
    const base = new Date(`${state.periodoReferencia}T12:00:00`);
    if (state.periodo === "dia") {
      state.periodoReferencia = Vendas.adicionarDias(state.periodoReferencia, delta);
    } else if (state.periodo === "semana") {
      state.periodoReferencia = Vendas.adicionarDias(state.periodoReferencia, delta * 7);
    } else if (state.periodo === "mes") {
      base.setDate(1);
      base.setMonth(base.getMonth() + delta);
      state.periodoReferencia = Vendas.normalizarDia(base);
    } else {
      base.setDate(1);
      base.setMonth(0);
      base.setFullYear(base.getFullYear() + delta);
      state.periodoReferencia = Vendas.normalizarDia(base);
    }
  }

  function capturarDiaEditado() {
    const valores = {};
    document.querySelectorAll("[data-venda-produto]").forEach((input) => {
      valores[input.dataset.vendaProduto] = input.value;
    });
    return { data: state.dataSelecionada, valores };
  }

  function restaurarDiaEditado(draft) {
    if (!draft || draft.data !== state.dataSelecionada) return;
    document.querySelectorAll("[data-venda-produto]").forEach((input) => {
      const valor = draft.valores[input.dataset.vendaProduto];
      if (valor !== undefined) input.value = valor;
    });
  }

  function salvarDia() {
    state.dataSelecionada = Vendas.normalizarDia(state.dataSelecionada);
    const inputs = [...document.querySelectorAll("[data-venda-produto]")];
    const valores = {};
    for (const input of inputs) {
      const valor = input.value.trim() === "" ? 0 : Number(input.value);
      if (!Number.isFinite(valor) || valor < 0) {
        input.setAttribute("aria-invalid", "true");
        toast("Quantidade inválida.", true);
        input.focus();
        return;
      }
      valores[input.dataset.vendaProduto] = valor;
    }
    try {
      state.dias = Vendas.salvarDia(state.dias, state.dataSelecionada, valores, state.produtos);
      state.exemplo = false;
      salvarComAviso("Dia salvo.");
      render();
      document.getElementById("titulo-lancamento")?.focus();
    } catch (err) {
      toast(err.message, true);
    }
  }

  function excluirDia() {
    if (!state.dias.some((d) => d.data === state.dataSelecionada)) return;
    if (!confirm(`Excluir as vendas do dia ${fmtDataLonga(state.dataSelecionada)}?`)) return;
    state.dias = Vendas.removerDia(state.dias, state.dataSelecionada);
    state.exemplo = false;
    salvarComAviso("Dia excluído.");
    render();
  }

  function carregarExemplo() {
    if (!confirm("Substituir os dados atuais pelo exemplo?")) return;
    aplicarEstado(Estado.estadoExemplo());
    state.dataSelecionada = Vendas.normalizarDia(new Date());
    state.periodo = "semana";
    state.periodoReferencia = Vendas.normalizarDia(new Date());
    state.filtro = "";
    state.aba = "compras";
    salvarComAviso("Exemplo carregado.");
    render();
  }

  function limparDados() {
    if (!confirm("Apagar todos os produtos e vendas? Esta ação não pode ser desfeita.")) return;
    aplicarEstado(Estado.estadoVazio());
    state.dataSelecionada = Vendas.normalizarDia(new Date());
    state.periodo = "semana";
    state.periodoReferencia = Vendas.normalizarDia(new Date());
    state.filtro = "";
    state.aba = "produtos";
    salvarComAviso("Dados apagados.");
    render();
  }

  function removerProduto(id) {
    const produto = Produtos.porId(state.produtos, id);
    if (!produto) return;
    if (!confirm(`Remover "${produto.nome}" e apagar todo o histórico de vendas dele?`)) return;
    try {
      state.produtos = Produtos.remover(state.produtos, id);
      state.dias = Vendas.removerProduto(state.dias, id);
      if (state.produtoSelecionado === id) state.produtoSelecionado = state.produtos[0]?.id ?? null;
      state.produtoEditando = null;
      state.exemplo = false;
      salvarComAviso("Produto removido.");
      render();
    } catch (err) {
      toast(err.message, true);
    }
  }

  function salvarProduto(event) {
    event.preventDefault();
    const form = event.target;
    if (!form.matches("#form-produto")) return;
    const dados = new FormData(form);
    const numero = (campo) => {
      const bruto = dados.get(campo);
      const texto = typeof bruto === "string" ? bruto.trim() : "";
      return texto === "" ? Number.NaN : Number(texto);
    };
    const produto = {
      nome: dados.get("nome"),
      unidade: dados.get("unidade"),
      custo: numero("custo"),
      preco: numero("preco"),
      estoqueAtual: numero("estoqueAtual"),
      estoqueMinimo: numero("estoqueMinimo"),
    };
    try {
      const mensagem = state.produtoEditando ? "Produto atualizado." : "Produto adicionado.";
      if (state.produtoEditando) {
        const atual = Produtos.porId(state.produtos, state.produtoEditando);
        const atualizado = Produtos.atualizar(atual, produto, state.produtos);
        state.produtos = state.produtos.map((p) => (p.id === atualizado.id ? atualizado : p));
      } else {
        const novo = Produtos.criar(produto, state.produtos);
        state.produtos = [...state.produtos, novo];
        state.produtoSelecionado = novo.id;
      }
      state.produtoEditando = null;
      state.exemplo = false;
      salvarComAviso(mensagem);
      render();
      document.getElementById("titulo-lista-produtos")?.focus();
    } catch (err) {
      const erro = document.getElementById("erro-produto");
      if (erro) erro.textContent = err.message;
      toast(err.message, true);
    }
  }

  function ligarEventos() {
    document.addEventListener("click", (event) => {
      const aba = event.target.closest("[data-aba]");
      if (aba) {
        event.preventDefault();
        state.aba = aba.dataset.aba;
        render();
        return;
      }

      const linha = event.target.closest("tr.linha-produto[data-produto]");
      if (linha) {
        state.produtoSelecionado = linha.dataset.produto;
        render();
        document.getElementById("grafico-produto")?.focus();
        return;
      }

      const botao = event.target.closest("[data-acao]");
      if (!botao) return;
      const acao = botao.dataset.acao;
      if (acao === "ir-produtos") { state.aba = "produtos"; render(); }
      else if (acao === "ir-vendas") { state.aba = "vendas"; render(); }
      else if (acao === "recalcular") {
        render();
        toast("Previsão recalculada.");
        const alvo = document.getElementById("titulo-metricas") || document.getElementById("conteudo");
        alvo?.focus();
      }
      else if (acao === "salvar-dia") salvarDia();
      else if (acao === "excluir-dia") excluirDia();
      else if (acao === "dia-anterior") {
        const novo = Vendas.adicionarDias(state.dataSelecionada, -1);
        state.dataSelecionada = novo;
        state.periodoReferencia = novo;
        render();
        document.getElementById("dia-data")?.focus();
      } else if (acao === "dia-proximo") {
        const hoje = Vendas.normalizarDia(new Date());
        const novo = Vendas.adicionarDias(state.dataSelecionada, 1);
        if (novo > hoje) {
          toast("Não há dias futuros.", true);
          return;
        }
        state.dataSelecionada = novo;
        state.periodoReferencia = novo;
        render();
        document.getElementById("dia-data")?.focus();
      } else if (acao === "hoje") {
        const hoje = Vendas.normalizarDia(new Date());
        state.dataSelecionada = hoje;
        state.periodoReferencia = hoje;
        render();
        document.getElementById("dia-data")?.focus();
      } else if (acao === "periodo-anterior" || acao === "periodo-proximo" || acao === "periodo-hoje") {
        const draft = capturarDiaEditado();
        if (acao === "periodo-hoje") state.periodoReferencia = Vendas.normalizarDia(new Date());
        else deslocarPeriodo(acao === "periodo-anterior" ? -1 : 1);
        render();
        restaurarDiaEditado(draft);
        document.getElementById("periodo-select")?.focus();
      }
      else if (acao === "editar-produto") {
        state.produtoEditando = botao.dataset.produto;
        state.aba = "produtos";
        render();
        document.getElementById("form-produto")?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (acao === "remover-produto") removerProduto(botao.dataset.produto);
      else if (acao === "cancelar-edicao") { state.produtoEditando = null; render(); }
      else if (acao === "carregar-exemplo") carregarExemplo();
      else if (acao === "limpar-dados") limparDados();
    });

    document.addEventListener("keydown", (event) => {
      if ((event.key === "Enter" || event.key === " ") && event.target.matches("tr.linha-produto[data-produto]")) {
        event.preventDefault();
        state.produtoSelecionado = event.target.dataset.produto;
        render();
        document.getElementById("grafico-produto")?.focus();
      }
    });

    document.addEventListener("submit", salvarProduto);

    document.addEventListener("change", (event) => {
      if (event.target.id === "semana-referencia") {
        state.semanaReferencia = event.target.value;
        render();
        document.getElementById("semana-referencia")?.focus();
      } else if (event.target.matches('[data-campo="metodo"]')) {
        state.metodo = event.target.value;
        render();
        document.querySelector('[data-campo="metodo"]')?.focus();
      } else if (event.target.matches('[data-campo="janela"], [data-campo="alfa"]')) {
        const campo = event.target.dataset.campo;
        state.parametros[campo] = event.target.value;
        normalizarParametros();
        render();
        document.querySelector(`[data-campo="${campo}"]`)?.focus();
      } else if (event.target.matches("[data-previsao-select]")) {
        state.produtoPrevisao = event.target.value;
        render();
        document.querySelector("[data-previsao-select]")?.focus();
      } else if (event.target.matches('[data-campo="cobertura"]')) {
        const dias = Number(event.target.value);
        if (!Number.isInteger(dias) || dias < 1 || dias > 7) {
          toast("A cobertura deve ser de 1 a 7 dias.", true);
          render();
          document.querySelector('[data-campo="cobertura"]')?.focus();
          return;
        }
        state.diasCobertura = dias;
        salvarComAviso("Cobertura atualizada.");
        render();
        document.querySelector('[data-campo="cobertura"]')?.focus();
      } else if (event.target.id === "dia-data") {
        if (!event.target.value) {
          render();
          document.getElementById("dia-data")?.focus();
          return;
        }
        const novo = Vendas.normalizarDia(event.target.value);
        if (novo > Vendas.normalizarDia(new Date())) {
          toast("Não registre vendas futuras.", true);
          render();
          document.getElementById("dia-data")?.focus();
          return;
        }
        state.dataSelecionada = novo;
        state.periodoReferencia = novo;
        render();
        document.getElementById("dia-data")?.focus();
      } else if (event.target.id === "periodo-select") {
        const draft = capturarDiaEditado();
        state.periodo = event.target.value;
        render();
        restaurarDiaEditado(draft);
        document.getElementById("periodo-select")?.focus();
      }
    });

    document.addEventListener("input", (event) => {
      if (event.target.matches('[data-campo="filtro"]')) {
        state.filtro = event.target.value;
        filtrarLinhas();
      } else if (event.target.matches("[data-venda-produto]")) {
        event.target.removeAttribute("aria-invalid");
      }
    });
  }

  return { iniciar, get state() { return state; } };
})();

window.App = App;
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => App.iniciar());
} else {
  App.iniciar();
}
