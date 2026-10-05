# Eleições 2026

Gráfico da votação para presidente (1º turno) por estado, com dados do TSE.

- `scripts/fetch-tse.mjs` — baixa a apuração por UF e grava `data/states.json`
- `index.html` — página estática que lê `data/states.json`
- `contribution.html` — gráfico dos 10 estados que mais contribuem com os votos de cada um dos dois candidatos mais votados

## Uso

```
node scripts/fetch-tse.mjs        # precisa de acesso a resultados.tse.jus.br
npx serve .                        # ou qualquer servidor estático
```
