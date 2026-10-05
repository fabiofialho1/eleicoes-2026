import { el, ufName, fmtInt, fmtPct, topCandidates, attachTip, tipLine, percentAxis, tableView } from "./shared.js";

function panel(cand, axisMax) {
  // States ordered by this candidate's own contribution.
  const rows = Object.keys(cand.byUf)
    .map((uf) => ({ uf, votes: cand.byUf[uf].votes, share: (cand.byUf[uf].votes / cand.total) * 100 }))
    .sort((x, y) => y.votes - x.votes);
  let acc = 0;
  rows.forEach((r, i) => { r.rank = i + 1; acc += r.share; r.cumulative = acc; });

  const card = el("div", "card");
  const head = el("div", "panel-head");
  const sw = el("i", "swatch");
  sw.style.setProperty("--c", cand.color);
  head.append(sw, el("h3", null, `${cand.name} (${cand.party})`));
  card.append(head, el("p", "panel-meta", `${fmtInt.format(cand.total)} votos no total · os 3 maiores estados somam ${fmtPct(rows[2].cumulative)}`));

  const plot = el("div", "plot");
  const list = el("div", "rows");
  rows.forEach((r) => {
    const row = el("div", "srow");
    row.setAttribute("aria-label", `${ufName(r.uf)}: ${fmtPct(r.share)} dos votos de ${cand.name} (${fmtInt.format(r.votes)} votos)`);
    row.append(el("div", "name", ufName(r.uf)));
    const line = el("div", "barline");
    const bar = el("div", "bar");
    bar.style.setProperty("--c", cand.color);
    bar.style.width = `${(r.share / axisMax) * 100}%`;
    line.append(bar, el("span", "val", fmtPct(r.share)));
    row.append(line);
    attachTip(row, (tip) => {
      tip.append(el("div", "tip-title", `${ufName(r.uf)} · ${r.rank}º em votos de ${cand.short}`));
      const val = el("span");
      val.append(el("b", null, fmtPct(r.share)), document.createTextNode(` · ${fmtInt.format(r.votes)} votos`));
      tip.append(tipLine(el("span", null, cand.name), val));
      tip.append(tipLine(el("span", null, `Os ${r.rank} maiores somam`), el("b", null, fmtPct(r.cumulative))));
    });
    list.append(row);
  });
  plot.append(percentAxis(axisMax), list);
  card.append(plot);
  return { card, rows };
}

function render(root, data) {
  const cands = topCandidates(data);
  const shares = cands.flatMap((c) => Object.values(c.byUf).map((v) => (v.votes / c.total) * 100));
  const axisMax = Math.ceil((Math.max(...shares) + 4) / 5) * 5; // same scale in both charts, with room for the value label

  root.append(el("p", "chart-lead",
    "Um gráfico para cada candidato, com os estados em ordem decrescente de contribuição. " +
    "Cada barra é a parcela dos votos do candidato que vem do estado (votos no estado ÷ votos do candidato no país). A escala é a mesma nos dois."));
  const pair = el("div", "pair");
  const built = cands.map((c) => panel(c, axisMax));
  built.forEach((b) => pair.append(b.card));
  root.append(pair);

  cands.forEach((c, i) => {
    root.append(tableView(`Ver tabela: ${c.name}`, ["Posição", "UF", "Votos", "% do total do candidato", "% acumulado"],
      built[i].rows.map((r) => [`${r.rank}º`, ufName(r.uf), fmtInt.format(r.votes), fmtPct(r.share), fmtPct(r.cumulative)])));
  });
}

export default {
  id: "contribuicao-por-candidato",
  title: "Contribuição dos estados: um gráfico por candidato",
  description: "Presidente, 1º turno: os estados em ordem de contribuição para o total de votos de cada candidato.",
  render,
};
