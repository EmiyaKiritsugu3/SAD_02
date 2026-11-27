// Helpers de data compartilhados entre estado e vendas.
const Datas = (() => {
  function formatarISO(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  }

  function paraData(data) {
    if (data instanceof Date) {
      const copia = new Date(data);
      copia.setHours(12, 0, 0, 0);
      return copia;
    }
    if (typeof data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return new Date(`${data}T12:00:00`);
    }
    return new Date(Number.NaN);
  }

  function normalizarDia(data = new Date()) {
    const base = paraData(data);
    if (Number.isNaN(base.getTime())) return formatarISO(new Date());
    base.setHours(12, 0, 0, 0);
    return formatarISO(base);
  }

  function segundaAtual() {
    const hoje = new Date();
    hoje.setHours(12, 0, 0, 0);
    hoje.setDate(hoje.getDate() - ((hoje.getDay() + 6) % 7));
    return formatarISO(hoje);
  }

  function normalizarSemana(data = new Date()) {
    const base = paraData(data);
    if (Number.isNaN(base.getTime())) return segundaAtual();
    base.setHours(12, 0, 0, 0);
    base.setDate(base.getDate() - ((base.getDay() + 6) % 7));
    return formatarISO(base);
  }

  function adicionarDias(dataISO, n) {
    const base = paraData(dataISO);
    if (Number.isNaN(base.getTime())) return normalizarDia(new Date());
    base.setDate(base.getDate() + Number(n || 0));
    return formatarISO(base);
  }

  function adicionarSemanas(dataISO, n) {
    return adicionarDias(dataISO, Number(n || 0) * 7);
  }

  function fimSemana(dataISO) {
    return adicionarDias(normalizarSemana(dataISO), 6);
  }

  return {
    formatarISO, paraData, normalizarDia, normalizarSemana,
    adicionarDias, adicionarSemanas, fimSemana,
  };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Datas;
else globalThis.Datas = Datas;
