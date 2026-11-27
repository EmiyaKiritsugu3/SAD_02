// Vendas diárias, série semanal e resumos por período.
const Vendas = (() => {
  function formatarISO(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  }

  function paraData(data) {
    if (data instanceof Date) {
      const copia = new Date(data);
      copia.setHours(12, 0, 0, 0);
      return copia;
    }
    if (typeof data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return new Date(`${data}T12:00:00`);
    }
    const criada = new Date(data);
    if (!Number.isNaN(criada.getTime())) criada.setHours(12, 0, 0, 0);
    return criada;
  }

  function normalizarDia(data = new Date()) {
    const base = paraData(data);
    if (Number.isNaN(base.getTime())) return formatarISO(new Date());
    base.setHours(12, 0, 0, 0);
    return formatarISO(base);
  }

  function segundaAtual() {
    const hoje = new Date();
    hoje.setHours(12, 0, 0, 0);
    hoje.setDate(hoje.getDate() - ((hoje.getDay() + 6) % 7));
    return formatarISO(hoje);
  }

  function normalizarSemana(data = new Date()) {
    const base = paraData(data);
    if (Number.isNaN(base.getTime())) return segundaAtual();
    base.setHours(12, 0, 0, 0);
    base.setDate(base.getDate() - ((base.getDay() + 6) % 7));
    return formatarISO(base);
  }

  function adicionarDias(dataISO, n) {
    const base = paraData(dataISO);
    if (Number.isNaN(base.getTime())) return normalizarDia(new Date());
    base.setDate(base.getDate() + Number(n || 0));
    return formatarISO(base);
  }

  function adicionarSemanas(dataISO, n) {
    return adicionarDias(dataISO, Number(n || 0) * 7);
  }

  function fimSemana(dataISO) {
    return adicionarDias(normalizarSemana(dataISO), 6);
  }

  function salvarDia(dias, data, valores, produtos) {
    if (!Array.isArray(produtos) || produtos.length === 0) {
      throw new Error("Cadastre pelo menos um produto.");
    }
    const ids = new Set(produtos.map((p) => p.id));
    const limpos = {};
    let total = 0;
    for (const [id, valor] of Object.entries(valores ?? {})) {
      if (!ids.has(id)) continue;
      if (typeof valor !== "number" || !Number.isFinite(valor)) {
        throw new TypeError("Quantidade inválida.");
      }
      if (valor < 0) throw new Error("A quantidade não pode ser negativa.");
      if (valor > 0) {
        limpos[id] = valor;
        total += valor;
      }
    }
    if (total <= 0) {
      throw new Error("Registre pelo menos um produto com quantidade maior que zero.");
    }
    const dia = { data: normalizarDia(data), valores: limpos };
    const outros = (Array.isArray(dias) ? dias : []).filter((d) => d.data !== dia.data);
    return [...outros, dia].sort((a, b) => a.data.localeCompare(b.data));
  }

  function removerDia(dias, data) {
    const alvo = normalizarDia(data);
    return (Array.isArray(dias) ? dias : []).filter((d) => d.data !== alvo);
  }

  function removerProduto(dias, produtoId) {
    return (Array.isArray(dias) ? dias : [])
      .map((dia) => {
        const valores = { ...dia.valores };
        delete valores[produtoId];
        return { ...dia, valores };
      })
      .filter((dia) => Object.keys(dia.valores).length > 0)
      .sort((a, b) => a.data.localeCompare(b.data));
  }

  function ultimoDia(dias) {
    if (!Array.isArray(dias) || dias.length === 0) return null;
    return dias.map((d) => d.data).sort((a, b) => a.localeCompare(b)).at(-1) ?? null;
  }

  function serieSemanal(dias, produtoId) {
    const ordenados = (Array.isArray(dias) ? dias : [])
      .slice()
      .sort((a, b) => a.data.localeCompare(b.data));
    const primeira = ordenados.findIndex((dia) => (dia.valores?.[produtoId] || 0) > 0);
    if (primeira < 0) return { semanas: [], valores: [] };
    const primeiraSemana = normalizarSemana(ordenados[primeira].data);
    const ultimaSemana = normalizarSemana(ordenados.at(-1).data);
    const mapa = new Map();
    for (const dia of ordenados) {
      const semana = normalizarSemana(dia.data);
      const valor = dia.valores?.[produtoId] || 0;
      if (valor > 0) mapa.set(semana, (mapa.get(semana) || 0) + valor);
    }
    const semanas = [];
    const valores = [];
    let semana = primeiraSemana;
    while (semana <= ultimaSemana) {
      semanas.push(semana);
      valores.push(mapa.get(semana) || 0);
      semana = adicionarSemanas(semana, 1);
    }
    return { semanas, valores };
  }

  function intervalo(periodo, referencia) {
    const ref = normalizarDia(referencia);
    if (periodo === "dia") return { inicio: ref, fim: ref };
    if (periodo === "semana") {
      const inicio = normalizarSemana(ref);
      return { inicio, fim: adicionarDias(inicio, 6) };
    }
    if (periodo === "mes") {
      const base = paraData(ref);
      const ano = base.getFullYear();
      const mes = base.getMonth();
      return {
        inicio: formatarISO(new Date(ano, mes, 1, 12)),
        fim: formatarISO(new Date(ano, mes + 1, 0, 12)),
      };
    }
    if (periodo === "ano") {
      const ano = paraData(ref).getFullYear();
      return { inicio: `${ano}-01-01`, fim: `${ano}-12-31` };
    }
    return intervalo("semana", ref);
  }

  function resumoPeriodo(dias, produtos, periodo = "semana", referencia = new Date()) {
    const { inicio, fim } = intervalo(periodo, referencia);
    const porProduto = {};
    for (const produto of produtos) {
      porProduto[produto.id] = { quantidade: 0, receita: 0 };
    }
    let totalReceita = 0;
    for (const dia of (Array.isArray(dias) ? dias : [])) {
      if (dia.data < inicio || dia.data > fim) continue;
      for (const produto of produtos) {
        const quantidade = Number(dia.valores?.[produto.id] ?? 0);
        const valida = Number.isFinite(quantidade) && quantidade > 0 ? quantidade : 0;
        const receita = valida * (Number(produto.preco) || 0);
        porProduto[produto.id].quantidade += valida;
        porProduto[produto.id].receita += receita;
        totalReceita += receita;
      }
    }
    return { inicio, fim, porProduto, totalReceita };
  }

  function ultimaSemana(dias) {
    const ultimo = ultimoDia(dias);
    return ultimo ? normalizarSemana(ultimo) : null;
  }

  function proximaSemana(dias) {
    const ultima = ultimaSemana(dias);
    return ultima ? adicionarSemanas(ultima, 1) : null;
  }

  function atrasada(ultima, hoje = normalizarSemana(new Date())) {
    return Boolean(ultima && adicionarSemanas(ultima, 2) < hoje);
  }

  function totalDia(valores) {
    return Object.values(valores ?? {}).reduce((soma, valor) => {
      return Number.isFinite(valor) && valor > 0 ? soma + valor : soma;
    }, 0);
  }

  return {
    normalizarDia, normalizarSemana, adicionarDias, adicionarSemanas, fimSemana,
    salvarDia, removerDia, removerProduto, ultimoDia, serieSemanal,
    resumoPeriodo, ultimaSemana, proximaSemana, atrasada, totalDia,
  };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Vendas;
