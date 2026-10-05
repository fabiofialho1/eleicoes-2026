# Eleições 2026

Gráfico da votação para presidente (1º turno) por estado, com dados do TSE.

- `scripts/fetch-tse.mjs` — baixa a apuração por UF e grava `data/states.json`
- `index.html` — página estática que lê `data/states.json`
- `contribution.html` — barras lado a lado, por estado, da contribuição de cada UF para o total de votos dos dois candidatos mais votados (ordenado pelo primeiro)

## Uso

```
node scripts/fetch-tse.mjs        # precisa de acesso a resultados.tse.jus.br
npx serve .                        # ou qualquer servidor estático
```
