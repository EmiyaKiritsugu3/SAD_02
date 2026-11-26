// Aplicação de importações CSV sobre o estado de dados, sem mutar o original.
const Importacao = (() => {
  const Motor = typeof CSV !== "undefined" ? CSV : require("./csv.js");

  function aplicarDemanda(dados, texto) {
    const demanda = Motor.importarDemanda(texto);
    return { ...dados, DEMANDA: demanda };
  }

  function aplicarEstoque(dados, texto) {
    const estoque = Motor.importarEstoque(texto);
    const produtos = dados.PRODUTOS.map((p) => ({
      ...p,
      estoqueKg: estoque[p.id] !== undefined ? estoque[p.id] : p.estoqueKg,
    }));
    return { ...dados, PRODUTOS: produtos };
  }

  return { aplicarDemanda, aplicarEstoque };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Importacao;
