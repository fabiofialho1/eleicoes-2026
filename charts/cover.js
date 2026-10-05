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
const REGION_DARK_TEXT = ["south", "north", "northeast"]; // light segments get dark numbers
const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const BASE_AT = 0.6;
function ramp(rgb, pos) { // light -> candidate color -> deeper shade, same ramp as the maps
  const deep = lerp(rgb, [0, 0, 0], 0.5);
  const c = pos <= BASE_AT ? lerp(BG, rgb, 0.05 + 0.95 * (pos / BASE_AT)) : lerp(rgb, deep, (pos - BASE_AT) / (1 - BASE_AT));
  return `rgb(${c.map(Math.round).join(",")})`;
}

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
    const txt = el("div", "cv-whotxt");
    txt.append(el("b", null, c.name), el("span", "cv-pts", `${fmtPct(c.natPct, 2)} dos votos válidos do Brasil`));
    who.append(dot, txt);
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

  // ---- regions: one stacked bar per candidate. Bar length = the candidate's result in Brazil; each segment = percentage
  // points that one region adds to it (same axis for both bars, same color per region).
  cv.append(el("div", "cv-rgtitle", "De onde vem o resultado de cada candidato, por região"));
  const validTotal = F.validTotal;
  const regs = REGIONS.map((r) => ({ ...r, valid: r.ufs.reduce((a, u) => a + data.states[u].validVotes, 0) })).sort((a, b) => b.valid - a.valid);
  const axisMax = Math.max(F.natPct, L.natPct) / 0.84; // room for the total at the end of the bar
  const rbars = el("div", "cv-rbars");
  cands.forEach((c, i) => {
    const row = el("div", "cv-rrow");
    const nm = el("div", "cv-rname");
    const dot = el("i", "cv-dot"); dot.style.background = `rgb(${CAND_RGB[i].join(",")})`;
    nm.append(dot, document.createTextNode(c.short));
    const track = el("div", "cv-rtrack");
    const bar = el("div", "cv-rbar");
    const pps = regs.map((r) => r.ufs.reduce((a, u) => a + c.byUf[u].natPct, 0));
    bar.style.width = `${(pps.reduce((a, b) => a + b, 0) / axisMax) * 100}%`;
    regs.forEach((r, k) => {
      const seg = el("div", r.id === "northeast" ? "cv-rseg cv-ne-seg" : "cv-rseg");
      seg.style.flexGrow = pps[k]; seg.style.background = REGION_HEX[r.id];
      if ((pps[k] / axisMax) * 800 >= 36) { // 800u = track width; the number must fit inside the segment
        const t = el("span", null, pps[k].toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
        t.style.color = REGION_DARK_TEXT.includes(r.id) ? "#0b0b0b" : "#ffffff";
        seg.append(t);
      }
      bar.append(seg);
    });
    track.append(bar, el("span", "cv-rtotal", fmtPct(c.natPct, 2)));
    row.append(nm, track);
    rbars.append(row);
  });
  cv.append(rbars);
  const rlegend = el("div", "cv-rlegend");
  regs.forEach((r) => {
    const item = el("span", r.id === "northeast" ? "cv-ne-item" : "");
    const sw = el("i"); sw.style.background = REGION_HEX[r.id];
    item.append(sw, document.createTextNode(r.label));
    rlegend.append(item);
  });
  cv.append(rlegend);
  cv.append(el("div", "cv-rnote", "Pontos percentuais dos votos válidos do Brasil. Cada barra soma o resultado do candidato."));

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
