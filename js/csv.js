// Importação simples de CSV para demanda e estoque.
const CSV = (() => {
  function detectarDelimitador(texto) {
    const primeira = String(texto).split(/\r?\n/)[0] || "";
    const pontoVirgula = (primeira.match(/;/g) || []).length;
    const virgula = (primeira.match(/,/g) || []).length;
    return pontoVirgula > virgula ? ";" : ",";
  }

  function parse(texto) {
    if (!texto || String(texto).trim() === "") return [];
    const delim = detectarDelimitador(texto);
    const linhas = [];
    let linha = [], campo = "", dentroDeAspas = false;

    for (let i = 0; i < texto.length; i++) {
      const c = texto[i];
      if (dentroDeAspas) {
        if (c === '"') {
          if (texto[i + 1] === '"') { campo += '"'; i++; }
          else dentroDeAspas = false;
        } else campo += c;
      } else if (c === '"') {
        dentroDeAspas = true;
      } else if (c === delim) {
        linha.push(campo); campo = "";
      } else if (c === "\n") {
        linha.push(campo); linhas.push(linha); linha = []; campo = "";
      } else if (c !== "\r") {
        campo += c;
      }
    }
    if (campo !== "" || linha.length > 0) {
      linha.push(campo);
      linhas.push(linha);
    }
    return linhas.filter((l) => l.some((v) => String(v).trim() !== ""));
  }

  function numero(valor) {
    const t = String(valor ?? "").trim();
    if (t === "") return NaN;
    const normalizado = t.includes(",") && !t.includes(".") ? t.replace(",", ".") : t;
    const n = Number(normalizado);
    return Number.isFinite(n) ? n : NaN;
  }

  function cabecalho(linha) {
    return linha.map((v) => String(v).replace(/^\uFEFF/, "").trim().toLowerCase());
  }

  function importarDemanda(texto) {
    const linhas = parse(texto);
    if (linhas.length < 2) throw new Error("CSV de demanda inválido");
    const head = cabecalho(linhas[0]);
    const iSemana = head.indexOf("semana");
    const iCaprino = head.indexOf("caprino");
    const iOvino = head.indexOf("ovino");
    if (iSemana < 0 || iCaprino < 0 || iOvino < 0) throw new Error("CSV de demanda inválido");

    const registros = [];
    const vistas = new Set();
    for (const linha of linhas.slice(1)) {
      const semana = numero(linha[iSemana]);
      const caprino = numero(linha[iCaprino]);
      const ovino = numero(linha[iOvino]);
      if (!Number.isInteger(semana) || semana <= 0 ||
          !Number.isFinite(caprino) || !Number.isFinite(ovino) || caprino < 0 || ovino < 0 ||
          vistas.has(semana)) {
        throw new Error("CSV de demanda inválido");
      }
      vistas.add(semana);
      registros.push({ semana, caprino, ovino });
    }
    if (registros.length === 0) throw new Error("CSV de demanda inválido");
    registros.sort((a, b) => a.semana - b.semana);
    return {
      semanas: registros.map((r) => r.semana),
      caprino: registros.map((r) => r.caprino),
      ovino: registros.map((r) => r.ovino),
      origem: "importado",
    };
  }

  function importarEstoque(texto) {
    const linhas = parse(texto);
    if (linhas.length < 2) throw new Error("CSV de estoque inválido");
    const head = cabecalho(linhas[0]);
    const iProduto = head.indexOf("produto");
    const iEstoque = head.indexOf("estoque_kg");
    if (iProduto < 0 || iEstoque < 0) throw new Error("CSV de estoque inválido");

    const estoque = { caprino: null, ovino: null };
    const vistos = new Set();
    for (const linha of linhas.slice(1)) {
      const produto = String(linha[iProduto] ?? "").trim().toLowerCase();
      if (produto !== "caprino" && produto !== "ovino") continue;
      if (vistos.has(produto)) throw new Error("CSV de estoque inválido");
      vistos.add(produto);
      const valor = numero(linha[iEstoque]);
      if (!Number.isFinite(valor) || valor < 0) throw new Error("CSV de estoque inválido");
      estoque[produto] = valor;
    }
    if (estoque.caprino === null || estoque.ovino === null) throw new Error("CSV de estoque inválido");
    return estoque;
  }

  return { parse, importarDemanda, importarEstoque };
})();

if (typeof module !== "undefined" && module.exports) module.exports = CSV;
