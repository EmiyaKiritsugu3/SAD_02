// Estado do Mercadinho Seridó: persistência, validação e dados de exemplo.
const Estado = (() => {
  const CHAVE = "mercadinho-serido:v1";
  const UNIDADES = ["un", "kg", "L"];
  const AVISO = "Não foi possível carregar os dados salvos. Carregamos o exemplo.";

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
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function formatarISO(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  }

  function normalizarSemana(data = new Date()) {
    const base = data instanceof Date ? new Date(data) : new Date(data);
    if (Number.isNaN(base.getTime())) return formatarISO(new Date());
    base.setHours(12, 0, 0, 0);
    base.setDate(base.getDate() - ((base.getDay() + 6) % 7));
    return formatarISO(base);
  }

  function adicionarSemanas(dataISO, n) {
    const base = new Date(`${dataISO}T12:00:00`);
    if (Number.isNaN(base.getTime())) return normalizarSemana(new Date());
    base.setDate(base.getDate() + Number(n || 0) * 7);
    return formatarISO(base);
  }

  function estadoVazio() {
    return { versao: 1, produtos: [], semanas: [], exemplo: false };
  }

  function estadoExemplo(referencia = new Date()) {
    const ultima = normalizarSemana(referencia);
    const inicio = adicionarSemanas(ultima, -11);
    const produtos = PRODUTOS_EXEMPLO.map(({ base, ...produto }) => ({
      ...produto,
      criadoEm: inicio,
    }));
    const rngs = produtos.map((_, i) => mulberry32(42 + i));
    const semanas = [];
    for (let semana = 0; semana < 12; semana++) {
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
    return { versao: 1, produtos, semanas, exemplo: true };
  }

  function numeroValido(valor) {
    return typeof valor === "number" && Number.isFinite(valor) && valor >= 0;
  }

  function validar(estado) {
    if (!estado || estado.versao !== 1) return false;
    if (!Array.isArray(estado.produtos) || !Array.isArray(estado.semanas)) return false;
    if (typeof estado.exemplo !== "boolean") return false;

    const ids = new Set();
    for (const produto of estado.produtos) {
      if (!produto || typeof produto.id !== "string" || produto.id.length === 0) return false;
      if (ids.has(produto.id)) return false;
      ids.add(produto.id);
      if (typeof produto.nome !== "string" || produto.nome.trim().length === 0) return false;
      if (!UNIDADES.includes(produto.unidade)) return false;
      if (!numeroValido(produto.custo) || !numeroValido(produto.preco)) return false;
      if (!numeroValido(produto.estoqueAtual) || !numeroValido(produto.estoqueMinimo)) return false;
    }

    const semanas = new Set();
    for (const semana of estado.semanas) {
      if (!semana || typeof semana.data !== "string") return false;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(semana.data)) return false;
      if (new Date(`${semana.data}T12:00:00`).getDay() !== 1) return false;
      if (semanas.has(semana.data)) return false;
      semanas.add(semana.data);
      if (!semana.valores || typeof semana.valores !== "object" || Array.isArray(semana.valores)) return false;
      for (const [id, valor] of Object.entries(semana.valores)) {
        if (!ids.has(id)) return false;
        if (!numeroValido(valor)) return false;
      }
    }
    return true;
  }

  function carregar(storage = globalThis.localStorage) {
    try {
      if (!storage || typeof storage.getItem !== "function") {
        return { estado: estadoExemplo(), aviso: null };
      }
      const bruto = storage.getItem(CHAVE);
      if (!bruto) return { estado: estadoExemplo(), aviso: null };
      const salvo = JSON.parse(bruto);
      if (!validar(salvo)) return { estado: estadoExemplo(), aviso: AVISO };
      return { estado: salvo, aviso: null };
    } catch (_) {
      return { estado: estadoExemplo(), aviso: AVISO };
    }
  }

  function salvar(estado, storage = globalThis.localStorage) {
    try {
      if (!storage || typeof storage.setItem !== "function") return false;
      storage.setItem(CHAVE, JSON.stringify(estado));
      return true;
    } catch (_) {
      return false;
    }
  }

  return {
    CHAVE, estadoVazio, estadoExemplo, validar, carregar, salvar,
    normalizarSemana, adicionarSemanas,
  };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Estado;
