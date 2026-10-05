// Builds the deployable site into <outDir> and stamps it with the current commit.
// Every asset URL gets ?v=<commit>, and the page checks version.json (never cached) on load:
// if the live build is newer than the one the browser cached, it reloads under a fresh URL.
// Usage: node scripts/build-site.mjs <outDir> [commit]
import { readFile, writeFile, mkdir, cp, readdir } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";

const out = process.argv[2];
if (!out) { console.error("Usage: node scripts/build-site.mjs <outDir> [commit]"); process.exit(1); }
const commit = process.argv[3] ?? execSync("git rev-parse --short HEAD").toString().trim();
const builtAt = new Date().toISOString();

await mkdir(join(out, "data"), { recursive: true });
await cp("site.css", join(out, "site.css"));
await cp("charts", join(out, "charts"), { recursive: true });
await cp("data/states.json", join(out, "data/states.json"));
await writeFile(join(out, "version.js"), `export default { commit: "${commit}", builtAt: "${builtAt}" };\n`);
await writeFile(join(out, "version.json"), JSON.stringify({ commit, builtAt }) + "\n");

// Import map: the same module specifiers, but with a per-build query so browsers never reuse an old copy.
const modules = ["./version.js", ...(await readdir("charts")).filter((f) => f.endsWith(".js")).map((f) => `./charts/${f}`)];
const imports = Object.fromEntries(modules.map((m) => [m, `${m}?v=${commit}`]));

const check = `(async () => {
  try {
    const live = await (await fetch("version.json?t=" + Date.now(), { cache: "no-store" })).json();
    if (live.commit && live.commit !== window.__BUILD) {
      let n = 0;
      try { n = +sessionStorage.getItem("reloads") || 0; sessionStorage.setItem("reloads", n + 1); } catch {}
      if (n < 2) { const u = new URL(location.href); u.searchParams.set("r", live.commit); location.replace(u); }
    } else { try { sessionStorage.removeItem("reloads"); } catch {} }
  } catch {}
})();`;

let html = await readFile("index.html", "utf8");
html = html.replace('<link rel="stylesheet" href="site.css">',
  `<link rel="stylesheet" href="site.css?v=${commit}">\n` +
  `<script>window.__BUILD = "${commit}";</script>\n` +
  `<script type="importmap">${JSON.stringify({ imports })}</script>\n` +
  `<script>${check}</script>`);
await writeFile(join(out, "index.html"), html);
console.log(`built ${commit} -> ${out}`);
