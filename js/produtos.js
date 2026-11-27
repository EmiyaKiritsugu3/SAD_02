// Cadastro e validação de produtos do mercadinho.
const Produtos = (() => {
  const UNIDADES = ["un", "kg", "L"];

  function slug(texto) {
    const limpo = String(texto ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    let saida = "";
    for (const caractere of limpo) {
      const valido = (caractere >= "a" && caractere <= "z") || (caractere >= "0" && caractere <= "9");
      if (valido) {
        saida += caractere;
      } else if (saida.length > 0 && !saida.endsWith("-")) {
        saida += "-";
      }
    }
    return saida.replace(/-+$/g, "");
  }

  function validar(produto, existentes = [], idAtual = null) {
    const erros = [];
    const nome = String(produto?.nome ?? "").trim();
    if (nome.length < 2 || nome.length > 60) {
      erros.push("Informe um nome entre 2 e 60 caracteres.");
    }
    if (!UNIDADES.includes(produto?.unidade)) {
      erros.push("Escolha uma unidade válida (un, kg ou L).");
    }
    for (const campo of ["custo", "preco", "estoqueAtual", "estoqueMinimo"]) {
      const valor = produto?.[campo];
      if (typeof valor !== "number" || !Number.isFinite(valor) || valor < 0) {
        erros.push(`O campo ${campo} deve ser um número maior ou igual a zero.`);
      }
    }
    const duplicado = existentes.some((p) =>
      p.id !== idAtual && String(p.nome ?? "").trim().toLowerCase() === nome.toLowerCase());
    if (duplicado) erros.push("Já existe um produto com esse nome.");
    return erros;
  }

  function idNovo(nome, existentes = [], agora = Date.now()) {
    const base = `p-${slug(nome) || "produto"}-${agora}`;
    let id = base;
    let sufixo = 2;
    while (existentes.some((p) => p.id === id)) {
      id = `${base}-${sufixo++}`;
    }
    return id;
  }

  function criar(dados, existentes = [], agora = Date.now()) {
    const nome = String(dados?.nome ?? "").trim();
    const produto = {
      id: idNovo(nome, existentes, agora),
      nome,
      unidade: dados?.unidade,
      custo: Number(dados?.custo),
      preco: Number(dados?.preco),
      estoqueAtual: Number(dados?.estoqueAtual),
      estoqueMinimo: Number(dados?.estoqueMinimo),
      criadoEm: new Date(Number(agora) || Date.now()).toISOString().slice(0, 10),
    };
    const erros = validar(produto, existentes);
    if (erros.length > 0) throw new Error(erros[0]);
    return produto;
  }

  function atualizar(produto, dados, existentes = []) {
    const atualizado = {
      ...produto,
      nome: String(dados?.nome ?? produto.nome).trim(),
      unidade: dados?.unidade ?? produto.unidade,
      custo: Number(dados?.custo ?? produto.custo),
      preco: Number(dados?.preco ?? produto.preco),
      estoqueAtual: Number(dados?.estoqueAtual ?? produto.estoqueAtual),
      estoqueMinimo: Number(dados?.estoqueMinimo ?? produto.estoqueMinimo),
      id: produto.id,
      criadoEm: produto.criadoEm,
    };
    const erros = validar(atualizado, existentes, produto.id);
    if (erros.length > 0) throw new Error(erros[0]);
    return atualizado;
  }

  function remover(produtos, id) {
    if (!Array.isArray(produtos) || produtos.length <= 1) {
      throw new Error("Mantenha pelo menos um produto cadastrado.");
    }
    if (!produtos.some((p) => p.id === id)) {
      throw new Error("Produto não encontrado.");
    }
    return produtos.filter((p) => p.id !== id);
  }

  function porId(produtos, id) {
    return produtos.find((p) => p.id === id);
  }

  return { UNIDADES, validar, criar, atualizar, remover, porId, idNovo };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Produtos;
