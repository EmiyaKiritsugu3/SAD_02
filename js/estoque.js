// Política de estoque: desvio padrão, estoque de segurança, ponto de pedido,
// cobertura e classificação ABC.
const Estoque = (() => {
  function desvioPadrao(serie) {
    if (!serie || serie.length === 0) return 0;
    const media = serie.reduce((a, b) => a + b, 0) / serie.length;
    const variancia = serie.reduce((s, v) => s + (v - media) ** 2, 0) / serie.length;
    return Math.sqrt(variancia);
  }

  function estoqueSeguranca(serie, z = 1.65, leadTimeSemanas = 1) {
    const fatorZ = Math.max(0, Number(z) || 0);
    const lead = Math.max(0, Number(leadTimeSemanas) || 0);
    return fatorZ * desvioPadrao(serie) * Math.sqrt(lead);
  }

  function pontoPedido(demandaMedia, leadTimeSemanas, estoqueSeguranca) {
    return Math.max(0, Number(demandaMedia) || 0) * Math.max(0, Number(leadTimeSemanas) || 0)
      + Math.max(0, Number(estoqueSeguranca) || 0);
  }

  function cobertura(estoqueKg, demandaMedia) {
    if (!(demandaMedia > 0)) return Infinity;
    return Math.max(0, Number(estoqueKg) || 0) / demandaMedia;
  }

  function classificacaoABC(itens) {
    if (!itens || itens.length === 0) return [];
    const ordenados = [...itens].sort((a, b) => (b.receita || 0) - (a.receita || 0));
    const total = ordenados.reduce((s, x) => s + Math.max(0, Number(x.receita) || 0), 0);
    let acumulado = 0;
    return ordenados.map(item => {
      const receita = Math.max(0, Number(item.receita) || 0);
      const percentual = total > 0 ? receita / total : 0;
      acumulado = Math.round((acumulado + percentual) * 1e10) / 1e10;
      const eps = 1e-9;
      const classe = total === 0 ? "C" : acumulado <= 0.80 + eps ? "A" : acumulado <= 0.95 + eps ? "B" : "C";
      return { id: item.id, receita, percentual, acumulado, classe };
    });
  }

  return { desvioPadrao, estoqueSeguranca, pontoPedido, cobertura, classificacaoABC };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Estoque;
