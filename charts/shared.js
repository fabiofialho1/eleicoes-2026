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
export function topCandidates(data, n = 2) {
  return data.brazil.candidates.slice(0, n).map((c, i) => {
    const name = DISPLAY_NAMES[c.number] ?? titleCase(c.name);
    const byUf = Object.fromEntries(Object.entries(data.states).map(([uf, s]) => {
      const m = s.candidates.find((x) => x.number === c.number);
      return [uf, { votes: m ? m.votes : 0, pct: m ? m.pct : 0 }];
    }));
    const total = Object.values(byUf).reduce((a, v) => a + v.votes, 0);
    return { number: c.number, name, short: name.split(" ")[0], party: c.party, color: `var(--series-${i + 1})`, byUf, total };
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
