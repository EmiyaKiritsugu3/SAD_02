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
    const ok = Estado.salvar({ versao: 2, produtos: state.produtos, dias: state.dias, exemplo: state.exemplo });
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
    if (!state.produtos.some((p) => p.id === state.produtoSelecionado)) {
      state.produtoSelecionado = state.produtos[0]?.id ?? null;
    }
    state.dataSelecionada = Vendas.normalizarDia(state.dataSelecionada || new Date());
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

  function render() {
    document.querySelectorAll(".aba[data-aba]").forEach((botao) => {
      const ativa = botao.dataset.aba === state.aba;
      botao.classList.toggle("ativa", ativa);
      if (ativa) botao.setAttribute("aria-current", "page");
      else botao.removeAttribute("aria-current");
    });
    const badge = document.getElementById("badge-exemplo");
    if (badge) badge.hidden = !state.exemplo;
    atualizarAvisoPersistencia();

    if (state.aba === "vendas") renderVendas();
    else if (state.aba === "produtos") renderProdutos();
    else renderCompras();
  }

  function previsoesMap() {
    const mapa = {};
    for (const produto of state.produtos) {
      const serie = Vendas.serieSemanal(state.dias, produto.id);
      const prev = Previsao.paraSerie(serie.valores);
      mapa[produto.id] = { serie, prev, previsao: prev?.prev4?.[0] ?? null };
    }
    return mapa;
  }

  function paginaHead(eyebrow, titulo, subtitulo, direita = "") {
    return `
      <div class="pagina-head">
        <div>
          <p class="eyebrow">${esc(eyebrow)}</p>
          <h1>${esc(titulo)}</h1>
          <p class="subtitulo">${subtitulo}</p>
        </div>
        ${direita}
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
      app.innerHTML = paginaHead("Decisão da semana", "Compras", "Quanto comprar de cada produto para a próxima semana.")
        + estadoVazio(
          "Comece cadastrando seus produtos",
          "Cadastre os produtos do mercadinho e lance as vendas de algumas semanas para o app prever a próxima compra.",
          `<button class="botao" type="button" data-acao="ir-produtos">Cadastrar produtos</button>
           <button class="botao secundario" type="button" data-acao="carregar-exemplo">Carregar exemplo</button>`,
        );
      return;
    }

    const dados = previsoesMap();
    const previsoes = Object.fromEntries(state.produtos.map((p) => [p.id, dados[p.id].previsao]));
    const itens = Compras.lista(state.produtos, previsoes);
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
      return `
        <tr class="linha-produto ${p.id === produtoSel.id ? "selecionado" : ""}"
            data-produto="${esc(p.id)}" data-nome="${esc(normalizarBusca(p.nome))}"
            aria-selected="${p.id === produtoSel.id}" tabindex="0" title="Ver a previsão deste produto">
          <td><span class="produto-nome"><strong>${esc(p.nome)}</strong><small>${esc(p.unidade)}</small></span></td>
          <td class="num">${previsao}</td>
          <td class="num">${fmtQtd(p.estoqueAtual)}</td>
          <td class="num">${fmtQtd(p.estoqueMinimo)}</td>
          <td class="num">${compra}</td>
          <td class="num">${custo}</td>
        </tr>`;
    }).join("");

    const avisoSemVendas = state.dias.length === 0
      ? `<div class="aviso"><strong>Sem vendas ainda.</strong> Cadastre a primeira semana para o app calcular a previsão e a compra.</div>`
      : "";
    const avisoAtraso = atrasada
      ? `<div class="aviso"><strong>Última venda antiga.</strong> A compra é para a semana seguinte à última venda registrada (${fmtDataLonga(proxima)}). Atualize as vendas para uma previsão mais recente.</div>`
      : "";

    app.innerHTML = paginaHead(
      "Decisão da semana",
      "Compras",
      "Quanto comprar de cada produto para a próxima semana.",
      `<div class="semana-label">${proxima
        ? `Compra para a semana de<br><strong>${fmtDataLonga(proxima)}</strong>`
        : "Sem vendas registradas"}</div>`,
    ) + `
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
          <div><h2 id="titulo-lista-compras">Lista de compras</h2><p>Previsão da próxima semana + estoque mínimo − estoque atual.</p></div>
          <span class="badge" id="badge-filtro" data-total="${itens.length}">${visiveis.length} de ${itens.length}</span>
        </div>
        <div class="filtro">
          <label for="filtro-compras">Buscar</label>
          <input id="filtro-compras" data-campo="filtro" type="search" placeholder="Nome do produto" value="${esc(state.filtro)}">
        </div>
        <div class="tabela-wrap">
          <table id="tabela-compras">
            <thead><tr><th>Produto</th><th class="num">Previsão</th><th class="num">Estoque</th><th class="num">Mínimo</th><th class="num">Comprar</th><th class="num">Custo</th></tr></thead>
            <tbody>${linhas}<tr id="sem-resultado" hidden><td colspan="6" class="sem-dados">Nenhum produto encontrado.</td></tr></tbody>
          </table>
        </div>
        <p class="nota">O estoque é atualizado por você. O app não controla o caixa nem as compras.</p>
      </section>
      ${renderGraficoProduto(produtoSel, dadosSel)}
    `;
    filtrarLinhas();
  }

  function renderGraficoProduto(produto, dados) {
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
    return `
      <section class="card grafico-card" aria-labelledby="grafico-produto">
        <div class="card-head">
          <div><h2 id="grafico-produto" tabindex="-1">${esc(produto.nome)}</h2><p>Últimas ${nHist} semanas e previsão das próximas 4.</p></div>
          <span class="badge">${nHist} + 4 · ${esc(produto.unidade)}</span>
        </div>
        ${grafico}
        <details class="detalhes">
          <summary>Como calculamos</summary>
          <p><strong>Método:</strong> ${esc(metodoDetalhe(prev))}. O histórico é cortado na última semana lançada; a previsão é para a semana seguinte.</p>
          <div class="metricas">
            <span>MAE: <strong>${mae == null ? "—" : `${fmtQtd(mae)} ${esc(produto.unidade)}`}</strong></span>
            <span>MAPE: <strong>${mape == null ? "—" : `${(mape * 100).toFixed(1).replace(".", ",")}%`}</strong></span>
          </div>
          <p><strong>Backtest:</strong> últimas ${reais.length} semanas.</p>
          ${backtest}
          <code class="formula">compra = max(0, previsão + estoque mínimo − estoque atual)
previsão = ${fmtQtd(dados.previsao)} ${esc(produto.unidade)}
estoque = ${fmtQtd(produto.estoqueAtual)}
mínimo = ${fmtQtd(produto.estoqueMinimo)}</code>
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
      app.innerHTML = paginaHead("Rotina diária", "Vendas", "Registre o que vendeu em cada dia.")
        + estadoVazio(
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
    const ultimo = Vendas.ultimoDia(state.dias);
    const linhas = state.produtos.map((produto) => {
      const passo = produto.unidade === "un" ? "1" : "0.1";
      return `
        <tr>
          <td><span class="produto-nome"><strong>${esc(produto.nome)}</strong><small>${esc(produto.unidade)}</small></span></td>
          <td class="num"><input type="number" min="0" step="${passo}" value="${valores[produto.id] ?? 0}"
            data-venda-produto="${esc(produto.id)}" aria-label="Quantidade vendida de ${esc(produto.nome)}"></td>
        </tr>`;
    }).join("");

    const resumo = Vendas.resumoPeriodo(state.dias, state.produtos, state.periodo, state.dataSelecionada);
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
    const rotuloUltimo = ultimo ? `Último dia<br><strong>${fmtDataLonga(ultimo)}</strong>` : "Nenhuma venda registrada";

    app.innerHTML = paginaHead(
      "Rotina diária",
      "Vendas",
      "Lance o dia e consulte por período. A previsão e a compra usam a semana.",
      `<div class="semana-label">${rotuloUltimo}</div>`,
    ) + `
      ${state.exemplo ? `<div class="aviso"><strong>Dados de exemplo.</strong> Edite ou limpe em Produtos para usar os seus.</div>` : ""}
      <section class="card" aria-labelledby="titulo-lancamento">
        <div class="card-head">
          <div><h2 id="titulo-lancamento" tabindex="-1">Lançamento do dia</h2><p>Escolha o dia, preencha as quantidades e salve.</p></div>
          <span class="badge ${dia ? "ok" : ""}">${dia ? "Dia registrado" : "Novo dia"}</span>
        </div>
        <div class="semana-barra">
          <label class="campo">Dia
            <input id="dia-data" type="date" value="${state.dataSelecionada}">
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
    const linhas = state.produtos.map((produto) => `
      <tr>
        <td><span class="produto-nome"><strong>${esc(produto.nome)}</strong><small>${esc(produto.unidade)}</small></span></td>
        <td class="num">${fmtBRL(produto.custo)}</td>
        <td class="num">${fmtBRL(produto.preco)}</td>
        <td class="num">${fmtQtd(produto.estoqueAtual)} ${esc(produto.unidade)}</td>
        <td class="num">${fmtQtd(produto.estoqueMinimo)} ${esc(produto.unidade)}</td>
        <td>
          <div class="acoes-linha">
            <button class="botao secundario pequeno" type="button" data-acao="editar-produto" data-produto="${esc(produto.id)}">Editar</button>
            <button class="botao perigo pequeno" type="button" data-acao="remover-produto" data-produto="${esc(produto.id)}">Remover</button>
          </div>
        </td>
      </tr>`).join("");

    app.innerHTML = paginaHead(
      "Cadastro",
      "Produtos",
      "Os produtos que o mercadinho compra e vende.",
      `<span class="badge ${state.exemplo ? "" : "ok"}">${state.exemplo ? "Dados de exemplo" : "Seus dados"}</span>`,
    ) + `
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
            <label class="campo">Estoque mínimo
              <input name="estoqueMinimo" type="number" min="0" step="0.1" value="${valorForm(p.estoqueMinimo)}" inputmode="decimal">
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
    const base = new Date(`${state.dataSelecionada}T12:00:00`);
    if (state.periodo === "dia") {
      state.dataSelecionada = Vendas.adicionarDias(state.dataSelecionada, delta);
    } else if (state.periodo === "semana") {
      state.dataSelecionada = Vendas.adicionarDias(state.dataSelecionada, delta * 7);
    } else if (state.periodo === "mes") {
      base.setDate(1);
      base.setMonth(base.getMonth() + delta);
      state.dataSelecionada = Vendas.normalizarDia(base);
    } else {
      base.setDate(1);
      base.setMonth(0);
      base.setFullYear(base.getFullYear() + delta);
      state.dataSelecionada = Vendas.normalizarDia(base);
    }
    render();
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
      else if (acao === "salvar-dia") salvarDia();
      else if (acao === "excluir-dia") excluirDia();
      else if (acao === "dia-anterior") {
        state.dataSelecionada = Vendas.adicionarDias(state.dataSelecionada, -1);
        render();
      } else if (acao === "dia-proximo") {
        state.dataSelecionada = Vendas.adicionarDias(state.dataSelecionada, 1);
        render();
      } else if (acao === "hoje") {
        state.dataSelecionada = Vendas.normalizarDia(new Date());
        render();
      } else if (acao === "periodo-anterior") deslocarPeriodo(-1);
      else if (acao === "periodo-proximo") deslocarPeriodo(1);
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
      if (event.target.id === "dia-data") {
        if (!event.target.value) {
          render();
          return;
        }
        state.dataSelecionada = Vendas.normalizarDia(event.target.value);
        render();
        document.getElementById("dia-data")?.focus();
      } else if (event.target.id === "periodo-select") {
        state.periodo = event.target.value;
        render();
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
