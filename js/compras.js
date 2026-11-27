// Compra sugerida: previsão + estoque mínimo - estoque atual.
const Compras = (() => {
  function arredondar(quantidade, unidade) {
    const valor = Math.max(0, Number(quantidade) || 0);
    return unidade === "un" ? Math.ceil(valor) : Math.round(valor * 10) / 10;
  }

  function sugerir(produto, previsao) {
    if (previsao === null || previsao === undefined || !Number.isFinite(Number(previsao))) {
      return { previsao: null, necessidade: 0, sugestao: null, custo: 0, semDados: true };
    }
    const prevista = Math.max(0, Number(previsao));
    const estoque = Math.max(0, Number(produto.estoqueAtual) || 0);
    const minimo = Math.max(0, Number(produto.estoqueMinimo) || 0);
    const custoUnitario = Math.max(0, Number(produto.custo) || 0);
    const necessidade = Math.max(0, prevista + minimo - estoque);
    const sugestao = arredondar(necessidade, produto.unidade);
    return {
      previsao: prevista,
      necessidade,
      sugestao,
      custo: sugestao * custoUnitario,
      semDados: false,
    };
  }

  function lista(produtos, previsoes = {}) {
    return (produtos ?? []).map((produto) => ({
      produto,
      ...sugerir(produto, previsoes?.[produto.id] ?? null),
    }));
  }

  function total(itens) {
    return (itens ?? []).reduce((soma, item) => soma + (Number(item.custo) || 0), 0);
  }

  function semDados(itens) {
    return (itens ?? []).filter((item) => item.semDados).length;
  }

  return { arredondar, sugerir, lista, total, semDados };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Compras;
