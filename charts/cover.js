// The site cover, laid out as the 4:5 Instagram post (1080 x 1350). Every size is in "u" units (1u = width / 1080),
// set from the cover's real width, so the cover scales as one piece; at #capa it is exactly 1080 x 1350 for the image.
// It keeps its own light palette on purpose: the picture must look the same whatever the page theme is.
import { el, fmtPct, topCandidates, REGIONS } from "./shared.js";
import { MAP } from "./brazil-map.js";
import { splitCut } from "./geometry.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const svgEl = (tag, attrs = {}) => {
  const e = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
};
const BG = [246, 247, 250];
const CAND_RGB = [[42, 120, 214], [235, 104, 52]];
const REGION_HEX = { southeast: "#4a3aa7", northeast: "#1baf7a", south: "#eda100", north: "#e87ba4", "central-west": "#008300" };
const NE_IDS = ["northeast"];
const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const BASE_AT = 0.6;
function ramp(rgb, pos) { // light -> candidate color -> deeper shade, same ramp as the maps
  const deep = lerp(rgb, [0, 0, 0], 0.5);
  const c = pos <= BASE_AT ? lerp(BG, rgb, 0.05 + 0.95 * (pos / BASE_AT)) : lerp(rgb, deep, (pos - BASE_AT) / (1 - BASE_AT));
  return `rgb(${c.map(Math.round).join(",")})`;
}

const CX = 150, CY = 150, RO = 140, RI = 84;
const pt = (r, a) => [CX + r * Math.sin(a), CY - r * Math.cos(a)];

