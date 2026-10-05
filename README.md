# Eleições 2026

Gráfico da votação para presidente (1º turno) por estado, com dados do TSE.

- `scripts/fetch-tse.mjs` — baixa a apuração por UF e grava `data/states.json`
- `index.html` — página do site: lista os gráficos de `charts/registry.js` e lê `data/states.json`
- `site.css` — tema claro/escuro e estilos dos gráficos
- `charts/` — um arquivo por gráfico (`contribution.js`, `votes-by-state.js`) e `shared.js` com as funções comuns
- `scripts/make-share.mjs` — prepara os arquivos para publicar como página hospedada

## Uso

```
node scripts/fetch-tse.mjs        # precisa de acesso a resultados.tse.jus.br
npx serve .                        # ou qualquer servidor estático
```

## Adicionar um gráfico

1. Crie `charts/<nome>.js` exportando `{ id, title, description, render(root, data) }`
   (veja `charts/votes-by-state.js` como modelo). `data` é o conteúdo de `data/states.json`.
2. Importe e adicione o gráfico na lista de `charts/registry.js`.

A página mostra o gráfico numa nova seção e inclui um atalho para ele no topo.
