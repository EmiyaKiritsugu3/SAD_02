// Módulo de decisão AHP para seleção de fornecedores do frigorífico.
const Fornecedores = (() => {
  const Motor = typeof AHP !== "undefined" ? AHP : require("./ahp.js");

  const CRITERIOS = [
    { id: "preco", nome: "Preço", descricao: "Menor preço por kg vivo." },
    { id: "qualidade", nome: "Qualidade da carcaça", descricao: "Conformação, acabamento e rendimento." },
    { id: "prazo", nome: "Prazo de entrega", descricao: "Tempo entre o pedido e a chegada do lote." },
    { id: "confiabilidade", nome: "Confiabilidade", descricao: "Histórico de cumprimento e regularidade." },
  ];

  const ALTERNATIVAS = [
    {
      id: "boa-vista", nome: "Fazenda Boa Vista", nomeCurto: "Boa Vista", cidade: "Caicó/RN",
      conformidadeSanitaria: true, precoKgVivo: 13.10, qualidade: 8.5,
      prazoDias: 2, confiabilidade: 9.0,
    },
    {
      id: "cooperativa", nome: "Cooperativa Seridó", nomeCurto: "Cooperativa", cidade: "Caicó/RN",
      conformidadeSanitaria: true, precoKgVivo: 12.80, qualidade: 7.5,
      prazoDias: 4, confiabilidade: 8.5,
    },
    {
      id: "uaua", nome: "Lote de Uauá/BA", nomeCurto: "Uauá", cidade: "Uauá/BA",
      conformidadeSanitaria: true, precoKgVivo: 12.40, qualidade: 7.0,
      prazoDias: 7, confiabilidade: 6.5,
    },
    {
      id: "informal", nome: "Lote informal sem GTA", nomeCurto: "Informal", cidade: "Região do Seridó",
      conformidadeSanitaria: false, precoKgVivo: 11.50, qualidade: 7.0,
      prazoDias: 3, confiabilidade: 6.0,
    },
  ];

  function matrizDePesos(pesos) {
    return pesos.map((wi) => pesos.map((wj) => wi / wj));
  }

  const MATRIZ_CRITERIOS = matrizDePesos([0.40, 0.30, 0.15, 0.15]);

  const MATRIZES_ALTERNATIVAS = {
    preco: matrizDePesos([0.20, 0.30, 0.50]),
    qualidade: matrizDePesos([0.50, 0.30, 0.20]),
    prazo: matrizDePesos([0.50, 0.30, 0.20]),
    confiabilidade: matrizDePesos([0.45, 0.35, 0.20]),
  };

  const clonarMatriz = (M) => M.map((linha) => linha.slice());

  function restaurarExemplo() {
    const matrizesAlternativas = {};
    for (const [id, M] of Object.entries(MATRIZES_ALTERNATIVAS)) matrizesAlternativas[id] = clonarMatriz(M);
    return { matrizCriterios: clonarMatriz(MATRIZ_CRITERIOS), matrizesAlternativas };
  }

  function avaliar({ matrizCriterios, matrizesAlternativas, alternativas } = {}) {
    const lista = alternativas || ALTERNATIVAS;
    const mCrit = matrizCriterios || MATRIZ_CRITERIOS;
    const mAlt = matrizesAlternativas || MATRIZES_ALTERNATIVAS;

    const conformes = lista.filter((a) => a.conformidadeSanitaria === true);
    const excluidos = lista.filter((a) => a.conformidadeSanitaria !== true);
    const criterios = Motor.calcAHP(mCrit) || { weights: [], CR: 0 };
    const pesosPorCriterio = {};
    for (const c of CRITERIOS) {
      const M = mAlt[c.id];
      pesosPorCriterio[c.id] = M ? (Motor.calcAHP(M)?.weights || []) : [];
    }

    const nCrit = Math.min(criterios.weights.length, CRITERIOS.length);
    const pontuados = conformes.map((alt, i) => {
      let score = 0;
      for (let j = 0; j < nCrit; j++) {
        const pesoAlt = pesosPorCriterio[CRITERIOS[j].id][i] ?? 0;
        score += criterios.weights[j] * pesoAlt;
      }
      return { ...alt, score, rank: 0 };
    });

    const ranking = [...pontuados]
      .sort((a, b) => b.score - a.score)
      .map((a, i) => ({ ...a, rank: i + 1 }));

    const alertas = [];
    if (criterios.CR > 0.10) {
      alertas.push({
        tipo: "consistencia",
        mensagem: `Razão de consistência (CR) de ${(criterios.CR * 100).toFixed(1)}% acima do limite de 10%. Revise as comparações.`,
      });
    }
    for (const a of excluidos) {
      alertas.push({
        tipo: "excluido",
        mensagem: `${a.nome} excluído: sem conformidade sanitária.`,
      });
    }

    return { criterios, alternativas: pontuados, ranking, excluidos, alertas };
  }

  return {
    CRITERIOS, ALTERNATIVAS, MATRIZ_CRITERIOS, MATRIZES_ALTERNATIVAS,
    avaliar, restaurarExemplo,
  };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Fornecedores;
