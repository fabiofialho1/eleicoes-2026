import { el, fmtInt, fmtPct, REGIONS } from "./shared.js";
import { regionChart } from "./regions.js";

const merge = (regions, id, label, ids, colorFrom) => ({
  id, label, color: regions.find((r) => r.id === colorFrom).color,
  ufs: ids.flatMap((r) => regions.find((x) => x.id === r).ufs),
});
const sign = (n, a, b) => (n > 0 ? `${a} +` : n < 0 ? `${b} +` : "");
const pt2 = (x) => Math.abs(x).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Each group keeps the color of its largest region, so a color means the same thing in the five-region chart.
export default regionChart({
  id: "regioes-agrupadas",
  title: "Regiões agrupadas: Sul + Sudeste, Norte + Nordeste e Centro-Oeste",
  description: "As mesmas barras com as regiões juntas em três grupos, e o saldo de cada grupo entre os dois candidatos.",
  groupsOf: (regions) => [
    merge(regions, "south-southeast", "Sul + Sudeste", ["south", "southeast"], "southeast"),
    merge(regions, "north-northeast", "Norte + Nordeste", ["north", "northeast"], "northeast"),
    merge(regions, "central-west", "Centro-Oeste", ["central-west"], "central-west"),
  ],
  lead: (c) =>
    `Aqui as regiões estão agrupadas em Sul + Sudeste, Norte + Nordeste e Centro-Oeste. Esse agrupamento é uma escolha para a leitura, não uma divisão oficial do IBGE. ` +
    `Cada barra é o resultado do candidato no Brasil (${fmtPct(c[0].natPct, 2)} para ${c[0].short} e ${fmtPct(c[1].natPct, 2)} para ${c[1].short}), e cada segmento é quanto o grupo soma a ele, em pontos percentuais.`,
  extra(root, { cands, groups, validTotal, data }) {
    const [a, b] = cands;
    const rows = groups.map((g) => {
      const va = g.ufs.reduce((s, u) => s + a.byUf[u].votes, 0), vb = g.ufs.reduce((s, u) => s + b.byUf[u].votes, 0);
      return { label: g.label, saldo: va - vb, pp: ((va - vb) / validTotal) * 100 };
    });
    const ext = a.byUf.ZZ.votes - b.byUf.ZZ.votes;
    rows.push({ label: "Exterior", saldo: ext, pp: (ext / validTotal) * 100 });
    const total = rows.reduce((s, r) => s + r.saldo, 0);

    const card = el("div", "card margins");
    card.append(el("h3", null, `Saldo de cada grupo entre ${a.short} e ${b.short}`));
    const table = el("table", "margin-table");
    const head = el("tr");
    ["Grupo", "Saldo em votos", "Saldo em pontos"].forEach((t) => head.append(el("th", null, t)));
    table.append(head);
    const addRow = (label, saldo, pp, cls) => {
      const tr = el("tr", cls);
      tr.append(el("td", null, label), el("td", null, `${sign(saldo, a.short, b.short)}${fmtInt.format(Math.abs(saldo))}`), el("td", null, `${sign(saldo, a.short, b.short)}${pt2(pp)}`));
      table.append(tr);
    };
    rows.forEach((r) => addRow(r.label, r.saldo, r.pp));
    addRow("Brasil", total, (total / validTotal) * 100, "total");
    const wrap = el("div", "tablewrap");
    wrap.append(table);
    card.append(wrap);

    const sSE = rows[0], nNE = rows[1], cw = rows[2];
    card.append(el("p", "margin-note",
      `Sul + Sudeste (${a.short} ${fmtInt.format(sSE.saldo)} votos à frente) e Norte + Nordeste (${b.short} ${fmtInt.format(Math.abs(nNE.saldo))} à frente) quase se anulam: sobram ${fmtInt.format(Math.abs(sSE.saldo + nNE.saldo))} votos. ` +
      `O Centro-Oeste, com ${fmtInt.format(cw.saldo)} votos à frente para ${a.short}, responde por ${fmtPct((cw.saldo / total) * 100)} da diferença nacional.`));
    const reg = Object.fromEntries(REGIONS.map((r) => [r.id, r]));
    const share = (c, r) => (r.ufs.reduce((s, u) => s + c.byUf[u].votes, 0) / r.ufs.reduce((s, u) => s + data.states[u].validVotes, 0)) * 100;
    card.append(el("p", "margin-note muted",
      `Juntar regiões esconde diferenças dentro de cada grupo. Por exemplo, no Norte ${a.short} teve ${fmtPct(share(a, reg.north))} dos votos válidos e ${b.short} ${fmtPct(share(b, reg.north))}, e no Nordeste ${fmtPct(share(a, reg.northeast))} e ${fmtPct(share(b, reg.northeast))}.`));
    root.append(card);
  },
});
