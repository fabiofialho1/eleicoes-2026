import { el, ufName, fmtInt, fmtPct, topCandidates, tableView } from "./shared.js";
import { MAP } from "./brazil-map.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const svgEl = (tag, attrs = {}) => {
  const e = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
};

// Classes of contribution (% of ALL valid votes in Brazil that a candidate gets from one state), with the
// share of the candidate's color each class uses. Classes read more easily than a continuous scale.
const CLASSES = [
  { min: 0, label: "menos de 1%", tint: 14 },
  { min: 1, label: "1% a 2%", tint: 32 },
  { min: 2, label: "2% a 4%", tint: 52 },
  { min: 4, label: "4% a 8%", tint: 76 },
  { min: 8, label: "8% ou mais", tint: 100 },
];
const classOf = (share) => [...CLASSES].reverse().find((c) => share >= c.min);
const fillFor = (cand, share) => `color-mix(in oklab, ${cand.color} ${classOf(share).tint}%, var(--surface-1))`;

function render(root, data) {
  const cands = topCandidates(data);
  const ufs = Object.keys(MAP.states);
  const abroad = cands.map((c) => c.byUf.ZZ);

  root.append(el("p", "chart-lead",
    "Cada estado é pintado pelo quanto soma ao percentual nacional de cada candidato (votos do candidato no estado ÷ todos os votos válidos do Brasil). " +
    "Quanto mais intensa a cor, maior a contribuição. A cor mostra o tamanho da contribuição, não quem ganhou no estado. Toque ou passe o mouse sobre um estado para ver os números."));

  // Legend shared by both maps: the five classes.
  const legend = el("div", "legend map-legend");
  CLASSES.forEach((c, i) => {
    const sp = el("span");
    const sw = el("i", "swatch");
    sw.style.background = `color-mix(in oklab, var(--text-secondary) ${c.tint}%, var(--surface-1))`;
    sp.append(sw, document.createTextNode(c.label));
    legend.append(sp);
  });
  root.append(legend);

  const maps = el("div", "maps");
  const paths = []; // one record per drawn state path, to highlight the same state in both maps
  cands.forEach((cand) => {
    const card = el("div", "card map-card");
    const head = el("div", "panel-head");
    const sw = el("i", "swatch");
    sw.style.setProperty("--c", cand.color);
    head.append(sw, el("h3", null, `${cand.name} (${cand.party})`));
    card.append(head, el("p", "panel-meta", `${fmtPct(cand.natPct, 2)} dos votos válidos do Brasil`));

    const svg = svgEl("svg", { viewBox: `0 0 ${MAP.width} ${MAP.height}`, class: "map-svg", role: "group", "aria-label": `Mapa da contribuição de cada estado para ${cand.name}` });
    const shapes = svgEl("g");
    const labels = svgEl("g", { "pointer-events": "none" });
    ufs.forEach((uf) => {
      const st = MAP.states[uf];
      const share = cand.byUf[uf].natPct;
      const path = svgEl("path", { d: st.d, class: "map-state", tabindex: "0", role: "img", "aria-label": `${ufName(uf)}: ${fmtPct(share, 2)} dos votos válidos do Brasil, ${fmtInt.format(cand.byUf[uf].votes)} votos de ${cand.name}` });
      path.style.fill = fillFor(cand, share);
      path.addEventListener("pointerenter", () => select(uf));
      path.addEventListener("click", () => select(uf));
      path.addEventListener("focus", () => select(uf));
      shapes.append(path);
      paths.push({ uf, path });
      // Label the states big enough to hold their code.
      const t = svgEl("text", { x: st.cx, y: st.cy, class: "map-label" });
      t.textContent = uf;
      labels.append(t);
    });
    svg.append(shapes, labels);
    card.append(svg);
    maps.append(card);
  });
  root.append(maps);

  // Readout for the selected state: both candidates' numbers, so touch screens get the values too.
  const readout = el("div", "card map-readout");
  readout.setAttribute("aria-live", "polite");
  root.append(readout);

  function select(uf) {
    readout.replaceChildren();
    const valid = data.states[uf].validVotes;
    readout.append(el("h3", null, ufName(uf)));
    cands.forEach((c) => {
      const row = el("div", "readout-row");
      const sw = el("i", "swatch");
      sw.style.setProperty("--c", c.color);
      row.append(sw, el("span", "readout-name", c.name));
      const v = c.byUf[uf];
      const val = el("span", "readout-val");
      val.append(el("b", null, fmtPct(v.natPct, 2)), document.createTextNode(` dos votos válidos do Brasil · ${fmtInt.format(v.votes)} votos`));
      row.append(val);
      readout.append(row);
    });
    readout.append(el("p", "readout-note", `${fmtInt.format(valid)} votos válidos no estado`));
    paths.forEach((p) => {
      const on = p.uf === uf;
      p.path.classList.toggle("selected", on);
      if (on) p.path.parentNode.append(p.path); // draw the selected outline on top of its neighbours
    });
  }
  // Start on the state that adds the most to the first candidate, so the numbers are visible right away.
  select([...ufs].sort((a, b) => cands[0].byUf[b].votes - cands[0].byUf[a].votes)[0]);

  root.append(el("p", "chart-lead",
    `O exterior não aparece no mapa. Ele soma ${fmtPct(abroad[0].natPct, 2)} para ${cands[0].short} e ${fmtPct(abroad[1].natPct, 2)} para ${cands[1].short}.`));

  const all = [...ufs, "ZZ"].sort((a, b) => ufName(a).localeCompare(ufName(b), "pt-BR"));
  root.append(tableView("Ver tabela com todas as UFs",
    ["UF", ...cands.flatMap((c) => [`${c.name} (votos)`, "% dos votos válidos do Brasil"])],
    all.map((uf) => [ufName(uf), ...cands.flatMap((c) => [fmtInt.format(c.byUf[uf].votes), fmtPct(c.byUf[uf].natPct, 2)])])));
}

export default {
  id: "mapa",
  title: "Mapa: quanto cada estado soma ao resultado",
  description: "Os estados pintados pela contribuição de cada um ao percentual nacional dos dois mais votados.",
  render,
};
