import { el, fmtInt, fmtPct, topCandidates, tableView, attachTip, tipLine, REGIONS, token, luminance, watchTheme } from "./shared.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const svgEl = (tag, attrs = {}) => {
  const e = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
};

const CX = 150, CY = 150, R_OUT = 138, R_IN = 82;
const point = (r, angle) => [CX + r * Math.sin(angle), CY - r * Math.cos(angle)]; // angle 0 = top, clockwise
function slicePath(a0, a1) {
  const [x0, y0] = point(R_OUT, a0), [x1, y1] = point(R_OUT, a1), [x2, y2] = point(R_IN, a1), [x3, y3] = point(R_IN, a0);
  const big = a1 - a0 > Math.PI ? 1 : 0;
  return `M${x0} ${y0}A${R_OUT} ${R_OUT} 0 ${big} 1 ${x1} ${y1}L${x2} ${y2}A${R_IN} ${R_IN} 0 ${big} 0 ${x3} ${y3}Z`;
}
const million = (n) => (n / 1e6).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " mi";

function render(root, data) {
  const cands = topCandidates(data);
  const validTotal = cands[0].validTotal;
  const regions = REGIONS.map((r) => ({ ...r, valid: r.ufs.reduce((a, u) => a + data.states[u].validVotes, 0) })).sort((a, b) => b.valid - a.valid);
  const abroadShare = (c) => (c.byUf.ZZ.votes / c.total) * 100;

  root.append(el("p", "chart-lead",
    `Cada anel soma os votos do candidato (100%). Os percentuais mostram a parte dos votos dele que vem de cada região. Não são o resultado dele no Brasil, que é ${fmtPct(cands[0].natPct, 2)} dos votos válidos para ${cands[0].short} e ${fmtPct(cands[1].natPct, 2)} para ${cands[1].short}. ` +
    "Cada região tem a mesma cor nos dois anéis, para comparar o tamanho das fatias, e as regiões seguem a mesma ordem, da que tem mais votos válidos à que tem menos. Passe o mouse ou toque em uma fatia para ver os detalhes."));

  const grid = el("div", "donuts");
  const repaint = [];
  cands.forEach((cand) => {
    const rows = regions.map((r) => {
      const votes = r.ufs.reduce((a, u) => a + cand.byUf[u].votes, 0);
      return { ...r, votes, share: (votes / cand.total) * 100, pp: (votes / validTotal) * 100, local: (votes / r.valid) * 100 };
    });

    const card = el("div", "card donut-card");
    const head = el("div", "panel-head");
    const sw = el("i", "swatch"); sw.style.setProperty("--c", cand.color);
    head.append(sw, el("h3", null, `${cand.name} (${cand.party})`));
    card.append(head, el("p", "panel-meta", `${fmtInt.format(cand.total)} votos · ${fmtPct(cand.natPct, 2)} dos votos válidos do Brasil`));

    const svg = svgEl("svg", { viewBox: "0 0 300 300", class: "donut-svg", role: "group", "aria-label": `Parte do total de ${cand.name} vinda de cada região` });
    let angle = 0;
    const slices = rows.map((r, i) => {
      const a0 = angle, a1 = angle + (r.share / 100) * 2 * Math.PI;
      angle = a1;
      const path = svgEl("path", { d: slicePath(a0, a1), class: "donut-slice" });
      path.setAttribute("aria-label", `${r.label}: ${fmtPct(r.share)} do total de ${cand.name}, ${fmtInt.format(r.votes)} votos`);
      attachTip(path, (tip) => {
        tip.append(el("div", "tip-title", `${r.label} · ${cand.name}`));
        const v = el("span"); v.append(el("b", null, fmtPct(r.share)), document.createTextNode(` do total · ${fmtInt.format(r.votes)} votos`));
        tip.append(tipLine(el("span", null, "Parte do total"), v));
        tip.append(tipLine(el("span", null, "Pontos do percentual nacional"), el("b", null, fmtPct(r.pp, 2))));
        tip.append(tipLine(el("span", null, "Votos válidos da região"), el("span", null, fmtPct(r.local) + " para " + cand.short)));
      });
      svg.append(path);
      let label = null;
      if (r.share >= 9) { // a label only fits the bigger slices; the list below has every value
        const [lx, ly] = point((R_OUT + R_IN) / 2, (a0 + a1) / 2);
        label = svgEl("text", { x: lx, y: ly, class: "donut-pct" });
        label.textContent = fmtPct(r.share, 0);
        svg.append(label);
      }
      path.style.fill = `var(${r.color})`;
      return { path, label, region: r };
    });
    const num = svgEl("text", { x: CX, y: CY - 2, class: "donut-num" }); num.textContent = `${(cand.total / 1e6).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mi`;
    const cap = svgEl("text", { x: CX, y: CY + 22, class: "donut-cap" }); cap.textContent = "de votos";
    svg.append(num, cap);
    card.append(svg);

    card.append(el("p", "donut-cols", "Região · % dos votos do candidato · votos"));
    const list = el("ul", "donut-legend");
    rows.forEach((r) => {
      const li = el("li");
      const chip = el("i", "swatch");
      chip.style.background = `var(${r.color})`;
      li.append(chip, el("span", "lg-name", r.label), el("b", "lg-pct", fmtPct(r.share)), el("span", "lg-votes", `${million(r.votes)} de votos`));
      list.append(li);
    });
    card.append(list);
    card.append(el("p", "donut-note", `Exterior: ${fmtPct(abroadShare(cand))}, pequeno demais para aparecer no anel.`));

    // Slice colors come from CSS variables (they follow the theme); only the label color needs the resolved color.
    repaint.push(() => slices.forEach((s) => {
      if (s.label) s.label.style.fill = luminance(token(s.region.color)) > 0.6 ? "#0b0b0b" : "#ffffff";
    }));
    grid.append(card);
  });
  root.append(grid);
  watchTheme(() => repaint.forEach((fn) => fn()));

  root.append(tableView("Ver tabela por região",
    ["Região", "Peso nos votos válidos do Brasil", ...cands.flatMap((c) => [`${c.name} (votos)`, "% do total do candidato", "% dos votos válidos da região"])],
    regions.map((r) => [r.label, fmtPct((r.valid / validTotal) * 100), ...cands.flatMap((c) => {
      const votes = r.ufs.reduce((a, u) => a + c.byUf[u].votes, 0);
      return [fmtInt.format(votes), fmtPct((votes / c.total) * 100), fmtPct((votes / r.valid) * 100)];
    })])));
}

export default {
  id: "regioes",
  title: "De onde vem o total de cada candidato, por região",
  description: "A parte do total de votos de cada um dos dois mais votados que vem de cada região do país.",
  render,
};
