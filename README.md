# Eleições 2026

Site com gráficos e análises das eleições gerais de 2026 no Brasil, feitos com dados abertos do TSE. Os gráficos entram aos poucos.

- `scripts/fetch-tse.mjs` — baixa a apuração por UF e grava `data/states.json`
- `index.html` — página do site: lista os gráficos de `charts/registry.js` e lê `data/states.json`
- `charts/cover.js` — a capa do site (layout do post do Instagram, 4:5); `charts/geometry.js` divide cada estado por área
- `site.css` — tema claro/escuro e estilos dos gráficos
- `scripts/make-map.mjs` — gera `charts/brazil-map.js` (contornos simplificados dos estados) a partir de um GeoJSON do IBGE
- `charts/` — um arquivo por gráfico (`contribution.js`, `contribution-by-candidate.js`) e `shared.js` com as funções comuns
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

O site é publicado pelo GitHub Pages direto da `main` (Settings → Pages → Deploy from a branch). Como o Pages deixa os navegadores
guardarem arquivos por até 10 minutos, a página, ao abrir no endereço publicado, se redireciona uma vez para o mesmo endereço com
`?_cb=<número único>`, o que ignora qualquer cópia em cache. O CSS, os scripts e os dados usam o mesmo número, então tudo vem na versão mais recente.

O rodapé mostra `Versão do código: AAAA-MM-DD HH:MM` (tag `app-version` no `<head>` do `index.html`). Atualize essa data a cada mudança
(horário da Alemanha, Europe/Berlin) para confirmar que a versão nova está no ar.

Ao criar um arquivo de gráfico novo em `charts/`, acrescente-o também à lista `modules` no começo do `index.html` (sem isso ele continua funcionando, mas pode ficar em cache).

## Capa e imagem do Instagram

A tela inicial abre com a capa, desenhada no formato do post do Instagram (1080×1350, proporção 4:5) e montada a partir dos mesmos dados dos gráficos.
O endereço `#capa` mostra só a capa, com exatamente 1080×1350 px. Para gerar a imagem, abra `index.html#capa` com uma janela de 1080 px de largura
e salve a captura do elemento `.cover` (com fator de escala 2 sai a versão 2160×2700). Ao atualizar os dados, a capa e a imagem mudam juntas.
