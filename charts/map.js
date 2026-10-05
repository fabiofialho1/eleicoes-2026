import { el, ufName, fmtInt, fmtPct, topCandidates, tableView, rampColor, watchTheme } from "./shared.js";
import { MAP } from "./brazil-map.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const svgEl = (tag, attrs = {}) => {
  const e = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
};

// Contribution = % of ALL valid votes in Brazil that a candidate gets from one state. Each state is colored with a
// continuous gradient of the candidate's own hue (light = small contribution, intense = large), on one scale shared
// by every map. The scale follows the square root of the share, so small states stay distinguishable next to São Paulo.
const position = (share, max) => Math.sqrt(Math.max(0, share) / max); // 0..1 along the gradient
const mixColor = rampColor;

// ---- Geometry helpers: split a state into two parts whose AREAS match given proportions.
const ringsOf = (d) => d.split("M").filter(Boolean).map((seg) => seg.replace("Z", "").split("L").map((p) => p.split(" ").map(Number)));
const ringArea = (r) => Math.abs(r.reduce((s, [x, y], i) => { const [x2, y2] = r[(i + 1) % r.length]; return s + (x * y2 - x2 * y); }, 0)) / 2;
function clipLeft(ring, cut) { // Sutherland-Hodgman against the half-plane x <= cut
  const out = [];
  ring.forEach((a, i) => {
    const b = ring[(i + 1) % ring.length];
    const ain = a[0] <= cut, bin = b[0] <= cut;
    if (ain) out.push(a);
    if (ain !== bin) { const t = (cut - a[0]) / (b[0] - a[0]); out.push([cut, a[1] + t * (b[1] - a[1])]); }
  });
  return out;
}
function centroidSide(d, cut, side) { // area-weighted centroid of the part left (side -1) or right (side 1) of x = cut
  let A = 0, X = 0, Y = 0;
  ringsOf(d).forEach((ring) => {
    const part = side < 0 ? clipLeft(ring, cut) : clipLeft(ring.map(([x, y]) => [-x, y]), -cut).map(([x, y]) => [-x, y]);
    if (part.length < 3) return;
    let a2 = 0, cx = 0, cy = 0;
    part.forEach(([x, y], i) => { const [x2, y2] = part[(i + 1) % part.length]; const c = x * y2 - x2 * y; a2 += c; cx += (x + x2) * c; cy += (y + y2) * c; });
    if (!a2) return;
    A += Math.abs(a2); X += (cx / (3 * a2)) * Math.abs(a2); Y += (cy / (3 * a2)) * Math.abs(a2);
  });
  return A ? { x: X / A, y: Y / A } : null;
}
function splitCut(d, frac) { // x position where the area to the left is `frac` of the state's area
  const rings = ringsOf(d);
  const total = rings.reduce((s, r) => s + ringArea(r), 0);
  const xs = rings.flat().map((p) => p[0]);
  let lo = Math.min(...xs), hi = Math.max(...xs);
  for (let i = 0; i < 28; i++) {
    const mid = (lo + hi) / 2;
    const left = rings.reduce((s, r) => { const c = clipLeft(r, mid); return s + (c.length > 2 ? ringArea(c) : 0); }, 0);
    if (left < frac * total) lo = mid; else hi = mid;
  }
  return { cut: (lo + hi) / 2, minX: Math.min(...xs), maxX: Math.max(...xs) };
}

const TICKS = [0, 1, 2, 4]; // plus the maximum, drawn at the right end

