// Gráficos SVG sem dependências.
const Charts = (() => {
  const nfNum = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
  const nfDec = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
  const nfBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function formatarKg(n) {
    return `${nfNum.format(Number(n) || 0)} kg`;
  }

  function formatarBRL(n) {
    return nfBRL.format(Number(n) || 0);
  }

  function formatarNumero(n, decimais = 0) {
    return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: decimais }).format(Number(n) || 0);
  }

  function formatarPct(n) {
    return `${nfDec.format((Number(n) || 0) * 100)}%`;
  }

  function linha({ series = [], labels = [], width = 760, height = 290, rotuloY = "kg", formatoY = formatarNumero } = {}) {
    const pad = { top: 30, right: 24, bottom: 40, left: 68 };
    const w = width - pad.left - pad.right;
    const h = height - pad.top - pad.bottom;
    const valores = series.flatMap((s) => s.valores).filter((v) => v !== null && Number.isFinite(v));
    let min = Math.min(0, ...valores);
    let max = Math.max(1, ...valores);
    if (max === min) max = min + 1;
    const passoY = (max - min) / 4;
    const x = (i) => pad.left + (labels.length <= 1 ? w / 2 : (i / (labels.length - 1)) * w);
    const y = (v) => pad.top + h - ((v - min) / (max - min)) * h;
    const partes = [];
    partes.push(`<svg class="chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Gráfico de linha: ${escapeHtml(rotuloY)}">`);

    for (let i = 0; i <= 4; i++) {
      const val = min + passoY * i;
      const py = y(val);
      partes.push(`<line x1="${pad.left}" y1="${py.toFixed(1)}" x2="${width - pad.right}" y2="${py.toFixed(1)}" stroke="#e2d5c3" stroke-width="1" />`);
      partes.push(`<text x="${pad.left - 10}" y="${(py + 4).toFixed(1)}" text-anchor="end" class="chart-label">${escapeHtml(formatoY(val))}</text>`);
    }

    const passoX = Math.max(1, Math.ceil(labels.length / 8));
    labels.forEach((label, i) => {
      if (i % passoX !== 0 && i !== labels.length - 1) return;
      partes.push(`<text x="${x(i).toFixed(1)}" y="${height - pad.bottom + 22}" text-anchor="middle" class="chart-label">${escapeHtml(label)}</text>`);
    });

    series.forEach((s, idx) => {
      const cor = s.cor || (idx === 0 ? "#b5522f" : "#5d6b4a");
      let d = "", caneta = false;
      s.valores.forEach((v, i) => {
        if (v === null || !Number.isFinite(v)) { caneta = false; return; }
        const px = x(i), py = y(v);
        d += `${caneta ? " L" : " M"}${px.toFixed(1)} ${py.toFixed(1)}`;
        caneta = true;
      });
      partes.push(`<path d="${d}" fill="none" stroke="${cor}" stroke-width="2.5" ${s.tracejado ? 'stroke-dasharray="7 6"' : ""} stroke-linejoin="round" stroke-linecap="round" />`);
      s.valores.forEach((v, i) => {
        if (v === null || !Number.isFinite(v)) return;
        partes.push(`<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3" fill="${cor}" />`);
      });
    });

    let lx = pad.left;
    series.forEach((s, idx) => {
      const cor = s.cor || (idx === 0 ? "#b5522f" : "#5d6b4a");
      partes.push(`<line x1="${lx}" y1="14" x2="${lx + 18}" y2="14" stroke="${cor}" stroke-width="3" ${s.tracejado ? 'stroke-dasharray="5 4"' : ""} />`);
      partes.push(`<text x="${lx + 24}" y="18" class="chart-label">${escapeHtml(s.nome || `Série ${idx + 1}`)}</text>`);
      lx += 24 + String(s.nome || "").length * 7 + 26;
    });

    partes.push("</svg>");
    return `<div class="chart-wrap">${partes.join("")}</div>`;
  }

  function barras({ itens = [], width = 640, height = 220, cor = "#5d6b4a", formato = formatarNumero } = {}) {
    const top = 16, left = 150, right = 92, rowH = 38;
    const h = Math.max(height, top + itens.length * rowH + 16);
    const w = width - left - right;
    const max = Math.max(1, ...itens.map((i) => Number(i.valor) || 0));
    const partes = [`<svg class="chart" viewBox="0 0 ${width} ${h}" role="img" aria-label="Gráfico de barras">`];

    itens.forEach((item, i) => {
      const y = top + i * rowH;
      const valor = Math.max(0, Number(item.valor) || 0);
      const bw = (valor / max) * w;
      const corItem = item.cor || cor;
      partes.push(`<text x="${left - 12}" y="${y + rowH / 2 + 4}" text-anchor="end" class="chart-label">${escapeHtml(item.rotulo)}</text>`);
      partes.push(`<rect x="${left}" y="${y + 9}" width="${w}" height="${rowH - 18}" rx="6" fill="#efe4d4" />`);
      partes.push(`<rect x="${left}" y="${y + 9}" width="${bw.toFixed(1)}" height="${rowH - 18}" rx="6" fill="${corItem}" />`);
      partes.push(`<text x="${(left + bw + 10).toFixed(1)}" y="${y + rowH / 2 + 4}" class="chart-value">${escapeHtml(formato(valor))}</text>`);
    });

    partes.push("</svg>");
    return `<div class="chart-wrap">${partes.join("")}</div>`;
  }

  return {
    linha, barras, escapeHtml,
    formatarKg, formatarBRL, formatarNumero, formatarPct,
  };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Charts;
