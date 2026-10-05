# Eleições 2026

Site com gráficos e análises das eleições gerais de 2026 no Brasil, feitos com dados abertos do TSE. Os gráficos entram aos poucos.

- `scripts/fetch-tse.mjs` — baixa a apuração por UF e grava `data/states.json`
- `index.html` — página do site: lista os gráficos de `charts/registry.js` e lê `data/states.json`
- `site.css` — tema claro/escuro e estilos dos gráficos
- `charts/` — um arquivo por gráfico (`contribution.js`, `contribution-by-candidate.js`) e `shared.js` com as funções comuns
- `scripts/build-site.mjs` — gera a versão publicada (`dist/`) com o carimbo do commit e endereços versionados
- `.github/workflows/pages.yml` — publica o site no GitHub Pages a cada push na `main`
- `scripts/make-share.mjs` — prepara os arquivos para publicar como página hospedada

## Uso

```
node scripts/fetch-tse.mjs        # precisa de acesso a resultados.tse.jus.br
npx serve .                        # ou qualquer servidor estático
```

## Adicionar um gráfico

1. Crie `charts/<nome>.js` exportando `{ id, title, description, render(root, data) }`
   (veja `charts/contribution.js` como modelo). `data` é o conteúdo de `data/states.json`.
2. Importe e adicione o gráfico na lista de `charts/registry.js`.

A página mostra o gráfico numa nova seção e inclui um atalho para ele no topo.

## Publicação e atualização

O site é publicado pelo GitHub Pages (Settings → Pages → Source: **GitHub Actions**). A cada push na `main`, o workflow
roda `scripts/build-site.mjs`, que grava o commit e a hora em `version.json`/`version.js`, acrescenta `?v=<commit>` a todos os arquivos
e publica. O rodapé mostra a versão no ar.

O endereço é sempre o mesmo. Como o Pages guarda arquivos por até 10 minutos, a página consulta `version.json` (sem cache) ao abrir:
se houver uma versão mais nova que a do navegador, ela recarrega sozinha. Para republicar sem commit novo, use **Actions → Deploy site → Run workflow**.