function render(root, data) {
  const cands = topCandidates(data);
  const ufs = Object.keys(MAP.states);
  const abroad = cands.map((c) => c.byUf.ZZ);
  const max = Math.max(...cands.flatMap((c) => ufs.map((uf) => c.byUf[uf].natPct))); // one scale for every map
  const recolor = []; // callbacks that repaint with the current theme's colors

  root.append(el("p", "chart-lead",
    "Cada estado é pintado pelo quanto soma ao percentual nacional de cada candidato (votos do candidato no estado ÷ todos os votos válidos do Brasil). " +
    "Quanto mais intensa a cor, maior a contribuição, e a mesma cor vale o mesmo percentual em todos os mapas. Toque ou passe o mouse sobre um estado para ver os números."));

  const maps = el("div", "maps");
  const paths = []; // hit/outline path of every state in every map, to highlight the same state everywhere

  function gradientLegend(cand) {
    // The bar covers the part of the shared scale this candidate actually reaches, ending at their maximum.
    const topUf = ufs.reduce((x, y) => (cand.byUf[y].natPct > cand.byUf[x].natPct ? y : x));
    const top = cand.byUf[topUf].natPct, endPos = position(top, max);
    const box = el("div", "gradient-legend");
    const bar = el("div", "gradient-bar");
    const ticks = el("div", "gradient-ticks");
    const marks = [...TICKS.filter((t) => position(t, max) / endPos <= 0.8), top];
    marks.forEach((v, i) => {
      const t = el("span", null, fmtPct(v, v === top ? 1 : 0));
      t.style.left = `${(position(v, max) / endPos) * 100}%`;
      if (i === marks.length - 1) t.style.transform = "translateX(-100%)";
      else if (i > 0) t.style.transform = "translateX(-50%)";
      ticks.append(t);
    });
    recolor.push(() => {
      const stops = Array.from({ length: 21 }, (_, i) => `${mixColor(cand, (endPos * i) / 20)} ${i * 5}%`).join(", ");
      bar.style.background = `linear-gradient(to right, ${stops})`;
    });
    box.append(bar, ticks, el("div", "gradient-note", `Maior contribuição: ${ufName(topUf)}, ${fmtPct(top, 2)}`));
    return box;
  }

  function mapCard({ title, meta, wide }) {
    const card = el("div", wide ? "card map-card map-wide" : "card map-card");
    const head = el("div", "panel-head");
    head.append(...title);
    card.append(head, el("p", "panel-meta", meta));
    const svg = svgEl("svg", { viewBox: `0 0 ${MAP.width} ${MAP.height}`, class: "map-svg", role: "group" });
    card.append(svg);
    maps.append(card);
    return { card, svg };
  }
  const swatch = (cand) => { const s = el("i", "swatch"); s.style.setProperty("--c", cand.color); return s; };

  function addHit(group, uf, label) {
    const hit = svgEl("path", { d: MAP.states[uf].d, class: "map-state", tabindex: "0", role: "img", "aria-label": label });
    hit.addEventListener("pointerenter", () => select(uf));
    hit.addEventListener("click", () => select(uf));
    hit.addEventListener("focus", () => select(uf));
    group.append(hit);
    paths.push({ uf, path: hit });
  }
  const bbox = {};
  function box(uf) {
    if (!bbox[uf]) {
      const pts = ringsOf(MAP.states[uf].d).flat();
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
      bbox[uf] = { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
    }
    return bbox[uf];
  }
  // With `cand`, states that add 2% or more and are big enough also show their percentage; smaller ones rely on tap and the table.
  // With `halves` (the combined map), wide states show each candidate's percentage inside that candidate's half.
  function addLabels(svg, cand, halves) {
    const labels = svgEl("g", { "pointer-events": "none" });
    const put = (x, y, text, extra) => {
      const t = svgEl("text", { x, y, class: extra ? `map-label ${extra}` : "map-label" });
      t.textContent = text;
      labels.append(t);
    };
    ufs.forEach((uf) => {
      const { cx, cy } = MAP.states[uf];
      const h = halves && halves[uf];
      if (halves && halves.GO && uf === "DF") return; // DF is a dot inside GO: its code would sit on top of GO's number
      const showValue = !halves && cand && cand.byUf[uf].natPct >= 2 && box(uf).w >= 95 && box(uf).h >= 65;
      if (h) {
        // State code above both numbers, on the dividing line; each number inside its candidate's half.
        put(h.cut, Math.min(...h.parts.map((p) => p.y)) - 14, uf);
        h.parts.forEach((p) => put(p.x, p.y + 12, p.text, "map-value"));
        return;
      }
      put(cx, showValue ? cy - 13 : cy, uf);
      if (showValue) put(cx, cy + 12, fmtPct(cand.byUf[uf].natPct, 1), "map-value");
    });
    svg.append(labels);
  }
  const ariaFor = (uf) => `${ufName(uf)}: ` + cands.map((c) => `${c.name} ${fmtPct(c.byUf[uf].natPct, 2)} dos votos válidos do Brasil`).join("; ");

  // ---- Map 1: both candidates. Each state is split in proportion to the two candidates' votes in it (by area).
  {
    const a = cands[0], b = cands[1];
    const { card, svg } = mapCard({
      title: [el("h3", null, "Os dois candidatos")],
      meta: `Cada estado é dividido entre ${a.short} (esquerda) e ${b.short} (direita) em proporção aos votos de cada um nele. A intensidade de cada parte segue a contribuição do candidato ao total nacional, e os números mostram essa contribuição nos estados maiores.`,
      wide: true,
    });
    svg.setAttribute("aria-label", "Mapa dos dois candidatos, cada estado dividido em proporção aos votos");
    const defs = svgEl("defs");
    const fills = svgEl("g"), hits = svgEl("g");
    const halves = {};
    ufs.forEach((uf) => {
      const st = MAP.states[uf];
      const va = a.byUf[uf].votes, vb = b.byUf[uf].votes;
      const { cut, minX, maxX } = splitCut(st.d, va / (va + vb || 1));
      const mk = (id, x, w) => { const cp = svgEl("clipPath", { id }); cp.append(svgEl("rect", { x, y: 0, width: w, height: MAP.height })); defs.append(cp); };
      mk(`cl-${uf}`, minX - 2, cut - minX + 2);
      mk(`cr-${uf}`, cut, maxX - cut + 2);
      if (box(uf).w >= 140 && box(uf).h >= 65) {
        const l = centroidSide(st.d, cut, -1), r = centroidSide(st.d, cut, 1);
        if (l && r && cut - minX >= 62 && maxX - cut >= 62) halves[uf] = { cut, parts: [{ ...l, text: fmtPct(a.byUf[uf].natPct, 1) }, { ...r, text: fmtPct(b.byUf[uf].natPct, 1) }] };
      }
      const left = svgEl("path", { d: st.d, "clip-path": `url(#cl-${uf})` });
      const right = svgEl("path", { d: st.d, "clip-path": `url(#cr-${uf})` });
      fills.append(left, right);
      recolor.push(() => {
        left.style.fill = mixColor(a, position(a.byUf[uf].natPct, max));
        right.style.fill = mixColor(b, position(b.byUf[uf].natPct, max));
      });
      addHit(hits, uf, ariaFor(uf));
    });
    svg.append(defs, fills, hits);
    addLabels(svg, null, halves);
    const legends = el("div", "legend-pair");
    cands.forEach((c) => {
      const item = el("div", "legend-item");
      const lab = el("div", "legend-name");
      lab.append(swatch(c), document.createTextNode(`${c.name}`));
      item.append(lab, gradientLegend(c));
      legends.append(item);
    });
    card.append(legends);
  }

  // ---- Maps 2 and 3: one per candidate.
  cands.forEach((cand) => {
    const { card, svg } = mapCard({
      title: [swatch(cand), el("h3", null, `${cand.name} (${cand.party})`)],
      meta: `${fmtPct(cand.natPct, 2)} dos votos válidos do Brasil`,
    });
    svg.setAttribute("aria-label", `Mapa da contribuição de cada estado para ${cand.name}`);
    const shapes = svgEl("g");
    ufs.forEach((uf) => {
      const fill = svgEl("path", { d: MAP.states[uf].d, class: "map-fill" });
      shapes.append(fill);
      recolor.push(() => { fill.style.fill = mixColor(cand, position(cand.byUf[uf].natPct, max)); });
    });
    const hits = svgEl("g");
    ufs.forEach((uf) => addHit(hits, uf, ariaFor(uf)));
    svg.append(shapes, hits);
    addLabels(svg, cand);
    card.append(gradientLegend(cand));
  });
  root.append(maps);

  // Readout for the selected state: both candidates' numbers, so touch screens get the values too.
  const readout = el("div", "card map-readout");
  readout.setAttribute("aria-live", "polite");
  root.append(readout);

  function select(uf) {
    readout.replaceChildren();
    readout.append(el("h3", null, ufName(uf)));
    cands.forEach((c) => {
      const row = el("div", "readout-row");
      row.append(swatch(c), el("span", "readout-name", c.name));
      const v = c.byUf[uf];
      const val = el("span", "readout-val");
      val.append(el("b", null, fmtPct(v.natPct, 2)), document.createTextNode(` dos votos válidos do Brasil · ${fmtInt.format(v.votes)} votos`));
      row.append(val);
      readout.append(row);
    });
    readout.append(el("p", "readout-note", `${fmtInt.format(data.states[uf].validVotes)} votos válidos no estado`));
    paths.forEach((p) => {
      const on = p.uf === uf;
      p.path.classList.toggle("selected", on);
      if (on) p.path.parentNode.append(p.path); // draw the selected outline on top of its neighbours
    });
  }
  // Start on the state that adds the most to the first candidate, so the numbers are visible right away.
  select([...ufs].sort((x, y) => cands[0].byUf[y].votes - cands[0].byUf[x].votes)[0]);

  // Paint now, and again whenever the theme changes.
  watchTheme(() => recolor.forEach((fn) => fn()));

  root.append(el("p", "chart-lead",
    `O exterior não aparece nos mapas. Ele soma ${fmtPct(abroad[0].natPct, 2)} para ${cands[0].short} e ${fmtPct(abroad[1].natPct, 2)} para ${cands[1].short}.`));

  const all = [...ufs, "ZZ"].sort((x, y) => ufName(x).localeCompare(ufName(y), "pt-BR"));
  root.append(tableView("Ver tabela com todas as UFs",
    ["UF", ...cands.flatMap((c) => [`${c.name} (votos)`, "% dos votos válidos do Brasil"])],
    all.map((uf) => [ufName(uf), ...cands.flatMap((c) => [fmtInt.format(c.byUf[uf].votes), fmtPct(c.byUf[uf].natPct, 2)])])));
}

export default {
  id: "mapa",
  title: "Mapas: quanto cada estado soma ao resultado",
  description: "Os estados pintados pela contribuição de cada um ao percentual nacional dos dois mais votados.",
  render,
};
