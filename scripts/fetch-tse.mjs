// Downloads first-round presidential results per state from the TSE and
// writes data/states.json. Usage: node scripts/fetch-tse.mjs [electionId]
import { writeFile, mkdir } from "node:fs/promises";

const BASE = "https://resultados.tse.jus.br/oficial";
const UFS = ["ac","al","am","ap","ba","ce","df","es","go","ma","mg","ms","mt","pa","pb","pe","pi","pr","rj","rn","ro","rr","rs","sc","se","sp","to"];

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

// Finds the 2026 federal election id (presidential, cargo 1) from the TSE config.
async function findElectionId() {
  const cfg = await getJson(`${BASE}/comum/config/ele-c.json`);
  const ciclo = cfg.c.find((c) => c.ano === "2026" || c.cd?.includes("2026")) ?? cfg.c.at(-1);
  const pleito = ciclo.pl.find((p) => p.cd === "ordinaria" || p.cd?.startsWith("1")) ?? ciclo.pl[0];
  const el = pleito.e.find((e) => e.tp === "1") ?? pleito.e[0];
  return String(el.cd).padStart(6, "0");
}

const num = (s) => Number(String(s).replace(/\./g, "").replace(",", "."));

async function main() {
  const id = process.argv[2] ?? (await findElectionId());
  const out = { election: id, fetchedAt: new Date().toISOString(), states: {} };
  for (const uf of UFS) {
    const url = `${BASE}/ele2026/${Number(id)}/dados-simplificados/${uf}/${uf}-c0001-e${id}-r.json`;
    const d = await getJson(url);
    out.states[uf.toUpperCase()] = {
      updatedAt: `${d.dg} ${d.hg}`,
      countedPct: num(d.pst),
      validVotes: num(d.vv),
      candidates: d.cand.map((c) => ({ number: c.n, name: c.nm, party: c.cc, votes: num(c.vap), pct: num(c.pvap) })),
    };
    console.log("ok", uf);
  }
  await mkdir("data", { recursive: true });
  await writeFile("data/states.json", JSON.stringify(out, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
