import { el, fmtInt, fmtPct, topCandidates, tableView, attachTip, tipLine, REGIONS, token, luminance, watchTheme, percentAxis } from "./shared.js";

// One stacked bar per candidate, on the same axis. The bar's length is the candidate's result in Brazil
// (% of all valid votes) and each segment is how many percentage points one region adds to it, so the
// segments add up exactly to the number at the end of the bar.
const MIN_LABEL = 3; // segments narrower than this many points get no number inside (tooltip and table have it)

function render(root, data) {
  const cands = topCandidates(data);
  const validTotal = cands[0].validTotal;
  const regions = REGIONS.map((r) => ({ ...r, valid: r.ufs.reduce((a, u) => a + data.states[u].validVotes, 0) })).sort((a, b) => b.valid - a.valid);
  const axisMax = Math.ceil(Math.max(...cands.map((c) => c.natPct)) / 0.84 / 10) * 10; // room for the total at the end of the bar

  root.append(el("p", "chart-lead",
    `Cada barra é o resultado do candidato no Brasil (${fmtPct(cands[0].natPct, 2)} para ${cands[0].short} e ${fmtPct(cands[1].natPct, 2)} para ${cands[1].short}, em votos válidos). ` +
    "Os segmentos mostram quantos pontos percentuais cada região soma a esse resultado, então somam o total da barra. " +
    "Cada região tem a mesma cor nas duas barras, e a escala é a mesma, para comparar. Passe o mouse ou toque em um segmento para ver os detalhes."));

  const legend = el("div", "legend");
  regions.forEach((r) => {
    const sp = el("span");
    const sw = el("i", "swatch"); sw.style.background = `var(${r.color})`;
    sp.append(sw, document.createTextNode(r.label));
    legend.append(sp);
  });
  root.append(legend);

  const card = el("div", "card");
  const plot = el("div", "plot rplot");
  const rows = el("div", "rows");
  const labelPaint = [];
  const labelBoxes = []; // {seg, label}, hidden when the segment is too narrow for its number
  cands.forEach((cand) => {
    const row = el("div", "rrow");
    const name = el("div", "rname");
    const sw = el("i", "swatch"); sw.style.setProperty("--c", cand.color);
    name.append(sw, document.createTextNode(cand.short));
    const track = el("div", "rtrack");
    const bar = el("div", "rbar");
    const drawn = regions.reduce((a, r) => a + r.ufs.reduce((s, u) => s + cand.byUf[u].natPct, 0), 0); // the exterior is too small to draw
    bar.style.width = `${(drawn / axisMax) * 100}%`;
    regions.forEach((r) => {
      const votes = r.ufs.reduce((a, u) => a + cand.byUf[u].votes, 0);
      const pp = (votes / validTotal) * 100;
      const seg = el("div", "rseg");
      seg.style.flexGrow = pp; seg.style.flexBasis = "0";
      seg.style.background = `var(${r.color})`;
      seg.setAttribute("aria-label", `${r.label}: ${fmtPct(pp, 2)} pontos de ${fmtPct(cand.natPct, 2)} (${fmtInt.format(votes)} votos de ${cand.name})`);
      let label = null;
      if (pp >= MIN_LABEL) { label = el("span", null, pp.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })); seg.append(label); }
      attachTip(seg, (tip) => {
        tip.append(el("div", "tip-title", `${r.label} · ${cand.name}`));
        tip.append(tipLine(el("span", null, "Soma ao resultado"), el("b", null, `${pp.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pontos de ${fmtPct(cand.natPct, 2)}`)));
        tip.append(tipLine(el("span", null, "Parte dos votos do candidato"), el("b", null, fmtPct((votes / cand.total) * 100))));
        tip.append(tipLine(el("span", null, "Votos"), el("span", null, fmtInt.format(votes))));
        tip.append(tipLine(el("span", null, `${cand.short} nos votos válidos da região`), el("span", null, fmtPct((votes / r.valid) * 100))));
      });
      if (label) labelBoxes.push({ seg, label });
      if (label) labelPaint.push(() => { label.style.color = luminance(token(r.color)) > 0.6 ? "#0b0b0b" : "#ffffff"; });
      bar.append(seg);
    });
    track.append(bar, el("span", "rtotal", fmtPct(cand.natPct, 2)));
    row.append(name, track);
    rows.append(row);
  });
  plot.append(percentAxis(axisMax, 10), rows);
  card.append(plot, el("p", "rcap", "Pontos percentuais dos votos válidos do Brasil. O número ao lado de cada barra é o resultado do candidato."));
  root.append(card);
  watchTheme(() => labelPaint.forEach((fn) => fn()));
  const fitLabels = () => labelBoxes.forEach(({ seg, label }) => { label.style.visibility = "visible"; label.style.visibility = seg.clientWidth < label.offsetWidth + 10 ? "hidden" : "visible"; });
  fitLabels();
  if (window.ResizeObserver) new ResizeObserver(fitLabels).observe(plot); else addEventListener("resize", fitLabels);

  root.append(tableView("Ver tabela por região",
    ["Região", "Peso nos votos válidos do Brasil", ...cands.flatMap((c) => [`${c.name}: pontos`, "% dos votos do candidato", "votos"])],
    regions.map((r) => [r.label, fmtPct((r.valid / validTotal) * 100), ...cands.flatMap((c) => {
      const votes = r.ufs.reduce((a, u) => a + c.byUf[u].votes, 0);
      return [(votes / validTotal * 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), fmtPct((votes / c.total) * 100), fmtInt.format(votes)];
    })])));
  root.append(el("p", "chart-lead", `O exterior soma ${fmtPct(cands[0].byUf.ZZ.natPct, 2)} para ${cands[0].short} e ${fmtPct(cands[1].byUf.ZZ.natPct, 2)} para ${cands[1].short}, pequeno demais para aparecer na barra, mas incluído no total.`));
}

export default {
  id: "regioes",
  title: "De onde vem o resultado de cada candidato, por região",
  description: "Barras empilhadas: quantos pontos percentuais cada região soma ao resultado de cada um dos dois mais votados.",
  render,
};
