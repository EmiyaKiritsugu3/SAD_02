// Compra sugerida: previsão + estoque mínimo - estoque atual.
const Compras = (() => {
  function arredondar(quantidade, unidade) {
    const valor = Math.max(0, Number(quantidade) || 0);
    return unidade === "un" ? Math.ceil(valor) : Math.round(valor * 10) / 10;
  }

  function diasCoberturaValidos(dias) {
    const numero = Number(dias);
    return Number.isInteger(numero) && numero >= 1 && numero <= 7 ? numero : 1;
  }

  function minimo(produto, previsao, diasCobertura = 1) {
    const manual = Math.max(0, Number(produto?.estoqueMinimo) || 0);
    if (manual > 0) return { valor: manual, manual: true };
    const prevista = Math.max(0, Number(previsao) || 0);
    return { valor: (prevista / 7) * diasCoberturaValidos(diasCobertura), manual: false };
  }

  function sugerir(produto, previsao, diasCobertura = 1) {
    if (previsao === null || previsao === undefined || !Number.isFinite(Number(previsao))) {
      return {
        previsao: null, minimo: 0, minimoManual: false,
        necessidade: 0, sugestao: null, custo: 0, semDados: true,
      };
    }
    const prevista = Math.max(0, Number(previsao));
    const estoque = Math.max(0, Number(produto.estoqueAtual) || 0);
    const minimoCalculado = minimo(produto, prevista, diasCobertura);
    const custoUnitario = Math.max(0, Number(produto.custo) || 0);
    const necessidade = Math.max(0, prevista + minimoCalculado.valor - estoque);
    const sugestao = arredondar(necessidade, produto.unidade);
    return {
      previsao: prevista,
      minimo: minimoCalculado.valor,
      minimoManual: minimoCalculado.manual,
      necessidade,
      sugestao,
      custo: sugestao * custoUnitario,
      semDados: false,
    };
  }

  function lista(produtos, previsoes = {}, diasCobertura = 1) {
    return (produtos ?? []).map((produto) => ({
      produto,
      ...sugerir(produto, previsoes?.[produto.id] ?? null, diasCobertura),
    }));
  }

  function total(itens) {
    return (itens ?? []).reduce((soma, item) => soma + (Number(item.custo) || 0), 0);
  }

  function semDados(itens) {
    return (itens ?? []).filter((item) => item.semDados).length;
  }

  return { arredondar, minimo, sugerir, lista, total, semDados };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Compras;
