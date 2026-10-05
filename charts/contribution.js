import { el, ufName, fmtInt, fmtPct, topCandidates, legend, attachTip, tipLine, tipKey, tableView, percentAxis } from "./shared.js";

const ROWS_LABELED = 3; // value labels only on the largest rows; the rest live in tooltip and table

function render(root, data) {
  const cands = topCandidates(data);
  const [a, b] = cands;

  // One entry per state, ordered by the first candidate's contribution.
  const states = Object.keys(data.states).map((uf) => ({
    uf,
    cells: cands.map((c) => ({ cand: c, votes: c.byUf[uf].votes, share: (c.byUf[uf].votes / c.total) * 100 })),
  })).sort((x, y) => y.cells[0].votes - x.cells[0].votes);
  states.forEach((st, i) => (st.rank = i + 1));

  const maxShare = Math.max(...states.flatMap((s) => s.cells.map((c) => c.share)));
  const axisMax = Math.ceil((maxShare + 4) / 5) * 5; // headroom for the value label

  const top3 = states.slice(0, 3);
  const sum3 = (i) => top3.reduce((acc, s) => acc + s.cells[i].share, 0);
  root.append(el("p", "chart-lead",
    `${top3.map((s) => s.uf).join(", ")} somam ${fmtPct(sum3(0))} dos votos de ${a.short} e ${fmtPct(sum3(1))} dos de ${b.short}. ` +
    `Cada barra é a parcela dos votos do candidato que vem do estado (votos no estado ÷ votos do candidato no país). Estados ordenados pela contribuição para ${a.short}.`));
  root.append(legend(cands.map((c) => ({ color: c.color, label: `${c.name} (${c.party}) · ${fmtInt.format(c.total)} votos` }))));

  const card = el("div", "card");
  const plot = el("div", "plot");
  const rows = el("div", "rows");
  states.forEach((st, i) => {
    const row = el("div", "crow");
    row.setAttribute("aria-label", `${ufName(st.uf)}: ` + st.cells.map((c) => `${c.cand.name} ${fmtPct(c.share)}`).join(", "));
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
      tip.append(el("div", "tip-title", `${ufName(st.uf)} · ${st.rank}º em votos de ${a.short}`));
      st.cells.forEach((c) => {
        const val = el("span");
        val.append(el("b", null, fmtPct(c.share)), document.createTextNode(` · ${fmtInt.format(c.votes)} votos`));
        tip.append(tipLine(tipKey(c.cand.color, c.cand.name), val));
      });
      const diff = st.cells[0].votes - st.cells[1].votes;
      tip.append(el("div", "tip-sep"));
      tip.append(tipLine(
        el("span", null, `Saldo ${a.short} − ${b.short}`),
        el("b", null, (diff > 0 ? "+" : diff < 0 ? "−" : "") + fmtInt.format(Math.abs(diff)))));
    });
    rows.append(row);
  });
  plot.append(percentAxis(axisMax), rows);
  card.append(plot);
  root.append(card);

  root.append(tableView("Ver tabela com todas as UFs",
    ["UF", ...cands.flatMap((c) => [`${c.name} (votos)`, "% do total"])],
    states.map((st) => [ufName(st.uf), ...st.cells.flatMap((c) => [fmtInt.format(c.votes), fmtPct(c.share)])])));
}

export default {
  id: "contribuicao",
  title: "Contribuição dos estados: comparação entre os dois candidatos",
  description: "Presidente, 1º turno: de que estados vem o total de votos de cada um dos dois candidatos mais votados, lado a lado.",
  render,
};
