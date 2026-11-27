// Semanas de venda, séries por produto e resumo mensal.
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

  function segundaAtual() {
    const hoje = new Date();
    hoje.setHours(12, 0, 0, 0);
    hoje.setDate(hoje.getDate() - ((hoje.getDay() + 6) % 7));
    return formatarISO(hoje);
  }

  function normalizarSemana(data = new Date()) {
    const base = paraData(data);
    if (Number.isNaN(base.getTime())) return segundaAtual();
    base.setDate(base.getDate() - ((base.getDay() + 6) % 7));
    return formatarISO(base);
  }

  function adicionarSemanas(dataISO, n) {
    const base = paraData(dataISO);
    if (Number.isNaN(base.getTime())) return normalizarSemana(new Date());
    base.setDate(base.getDate() + Number(n || 0) * 7);
    return formatarISO(base);
  }

  function salvarSemana(semanas, data, valores, produtos) {
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
    const semana = { data: normalizarSemana(data), valores: limpos };
    const outras = (Array.isArray(semanas) ? semanas : [])
      .filter((s) => s.data !== semana.data);
    return [...outras, semana].sort((a, b) => a.data.localeCompare(b.data));
  }

  function removerSemana(semanas, data) {
    const alvo = normalizarSemana(data);
    return (Array.isArray(semanas) ? semanas : []).filter((s) => s.data !== alvo);
  }

  function removerProduto(semanas, produtoId) {
    return (Array.isArray(semanas) ? semanas : [])
      .map((semana) => {
        const valores = { ...semana.valores };
        delete valores[produtoId];
        return { ...semana, valores };
      })
      .filter((semana) => Object.keys(semana.valores).length > 0)
      .sort((a, b) => a.data.localeCompare(b.data));
  }

  function serieProduto(semanas, produtoId) {
    const ordenadas = (Array.isArray(semanas) ? semanas : [])
      .slice()
      .sort((a, b) => a.data.localeCompare(b.data));
    const primeira = ordenadas.findIndex((semana) => (semana.valores?.[produtoId] || 0) > 0);
    if (primeira < 0) return { semanas: [], valores: [] };
    const ultima = ordenadas.at(-1).data;
    const mapa = new Map(ordenadas.map((semana) => [semana.data, semana.valores?.[produtoId] || 0]));
    const datas = [];
    const valores = [];
    let data = ordenadas[primeira].data;
    while (data <= ultima) {
      datas.push(data);
      valores.push(mapa.get(data) || 0);
      data = adicionarSemanas(data, 1);
    }
    return { semanas: datas, valores };
  }

  function resumoMensal(semanas, produtos) {
    const meses = new Map();
    const ordenadas = (Array.isArray(semanas) ? semanas : [])
      .slice()
      .sort((a, b) => a.data.localeCompare(b.data));
    for (const semana of ordenadas) {
      const mes = semana.data.slice(0, 7);
      if (!meses.has(mes)) {
        const porProduto = {};
        for (const produto of produtos) {
          porProduto[produto.id] = { quantidade: 0, receita: 0 };
        }
        meses.set(mes, { mes, porProduto, totalReceita: 0 });
      }
      const registro = meses.get(mes);
      for (const produto of produtos) {
        const quantidade = Number(semana.valores?.[produto.id] ?? 0);
        const valida = Number.isFinite(quantidade) && quantidade > 0 ? quantidade : 0;
        const receita = valida * (Number(produto.preco) || 0);
        registro.porProduto[produto.id].quantidade += valida;
        registro.porProduto[produto.id].receita += receita;
        registro.totalReceita += receita;
      }
    }
    return [...meses.values()].sort((a, b) => a.mes.localeCompare(b.mes));
  }

  function ultimaSemana(semanas) {
    if (!Array.isArray(semanas) || semanas.length === 0) return null;
    return semanas.map((s) => s.data).sort((a, b) => a.localeCompare(b)).at(-1) ?? null;
  }

  function proximaSemana(semanas) {
    const ultima = ultimaSemana(semanas);
    return ultima ? adicionarSemanas(ultima, 1) : null;
  }

  function atrasada(ultima, hoje = normalizarSemana(new Date())) {
    return Boolean(ultima && adicionarSemanas(ultima, 2) < hoje);
  }

  function totalSemana(valores) {
    return Object.values(valores ?? {}).reduce((soma, valor) => {
      return Number.isFinite(valor) && valor > 0 ? soma + valor : soma;
    }, 0);
  }

  return {
    normalizarSemana, adicionarSemanas, salvarSemana, removerSemana,
    removerProduto, serieProduto, resumoMensal, ultimaSemana, proximaSemana,
    atrasada, totalSemana,
  };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Vendas;
