// Helpers shared by every chart. UI labels live here; stored data only carries ids.
export const UF_NAMES = {
  AC: "Acre", AL: "Alagoas", AM: "Amazonas", AP: "Amapá", BA: "Bahia", CE: "Ceará", DF: "Distrito Federal",
  ES: "Espírito Santo", GO: "Goiás", MA: "Maranhão", MG: "Minas Gerais", MS: "Mato Grosso do Sul",
  MT: "Mato Grosso", PA: "Pará", PB: "Paraíba", PE: "Pernambuco", PI: "Piauí", PR: "Paraná",
  RJ: "Rio de Janeiro", RN: "Rio Grande do Norte", RO: "Rondônia", RR: "Roraima", RS: "Rio Grande do Sul",
  SC: "Santa Catarina", SE: "Sergipe", SP: "São Paulo", TO: "Tocantins", ZZ: "Exterior",
};
export const ufName = (uf) => UF_NAMES[uf] ?? uf;

const DISPLAY_NAMES = { "22": "Flávio Bolsonaro", "13": "Lula" };

export const fmtInt = new Intl.NumberFormat("pt-BR");
export const fmtPct = (x, digits = 1) =>
  x.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits }) + "%";

export function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

const titleCase = (s) => s.toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase());

// The two most voted candidates nationally, in order, each with a fixed color slot
// (color follows the candidate, never the rank within a filtered view).
// natPct = votes as a percent of ALL valid votes in Brazil; summed over the states it equals
// the candidate's official national percentage.
export function topCandidates(data, n = 2) {
  const validTotal = Object.values(data.states).reduce((a, s) => a + s.validVotes, 0);
  return data.brazil.candidates.slice(0, n).map((c, i) => {
    const name = DISPLAY_NAMES[c.number] ?? titleCase(c.name);
    const byUf = Object.fromEntries(Object.entries(data.states).map(([uf, s]) => {
      const m = s.candidates.find((x) => x.number === c.number);
      const votes = m ? m.votes : 0;
      return [uf, { votes, pct: m ? m.pct : 0, natPct: (votes / validTotal) * 100 }];
    }));
    const total = Object.values(byUf).reduce((a, v) => a + v.votes, 0);
    return {
      number: c.number, name, short: name.split(" ")[0], party: c.party, color: `var(--series-${i + 1})`, token: `--series-${i + 1}`,
      byUf, total, natPct: (total / validTotal) * 100, validTotal,
    };
  });
}

export function legend(items) {
  const box = el("div", "legend");
  for (const it of items) {
    const sp = el("span");
    const sw = el("i", "swatch");
    sw.style.setProperty("--c", it.color);
    sp.append(sw, document.createTextNode(it.label));
    box.append(sp);
  }
  return box;
}

// One shared tooltip. `build(tipElement)` fills it with text nodes (labels are data: never innerHTML).
let tipEl;
export function showTip(ev, build) {
  if (!tipEl) { tipEl = el("div", "tip"); tipEl.setAttribute("role", "tooltip"); document.body.append(tipEl); }
  tipEl.replaceChildren();
  build(tipEl);
  tipEl.style.opacity = 1;
  const pad = 14, w = tipEl.offsetWidth, h = tipEl.offsetHeight;
  let x = ev.clientX + pad, y = ev.clientY + pad;
  if (x + w > innerWidth - 8) x = ev.clientX - w - pad;
  if (y + h > innerHeight - 8) y = ev.clientY - h - pad;
  tipEl.style.left = Math.max(8, x) + "px";
  tipEl.style.top = Math.max(8, y) + "px";
}
export const hideTip = () => { if (tipEl) tipEl.style.opacity = 0; };

export function tipLine(left, right) {
  const line = el("div", "tip-line");
  line.append(left, right);
  return line;
}
export function tipKey(color, text) {
  const who = el("span", "tip-who");
  const key = el("span", "tip-key");
  key.style.setProperty("--c", color);
  who.append(key, document.createTextNode(text));
  return who;
}

// Makes a row react to pointer and keyboard focus with the same tooltip.
export function attachTip(node, build) {
  node.tabIndex = 0;
  node.addEventListener("pointermove", (ev) => showTip(ev, build));
  node.addEventListener("pointerleave", hideTip);
  node.addEventListener("focus", () => {
    const b = node.getBoundingClientRect();
    showTip({ clientX: b.left + b.width / 2, clientY: b.top }, build);
  });
  node.addEventListener("blur", hideTip);
}

// Collapsible table with the same numbers the chart shows.
export function tableView(summary, headers, rows) {
  const details = el("details", "tableview");
  details.append(el("summary", null, summary));
  const wrap = el("div", "tablewrap");
  const table = el("table");
  const thead = el("thead"), hr = el("tr");
  headers.forEach((h) => hr.append(el("th", null, h)));
  thead.append(hr);
  const tbody = el("tbody");
  rows.forEach((r) => {
    const tr = el("tr");
    r.forEach((cell) => tr.append(el("td", null, cell)));
    tbody.append(tr);
  });
  table.append(thead, tbody);
  wrap.append(table);
  details.append(wrap);
  return details;
}

// Horizontal 0..axisMax percent axis for bar charts that start after a name column.
export function percentAxis(axisMax, step = 5) {
  const grid = el("div", "plotgrid");
  for (let t = 0; t <= axisMax; t += step) {
    const left = (t / axisMax) * 100 + "%";
    if (t > 0) { const g = el("div", "gridline"); g.style.left = left; grid.append(g); }
    const tk = el("div", t === 0 ? "tick tick0" : "tick", t + "%");
    tk.style.left = left;
    grid.append(tk);
  }
  grid.append(el("div", "axis0"));
  return grid;
}

// ---- Regions (IBGE). Labels are looked up here; data only carries UF ids.
export const REGIONS = [
  { id: "north", label: "Norte", ufs: ["AC", "AM", "AP", "PA", "RO", "RR", "TO"] },
  { id: "northeast", label: "Nordeste", ufs: ["AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE"] },
  { id: "central-west", label: "Centro-Oeste", ufs: ["DF", "GO", "MS", "MT"] },
  { id: "southeast", label: "Sudeste", ufs: ["ES", "MG", "RJ", "SP"] },
  { id: "south", label: "Sul", ufs: ["PR", "RS", "SC"] },
];

// ---- Colors computed in JS (CSS color-mix is ignored by older Android browsers, which leaves SVG shapes black).
export function token(name) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const m = v.match(/^#([0-9a-f]{6})$/i);
  return m ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) : [128, 128, 128];
}
const lerp = (from, to, t) => from.map((c, i) => c + (to[i] - c) * t);
const luminance = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
// Ramp for a candidate: surface -> candidate color (first 60% of the scale), then a deeper shade
// (darker on a light page, lighter on a dark page). `pos` goes from 0 to 1. Returns [r, g, b].
const BASE_AT = 0.6;
export function rampRgb(cand, pos) {
  const fg = token(cand.token), bg = token("--surface-1");
  const deep = lerp(fg, luminance(bg) < 0.35 ? [255, 255, 255] : [0, 0, 0], 0.5);
  return (pos <= BASE_AT ? lerp(bg, fg, 0.05 + 0.95 * (pos / BASE_AT)) : lerp(fg, deep, (pos - BASE_AT) / (1 - BASE_AT))).map(Math.round);
}
export const rampColor = (cand, pos) => `rgb(${rampRgb(cand, pos).join(",")})`;
export { luminance };
// Runs `paint` now and whenever the theme changes (OS setting or the page's data-theme).
export function watchTheme(paint) {
  paint();
  matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", paint);
  new MutationObserver(paint).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
}
