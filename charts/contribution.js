import { el, ufName, fmtInt, fmtPct, topCandidates, legend, attachTip, tipLine, tipKey, tableView, percentAxis } from "./shared.js";

const ROWS_LABELED = 3; // value labels only on the largest rows; the rest live in tooltip and table

function render(root, data) {
  const cands = topCandidates(data);
  const [a, b] = cands;

  // One entry per state: a cell per candidate, ordered by the first candidate's votes in the state.
  const states = Object.keys(data.states).map((uf) => ({
    uf,
    cells: cands.map((c) => ({ cand: c, votes: c.byUf[uf].votes, share: c.byUf[uf].natPct })),
  })).sort((x, y) => y.cells[0].votes - x.cells[0].votes);
  states.forEach((st, i) => (st.rank = i + 1));

  const maxShare = Math.max(...states.flatMap((s) => s.cells.map((c) => c.share)));
  const axisMax = Math.ceil((maxShare + 2) / 2) * 2; // headroom for the value label

  const top = states[0];
  root.append(el("p", "chart-lead",
    `${a.short} teve ${fmtPct(a.natPct, 2)} dos votos válidos do Brasil e ${b.short} teve ${fmtPct(b.natPct, 2)}. ` +
    `Cada barra mostra quanto desse percentual vem de um estado: por exemplo, os votos de ${a.short} em ${ufName(top.uf)} equivalem a ${fmtPct(top.cells[0].share)} ` +
    `de todos os votos válidos do país. Somando todos os estados, as barras de cada candidato fecham o percentual nacional dele. ` +
    `Estados ordenados pelos votos de ${a.short}.`));
  root.append(legend(cands.map((c) => ({ color: c.color, label: `${c.name} (${c.party}) · ${fmtPct(c.natPct, 2)} dos votos válidos` }))));

  const card = el("div", "card");
  const plot = el("div", "plot");
  const rows = el("div", "rows");
  states.forEach((st, i) => {
    const row = el("div", "crow");
    row.setAttribute("aria-label", `${ufName(st.uf)}: ` + st.cells.map((c) => `${c.cand.name} ${fmtPct(c.share)} dos votos válidos do Brasil`).join(", "));
    row.append(el("div", "name", ufName(st.uf)));
    const track = el("div", "ctrack");
    st.cells.forEach((c) => {
      const line = el("div", "barline");
      const bar = el("div", "bar");
      bar.style.setProperty("--c", c.cand.color);
      bar.style.width = `${(c.share / axisMax) * 100}%`;
      line.append(bar);
      if (i < ROWS_LABELED) line.append(el("span", "val", fmtPct(c.share)));
      track.append(line);
    });
    row.append(track);
    attachTip(row, (tip) => {
      tip.append(el("div", "tip-title", `${ufName(st.uf)} · parte de cada candidato nos votos válidos do Brasil`));
      st.cells.forEach((c) => {
        const val = el("span");
        val.append(el("b", null, fmtPct(c.share, 2)), document.createTextNode(` · ${fmtInt.format(c.votes)} votos`));
        tip.append(tipLine(tipKey(c.cand.color, c.cand.name), val));
      });
    });
    rows.append(row);
  });
  plot.append(percentAxis(axisMax, 2), rows);
  card.append(plot);
  root.append(card);

  root.append(tableView("Ver tabela com todas as UFs",
    ["UF", ...cands.flatMap((c) => [`${c.name} (votos)`, "% dos votos válidos do Brasil"])],
    states.map((st) => [ufName(st.uf), ...st.cells.flatMap((c) => [fmtInt.format(c.votes), fmtPct(c.share, 2)])])));
}

export default {
  id: "contribuicao",
  title: "De onde vem o resultado de cada candidato: comparação",
  description: "Presidente, 1º turno: quanto do percentual nacional de votos válidos de cada um dos dois candidatos mais votados vem de cada estado.",
  render,
};
