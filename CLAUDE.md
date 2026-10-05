# Eleições 2026 Brasil

Static site (GitHub Pages from `main`, no build step) with charts of the 2026 Brazilian general election, from TSE open data.

## Conventions

- Code, comments, commit messages and PRs: English. User-facing text: Portuguese (pt-BR). Documentation for the user (`README.md`): Portuguese. Talk to the user in Portuguese.
- Stored data uses ids (UF codes, candidate numbers); labels are looked up at render time (`charts/shared.js`).
- Each chart is a module in `charts/` exporting `{ id, title, description, render(root, data) }`, listed in `charts/registry.js` (and in `modules` in the `index.html` head, for cache busting).
- The election is decided by the national total of votes. Do not build charts that rank or compare states against each other as rivals; show how each state adds to a candidate's national result. Maps are colored by that contribution (one hue per candidate, intensity from the contribution), never with a single color for the candidate who won the state. A state may be split between the two candidates in proportion to their votes.

## Versioning

- On every change to the site files, update `<meta name="app-version" content="Versão do código: YYYY-MM-DD HH:MM">` in `index.html` to the current date and time in Europe/Berlin. The footer shows it, and the owner uses it to confirm the latest deploy is live.
- The `?_cb=` redirect at the top of `index.html` keeps every visit on the newest deploy; keep it.

## Commands

- `node scripts/fetch-tse.mjs` — refresh `data/states.json` (also bump the version stamp).
- `npx serve .` — run the site locally.