export function renderCover(root, data) {
  const cands = topCandidates(data);
  const [F, L] = cands;
  const ufs = Object.keys(MAP.states);
  const max = Math.max(...cands.flatMap((c) => ufs.map((u) => c.byUf[u].natPct)));
  const pos = (s) => Math.sqrt(Math.max(0, s) / max);

  const cover = el("div", "cover");
  const cv = el("div", "cv");
  cover.append(cv);
  cv.append(el("div", "cv-kicker", "Eleições 2026 · Presidente, 1º turno"));
  cv.append(el("h2", "cv-h1", "Chega a divisão."));
  const sub = el("div", "cv-sub");
  sub.append(el("b", null, "O país está dividido"), document.createTextNode(", e precisamos saber interpretar os dados."));
  cv.append(sub);

  // ---- map: each state split by AREA in proportion to the two candidates' votes
  const wrap = el("div", "cv-mapwrap");
  const svg = svgEl("svg", { viewBox: `0 0 ${MAP.width} ${MAP.height}`, class: "cv-map", role: "img", "aria-label": "Mapa do Brasil com cada estado dividido entre Flávio Bolsonaro e Lula em proporção aos votos" });
  const defs = svgEl("defs"), fills = svgEl("g"), outline = svgEl("g");
  const ne = REGIONS.find((r) => r.id === "northeast").ufs;
  ufs.forEach((uf) => {
    const st = MAP.states[uf];
    const va = F.byUf[uf].votes, vb = L.byUf[uf].votes;
    const { cut, minX, maxX } = splitCut(st.d, va / (va + vb || 1));
    const clip = (id, x, w) => { const cp = svgEl("clipPath", { id }); cp.append(svgEl("rect", { x, y: 0, width: w, height: MAP.height })); defs.append(cp); };
    clip(`cvl-${uf}`, minX - 2, cut - minX + 2);
    clip(`cvr-${uf}`, cut, maxX - cut + 2);
    fills.append(
      svgEl("path", { d: st.d, "clip-path": `url(#cvl-${uf})`, fill: ramp(CAND_RGB[0], pos(F.byUf[uf].natPct)) }),
      svgEl("path", { d: st.d, "clip-path": `url(#cvr-${uf})`, fill: ramp(CAND_RGB[1], pos(L.byUf[uf].natPct)) }),
      svgEl("path", { d: st.d, fill: "none", stroke: "#f6f7f9", "stroke-width": 1.6, "stroke-linejoin": "round" }));
    if (ne.includes(uf)) outline.append(svgEl("path", { d: st.d, fill: "none", stroke: "#0b0b0b", "stroke-width": 3.2, "stroke-linejoin": "round" }));
  });
  svg.append(defs, fills, outline);
  wrap.append(svg);

  const key = el("div", "cv-key");
  key.append(el("h3", null, "Como ler o mapa"));
  key.append(el("div", "cv-keytext", "Cada estado é dividido entre os dois candidatos, em proporção aos votos de cada um nele. Quanto mais forte a cor, mais o estado soma ao total nacional do candidato."));
  cands.forEach((c, i) => {
    const topPct = Math.max(...ufs.map((u) => c.byUf[u].natPct)), end = pos(topPct);
    const row = el("div", "cv-legend");
    const who = el("div", "cv-who");
    const dot = el("i", "cv-dot"); dot.style.background = `rgb(${CAND_RGB[i].join(",")})`;
    who.append(dot, document.createTextNode(c.name));
    const bar = el("div", "cv-bar");
    bar.style.background = `linear-gradient(to right, ${Array.from({ length: 21 }, (_, k) => `${ramp(CAND_RGB[i], (end * k) / 20)} ${k * 5}%`).join(", ")})`;
    const ticks = el("div", "cv-ticks");
    const marks = [0, 1, 2, 4].filter((t) => pos(t) / end <= 0.8).concat(topPct);
    marks.forEach((v, k) => {
      const t = el("span", null, fmtPct(v, k === marks.length - 1 ? 1 : 0));
      t.style.left = `${(pos(v) / end) * 100}%`;
      if (k === marks.length - 1) t.style.transform = "translateX(-100%)"; else if (k) t.style.transform = "translateX(-50%)";
      ticks.append(t);
    });
    row.append(who, bar, ticks);
    key.append(row);
  });
  const neKey = el("div", "cv-ne");
  neKey.append(el("i"), document.createTextNode("Nordeste (9 estados)"));
  key.append(neKey);
  wrap.append(key);
  cv.append(wrap);

  const st = el("div", "cv-statement");
  st.append(document.createTextNode("Eleição no Brasil é pelo "), el("em", null, "total de votos"), document.createTextNode("."), document.createElement("br"), document.createTextNode("Não é um voto por estado."));
  cv.append(st);

  // ---- regions: two small donuts around a shared legend
  cv.append(el("div", "cv-rgtitle", "De onde vem o total de cada candidato, por região"));
  const regs = REGIONS.map((r) => ({ ...r, valid: r.ufs.reduce((a, u) => a + data.states[u].validVotes, 0) })).sort((a, b) => b.valid - a.valid);
  const share = (c, r) => (r.ufs.reduce((a, u) => a + c.byUf[u].votes, 0) / c.total) * 100;
  const donut = (c) => {
    const s = svgEl("svg", { viewBox: "0 0 300 300", role: "img", "aria-label": `Parte do total de ${c.name} vinda de cada região` });
    let ang = 0;
    regs.forEach((r) => {
      const a0 = ang, a1 = ang + (share(c, r) / 100) * 2 * Math.PI; ang = a1;
      const [x0, y0] = pt(RO, a0), [x1, y1] = pt(RO, a1), [x2, y2] = pt(RI, a1), [x3, y3] = pt(RI, a0);
      const big = a1 - a0 > Math.PI ? 1 : 0;
      const isNe = NE_IDS.includes(r.id);
      s.append(svgEl("path", { d: `M${x0} ${y0}A${RO} ${RO} 0 ${big} 1 ${x1} ${y1}L${x2} ${y2}A${RI} ${RI} 0 ${big} 0 ${x3} ${y3}Z`, fill: REGION_HEX[r.id], stroke: isNe ? "#0b0b0b" : "#f6f7f9", "stroke-width": isNe ? 4 : 3, "stroke-linejoin": "round" }));
    });
    const t1 = svgEl("text", { x: CX, y: CY + 4, "text-anchor": "middle", "font-size": 40, "font-weight": 700, fill: "#0b0b0b" }); t1.textContent = fmtPct(c.natPct, 2);
    const t2 = svgEl("text", { x: CX, y: CY + 30, "text-anchor": "middle", "font-size": 19, fill: "#4a4a47" }); t2.textContent = "dos votos válidos";
    s.append(t1, t2);
    return s;
  };
  const table = el("div", "cv-table");
  const head = el("div", "cv-row cv-head");
  const hf = el("span", "f"), hl = el("span", "l");
  const chip = (rgb) => { const i = el("i", "cv-hd"); i.style.background = `rgb(${rgb.join(",")})`; return i; };
  hf.append(chip(CAND_RGB[0]), document.createTextNode(F.short));
  hl.append(document.createTextNode(L.short), chip(CAND_RGB[1]));
  head.append(hf, el("span"), hl);
  table.append(head);
  regs.forEach((r) => {
    const row = el("div", r.id === "northeast" ? "cv-row cv-ne-row" : "cv-row");
    const name = el("span", "cv-name");
    const sw = el("i"); sw.style.background = REGION_HEX[r.id];
    name.append(sw, document.createTextNode(r.label));
    row.append(el("span", "f", fmtPct(share(F, r))), name, el("span", "l", fmtPct(share(L, r))));
    table.append(row);
  });
  const regions = el("div", "cv-regions");
  regions.append(donut(F), table, donut(L));
  cv.append(regions);

  const close = el("div", "cv-close");
  close.append(el("p", null, "Antes de destilar preconceito com o Nordeste, vamos interpretar os dados direto."));
  close.append(el("small", null, `Fonte: TSE (resultados.tse.jus.br), apuração de ${data.brazil.updatedAt.slice(0, 10)}, ${fmtPct(data.brazil.countedPct, 2)} das seções. Votos válidos. Nordeste: AL, BA, CE, MA, PB, PE, PI, RN e SE.`));
  cv.append(close);

  // Scale: 1u = width / 1080, and the height keeps the 4:5 ratio.
  const fit = () => {
    const w = cover.clientWidth;
    if (!w) return;
    cover.style.setProperty("--u", `${w / 1080}px`);
    cover.style.height = `${(w * 1350) / 1080}px`;
  };
  root.replaceChildren(cover);
  fit();
  if (window.ResizeObserver) new ResizeObserver(fit).observe(cover);
  else addEventListener("resize", fit);
}
