// Plano semanal de abate e estoque, com cenários e consolidação.
const Plano = (() => {
  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  };
  const arred = (v) => Math.round(v * 1e6) / 1e6;

  function calcularPlano(input = {}) {
    const produto = input.produto || {};
    const produtoId = produto.id || "produto";
    const kgAnimal = Math.max(0.01, Number(produto.kgCarcacaAnimal) || 0.01);

    const previsaoSemana = num(input.previsaoSemana);
    const estoqueAtualKg = num(input.estoqueAtualKg);
    const estoqueSegurancaKg = num(input.estoqueSegurancaKg);
    const coberturaSemanas = num(input.coberturaSemanas);
    const capacidadeAbateAnimais = num(input.capacidadeAbateAnimais);
    const capacidadeCamaraKg = num(input.capacidadeCamaraKg);
    const estoqueMinKg = num(input.estoqueMinKg);
    const precoVendaKg = num(input.precoVendaKg);
    const custoCompraKg = num(input.custoCompraKg);
    const custoAbateKg = num(input.custoAbateKg);
    const animaisVivos = num(input.animaisVivos);

    const estoqueMetaKg = arred(previsaoSemana * coberturaSemanas + estoqueSegurancaKg);
    const producaoNecessariaKg = arred(Math.max(0, estoqueMetaKg + previsaoSemana - estoqueAtualKg));
    const animaisNecessarios = producaoNecessariaKg / kgAnimal;
    const animaisDesejados = Math.ceil(animaisNecessarios);
    const animaisMaxCamara = Math.max(0, Math.floor((capacidadeCamaraKg - estoqueAtualKg + previsaoSemana) / kgAnimal));
    const animaisAbatidos = Math.floor(Math.max(0, Math.min(animaisDesejados, capacidadeAbateAnimais, animaisMaxCamara)));
    const producaoKg = arred(animaisAbatidos * kgAnimal);
    const disponivelKg = arred(estoqueAtualKg + producaoKg);
    const demandaAtendidaKg = Math.min(previsaoSemana, disponivelKg);
    const estoqueFinalKg = arred(disponivelKg - demandaAtendidaKg);
    const deficitAnimais = Math.max(0, animaisNecessarios - animaisAbatidos);
    const necessidadeCompraAnimais = Math.max(0, animaisAbatidos - animaisVivos);
    const custoUnitario = custoCompraKg + custoAbateKg;
    const receita = arred(demandaAtendidaKg * precoVendaKg);
    const custoProducao = arred(producaoKg * custoUnitario);
    const custoVendido = arred(demandaAtendidaKg * custoUnitario);
    const valorEstoque = arred(estoqueFinalKg * custoUnitario);
    const margem = arred(receita - custoVendido);
    const margemPorKg = demandaAtendidaKg > 0 ? margem / demandaAtendidaKg : 0;
    const capacidadeUtilizada = capacidadeAbateAnimais > 0 ? animaisAbatidos / capacidadeAbateAnimais : 0;

    const alertas = [];
    if (animaisDesejados > capacidadeAbateAnimais) {
      alertas.push({
        tipo: "capacidade",
        mensagem: `Capacidade de abate insuficiente: ${Math.ceil(animaisDesejados - capacidadeAbateAnimais)} animais acima do limite.`,
      });
    }
    if (animaisDesejados > animaisMaxCamara) {
      alertas.push({
        tipo: "camara",
        mensagem: `Câmara fria limita a produção: ${Math.ceil(animaisDesejados - animaisMaxCamara)} animais acima do espaço disponível.`,
      });
    }
    if (demandaAtendidaKg < previsaoSemana) {
      alertas.push({
        tipo: "ruptura",
        mensagem: `Ruptura prevista de ${arred(previsaoSemana - demandaAtendidaKg)} kg.`,
      });
    }
    if (estoqueFinalKg < estoqueMinKg) {
      alertas.push({
        tipo: "estoque-minimo",
        mensagem: `Estoque final abaixo do mínimo: ${estoqueFinalKg} kg (mínimo ${estoqueMinKg} kg).`,
      });
    }
    if (estoqueFinalKg > capacidadeCamaraKg) {
      alertas.push({
        tipo: "estoque-excedente",
        mensagem: `Estoque final acima da capacidade da câmara: ${estoqueFinalKg} kg (capacidade ${capacidadeCamaraKg} kg).`,
      });
    }
    if (previsaoSemana === 0 && estoqueFinalKg > estoqueMinKg) {
      alertas.push({
        tipo: "demanda-zero",
        mensagem: `Demanda zero: ${estoqueFinalKg} kg em estoque sem previsão de saída.`,
      });
    }

    return {
      produtoId, produtoNome: produto.nome || produtoId,
      previsaoSemana, precoVendaKg, capacidadeAbateAnimais,
      estoqueMetaKg, producaoNecessariaKg, animaisNecessarios,
      animaisDesejados, animaisMaxCamara, animaisAbatidos, producaoKg,
      disponivelKg, demandaAtendidaKg, estoqueFinalKg,
      deficitAnimais, necessidadeCompraAnimais,
      receita, custoProducao, custoVendido, valorEstoque, margem, margemPorKg,
      capacidadeUtilizada, alertas,
    };
  }

  function simularCenario(input, cenario = {}) {
    const demandaPct = Number(cenario.demandaPct) || 0;
    const precoPct = Number(cenario.precoPct) || 0;
    const capacidadePct = Number(cenario.capacidadePct) || 0;
    return calcularPlano({
      ...input,
      previsaoSemana: arred((Number(input.previsaoSemana) || 0) * (1 + demandaPct)),
      precoVendaKg: arred((Number(input.precoVendaKg) || 0) * (1 + precoPct)),
      capacidadeAbateAnimais: arred((Number(input.capacidadeAbateAnimais) || 0) * (1 + capacidadePct)),
    });
  }

  function consolidar(resultados = []) {
    const soma = (campo) => arred(resultados.reduce((s, r) => s + (Number(r[campo]) || 0), 0));
    const animaisAbatidos = soma("animaisAbatidos");
    const capacidadeTotal = soma("capacidadeAbateAnimais");
    return {
      animaisAbatidos,
      producaoKg: soma("producaoKg"),
      necessidadeCompraAnimais: soma("necessidadeCompraAnimais"),
      receita: soma("receita"),
      custoProducao: soma("custoProducao"),
      custoVendido: soma("custoVendido"),
      valorEstoque: soma("valorEstoque"),
      margem: soma("margem"),
      demandaAtendidaKg: soma("demandaAtendidaKg"),
      deficitAnimais: soma("deficitAnimais"),
      capacidadeAbateAnimais: capacidadeTotal,
      capacidadeUtilizada: capacidadeTotal > 0 ? animaisAbatidos / capacidadeTotal : 0,
    };
  }

  return { calcularPlano, simularCenario, consolidar };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Plano;
