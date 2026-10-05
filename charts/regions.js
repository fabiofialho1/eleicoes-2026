import { el, fmtInt, fmtPct, topCandidates, tableView, attachTip, tipLine, REGIONS, token, luminance, watchTheme, percentAxis } from "./shared.js";

// Stacked bars, one per candidate, on the same axis. The bar's length is the candidate's result in Brazil
// (% of all valid votes) and each segment is how many percentage points one group of regions adds to it, so the
// segments add up to the number at the end of the bar. Used for the five IBGE regions and for grouped regions.
const MIN_LABEL = 3; // segments narrower than this many points get no number inside (the line below the bars has every value)

const pt = (x, d = 1) => x.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });

// `groupsOf(REGIONS)` returns [{ id, label, color, ufs }] with the groups to draw.
export function regionChart({ id, title, description, groupsOf, lead, extra }) {
  function render(root, data) {
    const cands = topCandidates(data);
    const validTotal = cands[0].validTotal;
    const groups = groupsOf(REGIONS).map((g) => ({ ...g, valid: g.ufs.reduce((a, u) => a + data.states[u].validVotes, 0) })).sort((a, b) => b.valid - a.valid);
    const axisMax = Math.ceil(Math.max(...cands.map((c) => c.natPct)) / 0.84 / 10) * 10; // room for the total at the end of the bar

    root.append(el("p", "chart-lead", lead(cands)));

    const legend = el("div", "legend");
    groups.forEach((g) => {
      const sp = el("span");
      const sw = el("i", "swatch"); sw.style.background = `var(${g.color})`;
      sp.append(sw, document.createTextNode(g.label));
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
      const drawn = groups.reduce((a, g) => a + g.ufs.reduce((s, u) => s + cand.byUf[u].natPct, 0), 0); // the exterior is too small to draw
      bar.style.width = `${(drawn / axisMax) * 100}%`;
      groups.forEach((g) => {
        const votes = g.ufs.reduce((a, u) => a + cand.byUf[u].votes, 0);
        const pp = (votes / validTotal) * 100;
        const seg = el("div", "rseg");
        seg.style.flexGrow = pp; seg.style.flexBasis = "0";
        seg.style.background = `var(${g.color})`;
        seg.setAttribute("aria-label", `${g.label}: ${fmtPct(pp, 2)} pontos de ${fmtPct(cand.natPct, 2)} (${fmtInt.format(votes)} votos de ${cand.name})`);
        let label = null;
        if (pp >= MIN_LABEL) { label = el("span", null, pt(pp)); seg.append(label); }
        attachTip(seg, (tip) => {
          tip.append(el("div", "tip-title", `${g.label} · ${cand.name}`));
          tip.append(tipLine(el("span", null, "Soma ao resultado"), el("b", null, `${pt(pp, 2)} pontos de ${fmtPct(cand.natPct, 2)}`)));
          tip.append(tipLine(el("span", null, "Parte dos votos do candidato"), el("b", null, fmtPct((votes / cand.total) * 100))));
          tip.append(tipLine(el("span", null, "Votos"), el("span", null, fmtInt.format(votes))));
          tip.append(tipLine(el("span", null, `${cand.short} nos votos válidos do grupo`), el("span", null, fmtPct((votes / g.valid) * 100))));
        });
        if (label) { labelBoxes.push({ seg, label }); labelPaint.push(() => { label.style.color = luminance(token(g.color)) > 0.6 ? "#0b0b0b" : "#ffffff"; }); }
        bar.append(seg);
      });
      track.append(bar, el("span", "rtotal", fmtPct(cand.natPct, 2)));
      row.append(name, track);
      rows.append(row);
    });
    plot.append(percentAxis(axisMax, 10), rows);

    // Every value, in text, under the bars: narrow segments cannot always hold their number.
    const vals = el("div", "rvals");
    cands.forEach((cand) => {
      const line = el("div", "rline");
      const who = el("b", "rline-who");
      const sw = el("i", "swatch"); sw.style.setProperty("--c", cand.color);
      who.append(sw, document.createTextNode(cand.short));
      line.append(who);
      groups.forEach((g) => {
        const item = el("span", "rline-item");
        const chip = el("i", "swatch"); chip.style.background = `var(${g.color})`;
        item.append(chip, document.createTextNode(`${g.label} `), el("b", null, pt(g.ufs.reduce((a, u) => a + cand.byUf[u].natPct, 0))));
        line.append(item);
      });
      const ext = el("span", "rline-item");
      ext.append(document.createTextNode("Exterior "), el("b", null, pt(cand.byUf.ZZ.natPct, 2)));
      line.append(ext, el("span", "rline-total", `= ${fmtPct(cand.natPct, 2)}`));
      vals.append(line);
    });
    card.append(plot, vals, el("p", "rcap", "Pontos percentuais dos votos válidos do Brasil. O número ao lado de cada barra é o resultado do candidato."));
    root.append(card);

    watchTheme(() => labelPaint.forEach((fn) => fn()));
    const fitLabels = () => labelBoxes.forEach(({ seg, label }) => { label.style.visibility = "visible"; label.style.visibility = seg.clientWidth < label.offsetWidth + 10 ? "hidden" : "visible"; });
    fitLabels();
    if (window.ResizeObserver) new ResizeObserver(fitLabels).observe(plot); else addEventListener("resize", fitLabels);

    if (extra) extra(root, { cands, groups, validTotal, data });

    root.append(tableView("Ver tabela",
      ["Grupo", "Peso nos votos válidos do Brasil", ...cands.flatMap((c) => [`${c.name}: pontos`, "% dos votos do candidato", "votos"])],
      groups.map((g) => [g.label, fmtPct((g.valid / validTotal) * 100), ...cands.flatMap((c) => {
        const votes = g.ufs.reduce((a, u) => a + c.byUf[u].votes, 0);
        return [pt((votes / validTotal) * 100, 2), fmtPct((votes / c.total) * 100), fmtInt.format(votes)];
      })])));
    root.append(el("p", "chart-lead", `O exterior soma ${pt(cands[0].byUf.ZZ.natPct, 2)}% para ${cands[0].short} e ${pt(cands[1].byUf.ZZ.natPct, 2)}% para ${cands[1].short}, pequeno demais para aparecer na barra, mas incluído no total.`));
  }
  return { id, title, description, render };
}

export default regionChart({
  id: "regioes",
  title: "De onde vem o resultado de cada candidato, por região",
  description: "Barras empilhadas: quantos pontos percentuais cada região soma ao resultado de cada um dos dois mais votados.",
  groupsOf: (regions) => regions.map((r) => ({ id: r.id, label: r.label, color: r.color, ufs: r.ufs })),
  lead: (c) =>
    `Cada barra é o resultado do candidato no Brasil (${fmtPct(c[0].natPct, 2)} para ${c[0].short} e ${fmtPct(c[1].natPct, 2)} para ${c[1].short}, em votos válidos). ` +
    "Os segmentos mostram quantos pontos percentuais cada região soma a esse resultado, então somam o total da barra. " +
    "Cada região tem a mesma cor nas duas barras, e a escala é a mesma, para comparar. Passe o mouse ou toque em um segmento para ver os detalhes.",
});
