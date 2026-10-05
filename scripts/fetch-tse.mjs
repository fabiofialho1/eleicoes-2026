// Downloads first-round presidential results per state from the TSE and
// writes data/states.json. Usage: node scripts/fetch-tse.mjs [electionId]
import { writeFile, mkdir } from "node:fs/promises";

const BASE = "https://resultados.tse.jus.br/oficial";
const UFS = ["ac","al","am","ap","ba","ce","df","es","go","ma","mg","ms","mt","pa","pb","pe","pi","pr","rj","rn","ro","rr","rs","sc","se","sp","to","zz"];

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

// Finds the 2026 federal election id (presidential, cargo 1, first round) in the TSE config.
async function findElectionId() {
  const cfg = await getJson(`${BASE}/comum/config/ele-c.json`);
  const pleito = cfg.pl.find((p) => p.c === "ele2026");
  if (!pleito) throw new Error("No ele2026 cycle in ele-c.json");
  const el = pleito.e.find((e) => e.t === "1" && e.abr.some((a) => a.cd === "br" && a.cp.some((c) => c.cd === "1")));
  if (!el) throw new Error("No first-round presidential election in ele2026");
  return String(el.cd).padStart(6, "0");
}

const num = (s) => Number(String(s).replace(/\./g, "").replace(",", "."));

// Unified result file (-u.json): candidates are nested in carg[].agr[].par[].cand[].
function parse(d) {
  const candidates = d.carg[0].agr
    .flatMap((a) => a.par.flatMap((p) => p.cand.map((c) => ({ number: c.n, name: c.nmu, party: p.sg, votes: num(c.vap), pct: num(c.pvap) }))))
    .sort((x, y) => y.votes - x.votes);
  return { updatedAt: `${d.dg} ${d.hg}`, countedPct: num(d.s.pst), validVotes: num(d.v.vv), candidates };
}

async function main() {
  const id = process.argv[2] ?? (await findElectionId());
  const out = { election: id, round: 1, fetchedAt: new Date().toISOString(), source: BASE, brazil: null, states: {} };
  const url = (abr) => `${BASE}/ele2026/${Number(id)}/dados/${abr}/${abr}-c0001-e${id}-u.json`;
  out.brazil = parse(await getJson(url("br")));
  for (const uf of UFS) {
    out.states[uf.toUpperCase()] = parse(await getJson(url(uf)));
    console.log("ok", uf);
  }
  await mkdir("data", { recursive: true });
  await writeFile("data/states.json", JSON.stringify(out, null, 2) + "\n");
}

main().catch((e) => { console.error(e); process.exit(1); });
