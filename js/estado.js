// Estado do Mercadinho Seridó: produtos, dias de venda e migração do formato semanal.
const Estado = (() => {
  const Datas = typeof module !== "undefined" && module.exports
    ? require("./datas.js")
    : globalThis.Datas;
  const { formatarISO, normalizarDia, normalizarSemana, adicionarDias, adicionarSemanas } = Datas;
  const CHAVE = "mercadinho-serido:v2";
  const CHAVE_ANTERIOR = "mercadinho-serido:v1";
  const UNIDADES = new Set(["un", "kg", "L"]);
  const SEMANAS_EXEMPLO = 52;
  const AVISO = "Não foi possível carregar os dados salvos. Carregamos o exemplo.";
  const AVISO_MIGRACAO = "Dados semanais migrados para o formato diário.";
  const PESOS = [0.12, 0.13, 0.14, 0.15, 0.16, 0.15, 0.15];
  let ultimoErroSalvar = null;

  const PRODUTOS_EXEMPLO = [
    { id: "p-arroz", nome: "Arroz 5 kg", unidade: "un", custo: 22.5, preco: 27.9, estoqueAtual: 8, estoqueMinimo: 4, base: 40 },
    { id: "p-feijao", nome: "Feijão 1 kg", unidade: "un", custo: 7.2, preco: 9.5, estoqueAtual: 10, estoqueMinimo: 6, base: 50 },
    { id: "p-macarrao", nome: "Macarrão 500 g", unidade: "un", custo: 3.4, preco: 4.8, estoqueAtual: 12, estoqueMinimo: 6, base: 30 },
    { id: "p-acucar", nome: "Açúcar 1 kg", unidade: "un", custo: 4.1, preco: 5.8, estoqueAtual: 6, estoqueMinimo: 4, base: 25 },
    { id: "p-cafe", nome: "Café 500 g", unidade: "un", custo: 16.8, preco: 21.9, estoqueAtual: 5, estoqueMinimo: 3, base: 18 },
    { id: "p-oleo", nome: "Óleo 900 ml", unidade: "un", custo: 7.5, preco: 10.2, estoqueAtual: 9, estoqueMinimo: 4, base: 22 },
    { id: "p-leite", nome: "Leite 1 L", unidade: "un", custo: 4.2, preco: 5.6, estoqueAtual: 14, estoqueMinimo: 8, base: 60 },
    { id: "p-pao", nome: "Pão francês", unidade: "un", custo: 0.6, preco: 1.0, estoqueAtual: 20, estoqueMinimo: 10, base: 80 },
    { id: "p-ovos", nome: "Ovos (dúzia)", unidade: "un", custo: 9.5, preco: 13.0, estoqueAtual: 4, estoqueMinimo: 2, base: 25 },
    { id: "p-banana", nome: "Banana (kg)", unidade: "kg", custo: 3.8, preco: 6.5, estoqueAtual: 5, estoqueMinimo: 3, base: 15 },
  ];

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0; // NOSONAR — coerção int32 intencional do PRNG
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function estadoVazio() {
    return { versao: 2, produtos: [], dias: [], exemplo: false };
  }

  function gerarSemanasExemplo(referencia = new Date()) {
    const ultima = normalizarSemana(referencia);
    const inicio = adicionarSemanas(ultima, -51);
    const produtos = PRODUTOS_EXEMPLO.map(({ base, ...produto }) => ({
      ...produto,
      criadoEm: inicio,
    }));
    const rngs = produtos.map((_, i) => mulberry32(42 + i));
    const semanas = [];
    for (let semana = 0; semana < SEMANAS_EXEMPLO; semana++) {
      const data = adicionarSemanas(inicio, semana);
      const valores = {};
      produtos.forEach((produto, i) => {
        const base = PRODUTOS_EXEMPLO[i].base;
        const sazonal = 1 + 0.08 * Math.sin(((semana + 1) / 12) * Math.PI * 2);
        const ruido = 1 + (rngs[i]() * 2 - 1) * 0.08;
        valores[produto.id] = Math.max(1, Math.round(base * sazonal * ruido));
      });
      semanas.push({ data, valores });
    }
    return { produtos, semanas, inicio };
  }

  function distribuirValores(valores, quantidadeDias) {
    const pesos = PESOS.slice(0, quantidadeDias);
    const soma = pesos.reduce((a, b) => a + b, 0);
    const normalizados = pesos.map((p) => p / soma);
    const dias = Array.from({ length: quantidadeDias }, () => ({}));
    for (const [id, total] of Object.entries(valores ?? {})) {
      const totalOriginal = Number(total) || 0;
      if (totalOriginal <= 0) continue;
      let restante = totalOriginal;
      for (let i = 0; i < quantidadeDias - 1; i++) {
        const alvo = Math.round(totalOriginal * normalizados[i]);
        const valor = Math.min(restante, Math.max(0, alvo));
        if (valor > 0) dias[i][id] = valor;
        restante -= valor;
      }
      if (restante > 0) dias[quantidadeDias - 1][id] = restante;
    }
    return dias;
  }

  function distribuirSemanas(semanas, referencia) {
    const referenciaISO = normalizarDia(referencia);
    const semanaAtual = normalizarSemana(referencia);
    const dias = [];
    for (const semana of semanas) {
      const atual = semana.data === semanaAtual;
      const indiceDia = (new Date(`${referenciaISO}T12:00:00`).getDay() + 6) % 7;
      const quantidade = atual ? indiceDia + 1 : 7;
      const partes = distribuirValores(semana.valores, quantidade);
      for (let i = 0; i < quantidade; i++) {
        const data = adicionarDias(semana.data, i);
        if (Object.keys(partes[i]).length > 0) dias.push({ data, valores: partes[i] });
      }
    }
    return dias.sort((a, b) => a.data.localeCompare(b.data));
  }

  function estadoExemplo(referencia = new Date()) {
    const { produtos, semanas, inicio } = gerarSemanasExemplo(referencia);
    const dias = distribuirSemanas(semanas, referencia);
    return { versao: 2, produtos, dias, exemplo: true };
  }

  function numeroValido(valor) {
    return typeof valor === "number" && Number.isFinite(valor) && valor >= 0;
  }

  function validarProduto(produto, ids) {
    if (!produto || typeof produto.id !== "string" || produto.id.length === 0) return false;
    if (ids.has(produto.id)) return false;
    ids.add(produto.id);
    if (typeof produto.nome !== "string" || produto.nome.trim().length === 0) return false;
    if (!UNIDADES.has(produto.unidade)) return false;
    if (!numeroValido(produto.custo) || !numeroValido(produto.preco)) return false;
    return numeroValido(produto.estoqueAtual) && numeroValido(produto.estoqueMinimo);
  }

  function validarDia(dia, ids, datas) {
    if (!dia || typeof dia.data !== "string") return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dia.data)) return false;
    if (normalizarDia(dia.data) !== dia.data) return false;
    if (datas.has(dia.data)) return false;
    datas.add(dia.data);
    if (!dia.valores || typeof dia.valores !== "object" || Array.isArray(dia.valores)) return false;
    const entradas = Object.entries(dia.valores);
    if (entradas.length === 0 || !entradas.some(([, valor]) => valor > 0)) return false;
    for (const [id, valor] of entradas) {
      if (!ids.has(id) || !numeroValido(valor)) return false;
    }
    return true;
  }

  function validar(estado) {
    if (estado?.versao !== 2) return false;
    if (!Array.isArray(estado.produtos) || !Array.isArray(estado.dias)) return false;
    if (typeof estado.exemplo !== "boolean") return false;
    const ids = new Set();
    for (const produto of estado.produtos) {
      if (!validarProduto(produto, ids)) return false;
    }
    const datas = new Set();
    for (const dia of estado.dias) {
      if (!validarDia(dia, ids, datas)) return false;
    }
    return true;
  }

  function validarV1(estado) {
    if (!estado || estado.versao !== 1) return false;
    if (!Array.isArray(estado.produtos) || !Array.isArray(estado.semanas)) return false;
    if (typeof estado.exemplo !== "boolean") return false;
    const ids = new Set();
    for (const produto of estado.produtos) {
      if (!validarProduto(produto, ids)) return false;
    }
    const datas = new Set();
    for (const semana of estado.semanas) {
      if (!semana || typeof semana.data !== "string") return false;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(semana.data)) return false;
      if (normalizarDia(semana.data) !== semana.data) return false;
      if (new Date(`${semana.data}T12:00:00`).getDay() !== 1) return false;
      if (datas.has(semana.data)) return false;
      datas.add(semana.data);
      if (!semana.valores || typeof semana.valores !== "object" || Array.isArray(semana.valores)) return false;
      const entradas = Object.entries(semana.valores);
      if (entradas.length === 0 || !entradas.some(([, valor]) => valor > 0)) return false;
      for (const [id, valor] of entradas) {
        if (!ids.has(id) || !numeroValido(valor)) return false;
      }
    }
    return true;
  }

  function migrarV1(estadoAntigo) {
    const mapa = new Map();
    for (const semana of estadoAntigo.semanas) {
      const partes = distribuirValores(semana.valores, 7);
      for (let i = 0; i < 7; i++) {
        const data = adicionarDias(semana.data, i);
        const valores = partes[i];
        if (Object.keys(valores).length === 0) continue;
        if (!mapa.has(data)) mapa.set(data, {});
        Object.assign(mapa.get(data), valores);
      }
    }
    const dias = [...mapa.entries()]
      .map(([data, valores]) => ({ data, valores }))
      .sort((a, b) => a.data.localeCompare(b.data));
    return {
      versao: 2,
      produtos: estadoAntigo.produtos,
      dias,
      exemplo: Boolean(estadoAntigo.exemplo),
    };
  }

  function semanasDoEstado(estado) {
    return new Set((estado.dias || []).map((dia) => normalizarSemana(dia.data))).size;
  }

  function carregar(storage) {
    try {
      const alvo = storage === undefined ? globalThis.localStorage : storage;
      if (!alvo || typeof alvo.getItem !== "function") {
        return { estado: estadoExemplo(), aviso: null };
      }
      const brutoV2 = alvo.getItem(CHAVE);
      if (brutoV2) {
        const salvo = JSON.parse(brutoV2);
        if (validar(salvo)) {
          if (salvo.exemplo && semanasDoEstado(salvo) < SEMANAS_EXEMPLO) {
            return { estado: estadoExemplo(), aviso: null };
          }
          return { estado: salvo, aviso: null };
        }
        return { estado: estadoExemplo(), aviso: AVISO };
      }
      const brutoV1 = alvo.getItem(CHAVE_ANTERIOR);
      if (brutoV1) {
        try {
          const antigo = JSON.parse(brutoV1);
          if (validarV1(antigo)) {
            if (antigo.exemplo) return { estado: estadoExemplo(), aviso: null };
            const migrado = migrarV1(antigo);
            try {
              alvo.setItem(CHAVE, JSON.stringify(migrado));
            } catch (_) {
              // v2 será salvo na primeira edição.
            }
            return { estado: migrado, aviso: AVISO_MIGRACAO };
          }
        } catch (_) {
          // JSON antigo inválido: o aviso abaixo explica o fallback.
        }
        return { estado: estadoExemplo(), aviso: AVISO };
      }
      return { estado: estadoExemplo(), aviso: null };
    } catch (erro) {
      const detalhe = erro instanceof Error ? erro.message : "erro desconhecido";
      return { estado: estadoExemplo(), aviso: `${AVISO} (${detalhe})` };
    }
  }

  function salvar(estado, storage) {
    try {
      const alvo = storage === undefined ? globalThis.localStorage : storage;
      if (!alvo || typeof alvo.setItem !== "function") return false;
      alvo.setItem(CHAVE, JSON.stringify(estado));
      return true;
    } catch (erro) {
      ultimoErroSalvar = erro;
      return false;
    }
  }

  return {
    CHAVE, CHAVE_ANTERIOR, estadoVazio, estadoExemplo, validar, validarV1,
    migrarV1, carregar, salvar, normalizarDia, normalizarSemana,
    adicionarDias, adicionarSemanas,
    get ultimoErroSalvar() { return ultimoErroSalvar; },
  };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Estado;
