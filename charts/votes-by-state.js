import { el, ufName, fmtInt, fmtPct, topCandidates, legend, attachTip, tipLine, tipKey, tableView } from "./shared.js";

// Sign follows the rounded value, so a -0.04 difference reads "0,0 p.p." and not "−0,0 p.p.".
const pp = (x) => {
  const r = Math.round(x * 10) / 10;
  return (r > 0 ? "+" : r < 0 ? "−" : "") + Math.abs(r).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " p.p.";
};

function render(root, data) {
  const [a, b] = topCandidates(data);
  const rows = Object.entries(data.states).map(([uf, s]) => {
    const pa = a.byUf[uf].pct, pb = b.byUf[uf].pct;
    return { uf, pa, pb, other: Math.max(0, 100 - pa - pb), diff: pa - pb, valid: s.validVotes, va: a.byUf[uf].votes, vb: b.byUf[uf].votes };
  }).sort((x, y) => y.diff - x.diff);

  const lead = rows.filter((r) => r.diff > 0).length;
  root.append(el("p", "chart-lead",
    `${a.short} lidera em ${lead} das ${rows.length} unidades e ${b.short} em ${rows.length - lead} (contando o exterior). ` +
    `Cada barra soma 100% dos votos válidos do estado. O número à direita é a diferença ${a.short} − ${b.short} em pontos percentuais. ` +
    `Estados ordenados da maior vantagem de ${a.short} à maior vantagem de ${b.short}.`));
  root.append(legend([
    { color: a.color, label: a.name }, { color: b.color, label: b.name }, { color: "var(--other)", label: "Outros" },
  ]));

  const card = el("div", "card");
  rows.forEach((r) => {
    const row = el("div", "vrow");
    row.setAttribute("aria-label", `${ufName(r.uf)}: ${a.name} ${fmtPct(r.pa)}, ${b.name} ${fmtPct(r.pb)}, diferença ${pp(r.diff)}`);
    row.append(el("div", "name", ufName(r.uf)));
    const stack = el("div", "stack");
    [[r.pa, a.color], [r.pb, b.color], [r.other, "var(--other)"]].forEach(([w, color]) => {
      const seg = el("i", "seg");
      seg.style.setProperty("--c", color);
      seg.style.width = `${w}%`;
      stack.append(seg);
    });
    row.append(stack, el("span", "diff", pp(r.diff)));
    attachTip(row, (tip) => {
      tip.append(el("div", "tip-title", ufName(r.uf)));
      [[a, r.pa, r.va], [b, r.pb, r.vb]].forEach(([c, p, v]) => {
        const val = el("span");
        val.append(el("b", null, fmtPct(p)), document.createTextNode(` · ${fmtInt.format(v)} votos`));
        tip.append(tipLine(tipKey(c.color, c.name), val));
      });
      tip.append(tipLine(tipKey("var(--other)", "Outros"), el("b", null, fmtPct(r.other))));
      tip.append(el("div", "tip-sep"));
      tip.append(tipLine(el("span", null, `Diferença ${a.short} − ${b.short}`), el("b", null, pp(r.diff))));
      tip.append(tipLine(el("span", null, "Votos válidos"), el("span", null, fmtInt.format(r.valid))));
    });
    card.append(row);
  });
  root.append(card);

  root.append(tableView("Ver tabela com todas as UFs",
    ["UF", `${a.short} %`, `${b.short} %`, "Outros %", "Diferença (p.p.)", "Votos válidos"],
    rows.map((r) => [ufName(r.uf), fmtPct(r.pa), fmtPct(r.pb), fmtPct(r.other), pp(r.diff), fmtInt.format(r.valid)])));
}

export default {
  id: "votacao-por-estado",
  title: "Votação por estado",
  description: "Presidente, 1º turno: percentual dos votos válidos dos dois candidatos mais votados em cada estado.",
  render,
};
