// Pacote de dados do SeridóFrigo.
// Fontes públicas: IBGE PPM (tabela 3939) e Embrapa CIM/Cepea (Boletim Set/2026).
// A série de demanda é ilustrativa e está rotulada como estimativa na interface.
const DADOS = (() => {
  const EMPRESA = {
    nome: "Frigorífico Serra do Seridó",
    municipio: "Caicó",
    uf: "RN",
    capacidadeAbateSemanal: 180,
    capacidadeCamaraKg: 6000,
  };

  const REBANHO = {
    caprino: [
      { ano: 2015, valor: 16765 }, { ano: 2016, valor: 18650 }, { ano: 2017, valor: 17400 },
      { ano: 2018, valor: 11418 }, { ano: 2019, valor: 12380 }, { ano: 2020, valor: 16350 },
      { ano: 2021, valor: 12837 }, { ano: 2022, valor: 13500 }, { ano: 2023, valor: 13550 },
      { ano: 2024, valor: 10840 }, { ano: 2025, valor: 15157 },
    ],
    ovino: [
      { ano: 2015, valor: 43141 }, { ano: 2016, valor: 45300 }, { ano: 2017, valor: 44230 },
      { ano: 2018, valor: 31909 }, { ano: 2019, valor: 38200 }, { ano: 2020, valor: 36600 },
      { ano: 2021, valor: 33988 }, { ano: 2022, valor: 36900 }, { ano: 2023, valor: 25000 },
      { ano: 2024, valor: 18200 }, { ano: 2025, valor: 24909 },
    ],
  };

  const PRECOS = {
    mes: "2026-09",
    fonte: "Embrapa CIM/Cepea — Boletim Set/2026",
    rnVivoKg: 12.62,
    carcacaNordesteKgMin: 22,
    carcacaNordesteKgMax: 32,
  };

  const PRODUTOS = [
    {
      id: "caprino", nome: "Caprino", unidade: "kg de carcaça",
      kgCarcacaAnimal: 12.6, precoVendaKg: 35, custoCompraKg: 28.04, custoAbateKg: 4,
      estoqueKg: 600, estoqueMinKg: 300, capacidadeAbateAnimais: 90,
      capacidadeCamaraKg: 3000, coberturaSemanas: 1,
    },
    {
      id: "ovino", nome: "Ovino", unidade: "kg de carcaça",
      kgCarcacaAnimal: 15.36, precoVendaKg: 38, custoCompraKg: 26.29, custoAbateKg: 4,
      estoqueKg: 800, estoqueMinKg: 400, capacidadeAbateAnimais: 90,
      capacidadeCamaraKg: 3000, coberturaSemanas: 1,
    },
  ];

  const PARAMETROS = { z: 1.65, leadTimeSemanas: 1, metodo: "auto" };

  const FORNECEDORES = [
    {
      id: "boa-vista", nome: "Fazenda Boa Vista", cidade: "Caicó/RN",
      conformidadeSanitaria: true, precoKgVivo: 13.10, qualidade: 8.5,
      prazoDias: 2, confiabilidade: 9.0,
    },
    {
      id: "cooperativa", nome: "Cooperativa Seridó", cidade: "Caicó/RN",
      conformidadeSanitaria: true, precoKgVivo: 12.80, qualidade: 7.5,
      prazoDias: 4, confiabilidade: 8.5,
    },
    {
      id: "uaua", nome: "Lote de Uauá/BA", cidade: "Uauá/BA",
      conformidadeSanitaria: true, precoKgVivo: 12.40, qualidade: 7.0,
      prazoDias: 7, confiabilidade: 6.5,
    },
    {
      id: "informal", nome: "Lote informal sem GTA", cidade: "Região do Seridó",
      conformidadeSanitaria: false, precoKgVivo: 11.50, qualidade: 7.0,
      prazoDias: 3, confiabilidade: 6.0,
    },
  ];

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function gerarSerieDemanda({ base, semanas = 52, seed = 42, sazonalidade = true, ruido = 0.08 } = {}) {
    const rng = mulberry32(seed);
    return Array.from({ length: semanas }, (_, i) => {
      const semana = i + 1;
      let fator = 1;
      if (sazonalidade) {
        if (semana >= 22 && semana <= 26) fator += 0.15; // São João
        if (semana >= 48) fator += 0.15; // Natal
        if (semana >= 5 && semana <= 13) fator -= 0.10; // verão/chuvas
      }
      const tendencia = 1 + 0.02 * (i / semanas);
      const ruidoRelativo = 1 + (rng() * 2 - 1) * ruido;
      return Math.round(base * fator * tendencia * ruidoRelativo);
    });
  }

  const DEMANDA = {
    semanas: Array.from({ length: 52 }, (_, i) => i + 1),
    caprino: gerarSerieDemanda({ base: 700, seed: 42 }),
    ovino: gerarSerieDemanda({ base: 900, seed: 43 }),
    origem: "ilustrativa",
  };

  function matrizValida(M, n) {
    return Array.isArray(M) && M.length === n &&
      M.every((linha) => Array.isArray(linha) && linha.length === n &&
        linha.every((v) => Number.isFinite(v) && v > 0));
  }

  function dadosValidos(d) {
    if (!d || !Array.isArray(d.PRODUTOS) || d.PRODUTOS.length === 0) return false;
    const camposNumericos = [
      "kgCarcacaAnimal", "precoVendaKg", "custoCompraKg", "custoAbateKg",
      "estoqueKg", "estoqueMinKg", "capacidadeAbateAnimais",
      "capacidadeCamaraKg", "coberturaSemanas",
    ];
    if (!d.PRODUTOS.every((p) => p && typeof p.id === "string" && typeof p.nome === "string" &&
      camposNumericos.every((campo) => Number.isFinite(Number(p[campo])) && Number(p[campo]) >= 0) &&
      Number(p.kgCarcacaAnimal) > 0)) return false;

    if (!d.DEMANDA || !Array.isArray(d.DEMANDA.caprino) || !Array.isArray(d.DEMANDA.ovino)) return false;
    const n = d.DEMANDA.caprino.length;
    if (n === 0 || d.DEMANDA.ovino.length !== n) return false;
    if (!d.DEMANDA.caprino.every((v) => Number.isFinite(v) && v >= 0)) return false;
    if (!d.DEMANDA.ovino.every((v) => Number.isFinite(v) && v >= 0)) return false;
    if (d.DEMANDA.semanas) {
      if (!Array.isArray(d.DEMANDA.semanas) || d.DEMANDA.semanas.length !== n) return false;
      if (!d.DEMANDA.semanas.every((w, i, arr) =>
        Number.isInteger(w) && w > 0 && (i === 0 || w > arr[i - 1]))) return false;
    }

    if (d.FORNECEDORES) {
      if (!Array.isArray(d.FORNECEDORES) || d.FORNECEDORES.length === 0) return false;
      if (!d.FORNECEDORES.every((a) => a && typeof a.id === "string" && typeof a.nome === "string" &&
        typeof a.conformidadeSanitaria === "boolean" &&
        Number.isFinite(Number(a.precoKgVivo)) && Number(a.precoKgVivo) >= 0)) return false;
    }
    return true;
  }

  function clonarDados() {
    return JSON.parse(JSON.stringify({
      EMPRESA, REBANHO, PRECOS, PRODUTOS, DEMANDA, FORNECEDORES, PARAMETROS,
    }));
  }

  return {
    EMPRESA, REBANHO, PRECOS, PRODUTOS, DEMANDA, FORNECEDORES, PARAMETROS,
    gerarSerieDemanda, clonarDados, dadosValidos, matrizValida,
  };
})();

if (typeof module !== "undefined" && module.exports) module.exports = DADOS;
