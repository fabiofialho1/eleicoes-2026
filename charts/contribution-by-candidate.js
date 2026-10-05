import { el, ufName, fmtInt, fmtPct, topCandidates, attachTip, tipLine, percentAxis, tableView } from "./shared.js";

function panel(cand, axisMax) {
  // States ordered by this candidate's own votes. share = % of ALL valid votes in Brazil.
  const rows = Object.keys(cand.byUf)
    .map((uf) => ({ uf, votes: cand.byUf[uf].votes, share: cand.byUf[uf].natPct }))
    .sort((x, y) => y.votes - x.votes);
  let acc = 0;
  rows.forEach((r, i) => { r.rank = i + 1; acc += r.share; r.cumulative = acc; });

  const card = el("div", "card");
  const head = el("div", "panel-head");
  const sw = el("i", "swatch");
  sw.style.setProperty("--c", cand.color);
  head.append(sw, el("h3", null, `${cand.name} (${cand.party})`));
  card.append(head, el("p", "panel-meta",
    `${fmtPct(cand.natPct, 2)} dos votos válidos do Brasil (${fmtInt.format(cand.total)} votos) · só SP, MG e RJ somam ${fmtPct(rows[2].cumulative)} desse total`));

  const plot = el("div", "plot");
  const list = el("div", "rows");
  rows.forEach((r) => {
    const row = el("div", "srow");
    row.setAttribute("aria-label", `${ufName(r.uf)}: ${fmtInt.format(r.votes)} votos de ${cand.name}, ${fmtPct(r.share, 2)} dos votos válidos do Brasil`);
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
      val.append(el("b", null, fmtPct(r.share, 2)), document.createTextNode(` · ${fmtInt.format(r.votes)} votos`));
      tip.append(tipLine(el("span", null, "% dos votos válidos do Brasil"), val));
      tip.append(tipLine(el("span", null, `Acumulado até aqui (de ${fmtPct(cand.natPct, 2)})`), el("b", null, fmtPct(r.cumulative, 2))));
    });
    list.append(row);
  });
  plot.append(percentAxis(axisMax, 2), list);
  card.append(plot);
  return { card, rows };
}

function render(root, data) {
  const cands = topCandidates(data);
  const maxShare = Math.max(...cands.flatMap((c) => Object.values(c.byUf).map((v) => v.natPct)));
  const axisMax = Math.ceil((maxShare + 2) / 2) * 2; // same scale in both charts, with room for the value label

  root.append(el("p", "chart-lead",
    "Um gráfico para cada candidato, com os estados em ordem decrescente de votos. Cada barra é a parte do percentual nacional do candidato que vem do estado, " +
    "medida sobre todos os votos válidos do país. Somando os estados, chega-se ao percentual que o candidato teve no Brasil. A escala é a mesma nos dois."));
  const pair = el("div", "pair");
  const built = cands.map((c) => panel(c, axisMax));
  built.forEach((b) => pair.append(b.card));
  root.append(pair);

  cands.forEach((c, i) => {
    root.append(tableView(`Ver tabela: ${c.name}`, ["Posição", "UF", "Votos", "% dos votos válidos do Brasil", "% acumulado"],
      built[i].rows.map((r) => [`${r.rank}º`, ufName(r.uf), fmtInt.format(r.votes), fmtPct(r.share, 2), fmtPct(r.cumulative, 2)])));
  });
}

export default {
  id: "contribuicao-por-candidato",
  title: "De onde vem o resultado de cada candidato: um gráfico por candidato",
  description: "Presidente, 1º turno: os estados em ordem de votos, mostrando quanto cada um soma ao percentual nacional do candidato.",
  render,
};
