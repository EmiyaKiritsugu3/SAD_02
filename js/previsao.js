// Previsão de demanda: média móvel, suavização exponencial e regressão linear.
const Previsao = (() => {
  function mediaMovel(serie, janela) {
    if (!serie || serie.length === 0) return 0;
    const n = Math.min(Math.max(1, Math.floor(Number(janela) || 1)), serie.length);
    const ultimos = serie.slice(-n);
    return ultimos.reduce((a, b) => a + b, 0) / n;
  }

  function suavizacaoExponencial(serie, alfa = 0.3) {
    if (!serie || serie.length === 0) return 0;
    const a = Math.min(1, Math.max(0, Number(alfa) || 0));
    let nivel = serie[0];
    for (let i = 1; i < serie.length; i++) nivel = a * serie[i] + (1 - a) * nivel;
    return nivel;
  }

  function regressaoLinear(serie) {
    if (!serie || serie.length === 0) return { slope: 0, intercept: 0, prever: () => 0 };
    const n = serie.length;
    const mediaX = (n + 1) / 2;
    const mediaY = serie.reduce((a, b) => a + b, 0) / n;
    let numerador = 0, denominador = 0;
    for (let i = 0; i < n; i++) {
      const x = i + 1;
      numerador += (x - mediaX) * (serie[i] - mediaY);
      denominador += (x - mediaX) ** 2;
    }
    const slope = denominador === 0 ? 0 : numerador / denominador;
    const intercept = mediaY - slope * mediaX;
    return { slope, intercept, prever: (h = 1) => Math.max(0, intercept + slope * (n + h)) };
  }

  function prever(serie, metodo, params = {}, h = 4) {
    const passos = Math.max(1, Number(h) || 1);
    if (metodo === "regressao") {
      const r = regressaoLinear(serie);
      return Array.from({ length: passos }, (_, i) => r.prever(i + 1));
    }
    const base = metodo === "ses"
      ? suavizacaoExponencial(serie, params.alfa ?? 0.3)
      : mediaMovel(serie, params.janela ?? 4);
    return Array.from({ length: passos }, () => base);
  }

  function mae(previstos, reais) {
    if (!previstos || !reais || previstos.length === 0 || reais.length === 0) return 0;
    const n = Math.min(previstos.length, reais.length);
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Math.abs(previstos[i] - reais[i]);
    return soma / n;
  }

  function mape(previstos, reais) {
    if (!previstos || !reais || previstos.length === 0 || reais.length === 0) return null;
    const n = Math.min(previstos.length, reais.length);
    let soma = 0, validos = 0;
    for (let i = 0; i < n; i++) {
      if (reais[i] === 0) continue;
      soma += Math.abs((previstos[i] - reais[i]) / reais[i]);
      validos++;
    }
    return validos === 0 ? null : soma / validos;
  }

  function backtest(serie, metodo, params = {}, h = 4) {
    if (!serie || serie.length === 0) return { mae: 0, mape: null, previstos: [], reais: [] };
    const passos = Math.max(1, Number(h) || 1);
    const corte = Math.max(1, serie.length - passos);
    const treino = serie.slice(0, corte);
    const reais = serie.slice(corte);
    if (reais.length === 0) return { mae: 0, mape: null, previstos: [], reais: [] };
    const previstos = prever(treino, metodo, params, reais.length);
    return { mae: mae(previstos, reais), mape: mape(previstos, reais), previstos, reais };
  }

  function escolherMelhor(serie, h = 4) {
    const candidatos = [
      { metodo: "mediaMovel", params: { janela: 4 } },
      { metodo: "ses", params: { alfa: 0.3 } },
      { metodo: "regressao", params: {} },
    ];
    let melhor = null;
    for (const c of candidatos) {
      const metricas = backtest(serie, c.metodo, c.params, h);
      if (!melhor || metricas.mae < melhor.metricas.mae) {
        melhor = { ...c, metricas };
      }
    }
    return melhor;
  }

  function serieAte(serie, semanas, semanaRef) {
    const valores = Array.isArray(serie) ? serie : [];
    const sem = Array.isArray(semanas) && semanas.length === valores.length
      ? semanas
      : valores.map((_, i) => i + 1);
    const indice = sem.indexOf(Number(semanaRef));
    const corte = indice >= 0 ? indice + 1 : sem.length;
    return { serie: valores.slice(0, corte), semanas: sem.slice(0, corte) };
  }

  function paraSerie(serie) {
    if (!Array.isArray(serie) || serie.length < 4) return null;
    if (serie.length < 8) {
      const params = { janela: Math.min(4, serie.length) };
      return {
        metodo: "mediaMovel",
        params,
        prev4: prever(serie, "mediaMovel", params, 4),
        metricas: backtest(serie, "mediaMovel", params, 4),
      };
    }
    const escolha = escolherMelhor(serie, 4);
    return { ...escolha, prev4: prever(serie, escolha.metodo, escolha.params, 4) };
  }

  return {
    mediaMovel, suavizacaoExponencial, regressaoLinear, prever,
    mae, mape, backtest, escolherMelhor, serieAte, paraSerie,
  };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Previsao;
