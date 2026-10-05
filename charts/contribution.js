import { el, ufName, fmtInt, fmtPct, topCandidates, legend, attachTip, tipLine, tipKey, tableView, percentAxis } from "./shared.js";

function render(root, data) {
  const cands = topCandidates(data);
  const [a, b] = cands;

  // One entry per state: a cell per candidate, ordered by the state's total valid votes (a neutral order).
  const states = Object.keys(data.states).map((uf) => ({
    uf,
    valid: data.states[uf].validVotes,
    cells: cands.map((c) => ({ cand: c, votes: c.byUf[uf].votes, share: c.byUf[uf].natPct })),
  })).sort((x, y) => y.valid - x.valid);
  states.forEach((st, i) => (st.rank = i + 1));

  const maxShare = Math.max(...states.flatMap((s) => s.cells.map((c) => c.share)));
  const axisMax = Math.ceil((maxShare + 4) / 2) * 2; // headroom for the value label

  const top = states[0];
  root.append(el("p", "chart-lead",
    `${a.short} teve ${fmtPct(a.natPct, 2)} dos votos válidos do Brasil; ${b.short}, ${fmtPct(b.natPct, 2)}. ` +
    `Cada barra mostra quanto desse percentual vem de um estado (${ufName(top.uf)}, por exemplo, soma ${fmtPct(top.cells[0].share)} para ${a.short}). ` +
    `Somando todos os estados, chega-se ao total do candidato. Estados do maior para o menor em votos válidos.`));
  root.append(legend(cands.map((c) => ({ color: c.color, label: `${c.name} (${c.party}) · ${fmtPct(c.natPct, 2)} dos votos válidos` }))));

  const card = el("div", "card");
  const plot = el("div", "plot");
  const rows = el("div", "rows");
  states.forEach((st) => {
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
      line.append(el("span", "val", fmtPct(c.share))); // touch screens have no hover, so every bar carries its value
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
      tip.append(el("div", "tip-sep"));
      tip.append(tipLine(el("span", null, "Votos válidos no estado"), el("span", null, fmtInt.format(st.valid))));
    });
    rows.append(row);
  });
  plot.append(percentAxis(axisMax, 2), rows);
  card.append(plot);
  root.append(card);

  root.append(tableView("Ver tabela com todas as UFs",
    ["UF", "Votos válidos no estado", ...cands.flatMap((c) => [`${c.name} (votos)`, "% dos votos válidos do Brasil"])],
    states.map((st) => [ufName(st.uf), fmtInt.format(st.valid), ...st.cells.flatMap((c) => [fmtInt.format(c.votes), fmtPct(c.share, 2)])])));
}

export default {
  id: "contribuicao",
  title: "Comparação entre os candidatos",
  description: "Quanto cada estado soma ao resultado nacional dos dois mais votados, lado a lado.",
  render,
};
