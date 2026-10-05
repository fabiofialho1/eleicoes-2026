// Prepares the site for publishing as a hosted page: copies the files and turns
// index.html into body-only content (the host wraps it in its own document).
// Usage: node scripts/make-share.mjs <outDir>
import { readFile, writeFile, mkdir, cp } from "node:fs/promises";
import { join } from "node:path";

const out = process.argv[2];
if (!out) { console.error("Usage: node scripts/make-share.mjs <outDir>"); process.exit(1); }

const html = await readFile("index.html", "utf8");
const title = html.match(/<title>.*?<\/title>/s)[0];
const link = html.match(/<link rel="stylesheet"[^>]*>/)[0];
const body = html.match(/<body>\s*([\s\S]*?)\s*<\/body>/)[1];

await mkdir(join(out, "data"), { recursive: true });
await writeFile(join(out, "index.html"), `${title}\n${link}\n${body}\n`);
await cp("site.css", join(out, "site.css"));
await cp("version.js", join(out, "version.js"));
await cp("charts", join(out, "charts"), { recursive: true });
await cp("data/states.json", join(out, "data/states.json"));
console.log("ok", out);
