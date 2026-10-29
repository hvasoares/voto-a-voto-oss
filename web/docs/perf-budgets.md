---
title: Budgets de peso e carregamento (ticket #19)
description: O que as páginas dos quatro roteiros auditados pesam, o que é carregado, e quem vigia os números.
---

# Peso e carregamento das rotas auditadas

Ticket #19. Dois números convivem aqui, e nenhuma cifra abaixo foi inventada: **tudo é medido no
build** pelo script `scripts/perf-budgets.ts`, que lê o HTML construído das quatro rotas e soma,
com gzip (node:zlib sobre os bytes construídos — o que um celular em 4G baixaria com a compressão
simples do servidor), o que o navegador transfere. Rodar com `npm run build && npm run check:perf`
(existe também como `npm run check:perf` sozinho); o script **falha** quando um orçamento é
estourado, então os números de uma tabela não podem divergir silenciosamente do código.

O que o script soma por rota:

- **html** — o documento da página;
- **css** — todo stylesheet que o documento liga (o site manda um CSS compartilhado);
- **eagerJs** — todo `<script src>` no documento (scripts de página; ilhas contam em islandJs);
- **islandJs** — toda ilha React que a rota declara (`component-url` e `renderer-url` de
  astro-island), com a nota de que as ilhas `client:interaction` **não carregam isso no carregamento
  da página**: o download acontece no primeiro toque/foco. O custo de react-dom está contido aqui.

## Orçamentos

| Rota | html | css | eagerJs | islandJs |
|---|---|---|---|---|
| `/` (home) | 12 KB | 16 KB | 4.2 KB (#35/#40: era 3 KB) | 120 KB |
| `/rj/cidade-exemplo/` (cartão) | 6.4 KB (G6: +0.2 KB, ver abaixo; G2: +1 KB, ver abaixo; #58: a frase pronta nos dois registros; #51: a barra superior de desktop, pré-renderizada em todas as páginas; #52: a segunda coluna do cartão) | 16 KB | 3 KB | 3 KB |
| `/mapa/` (tile map por estado) | 12 KB | 16 KB | 3 KB | 85 KB |
| `/relatorios/cidades-que-viraram/` (relatório) | 12 KB | 16 KB | 3 KB | 3 KB |
| `/brasil/sudeste/` (página da região, #183) | 6 KB | 16 KB | 3 KB | 3 KB |

Os números medidos e a folga de cada orçamento **não** ficam neste documento: `npm run check:perf` os escreve em `web/perf-record.json` (git-ignorado, determinístico; no CI, a tabela está no resumo do job e o arquivo é um artefato). Um orçamento estoura quando medido > limite; folga abaixo de max(3% do limite, 100 B) aparece como `WARN`. Para subir um limite, edite `BUDGETS` em `scripts/perf-budgets.ts` com um comentário que cite o ticket, em um commit revisado que diga o valor antigo e o novo.

**Nova rota auditada (#183):** a página da região (`/brasil/<regiao>/`, cinco páginas) entra em `check:perf` como a rota `region` (a de `/brasil/sudeste/` na fixture), no casco do relatório (`ReportLayout`): HTML estático, sem ilha e sem script próprio. Celular (390x844), `scripts/measure.ts`, gzip, primeira carga: html 3831 B, JS 2047 B, css 13040 B, dados 0 B (o relatório, `/relatorios/cidades-que-viraram/`: html 4149 B, JS 2488 B, css 13040 B). `check:perf`: html 3831 B de 6144 B, eagerJs 1569 B de 3072 B, islandJs 0 B. A página "Brasil e regiões" (`/brasil/`) mede html 4456 B, JS 2047 B, css 13040 B depois de trocar as duas barras pelo `ResultBar` e de ligar o nome de cada região à sua página (cinco links). A lista de municípios do estado passou a desenhar suas linhas com o `ListRow` (a mesma marcação, extraída); o CSS compartilhado não mudou.

**Medição (#153, sem mudança de orçamento):** o cabeçalho do app (a marca como link para a Home e o campo da busca de cidade) agora aparece em toda página pública, no celular, vindo do layout (`AppHeader.astro`, `HeaderSearch.astro`). O campo é HTML pré-renderizado (o mesmo da barra de desktop); a busca real só carrega no primeiro toque, e um celular que não toca no campo não baixa nenhum byte dela (o trecho inline do layout só registra os ouvintes). As classes longas do campo vivem uma vez em `global.css` (`.hs-icon`, `.hs-input`), não em cada documento. Celular, `scripts/measure.ts`, antes -> depois (gzip): home html 8872 -> 8962 B, css 13160 -> 13269 B; relatório (`/relatorios/cidades-que-viraram/`) html 3722 -> 3887 B; `/sobre-os-dados/` html 9006 -> 9172 B; `/api/` html 3820 -> 3977 B; `/edicoes/` html 2636 -> 2802 B; `/gerador/` html 6892 -> 6957 B. JS: nenhuma mudança em nenhuma delas (home 4910 B, relatório 2488 B, as páginas de Usar os dados 2047 B, gerador 126710 B). `check:perf`: cartão html 6432 -> 6531 B (limite 6553 B, folga 22 B, WARN); o resto com a folga de antes.

**Medição (#147, sem mudança de orçamento):** a dica acima da busca da home (uma linha por destino, nos dois registros) e o foco ao chegar de uma entrada que pede cidade entram no script da página. Celular, `scripts/measure.ts` na home: antes html 8823 B, JS 4276 B (gzip), css 13141 B; depois html 8872 B, JS 4910 B, css 13160 B. `check:perf`: eagerJs da home 3204 B -> 3478 B (limite 4300 B), html 8823 B -> 8872 B (limite 12 KB). Só a home muda neste ticket.

**Medição (#156, sem mudança de orçamento):** o botão "Usar minha localização", sua linha, o script e o arquivo dos centros saem da home. Celular, `scripts/measure.ts` na home: antes html 8872 B, JS 4910 B (gzip), css 13160 B; depois html 8669 B, JS 3949 B, css 13095 B. `check:perf`: eagerJs da home 2517 B (limite 4300 B), html 8669 B (limite 12 KB). A home é a única página tocada (o texto de `/sobre-os-dados/` e `/api/` não é medido pelo `check:perf`).

**Medição (#157, sem mudança de orçamento):** o cartão da cidade passa a ter um só texto (linguagem simples) e perde o seletor de textos: a frase, a linha da margem, o arco, a cidade parecida e as curiosidades deixam de ser impressas duas vezes, e as regras `.register` saem do CSS. Celular (390x844), `scripts/measure.ts`, antes -> depois. Cartão (`/rj/cidade-exemplo/`): html 6432 -> 5657 B gzip (-775 B), JS 7136 -> 6637 B, css 14900 -> 14747 B, dados 0 -> 0. Página de compartilhar (`/rj/cidade-exemplo/compartilhar/`, onde ficam os textos prontos): html 11974 -> 11237 B, JS 107384 -> 107139 B, css 14900 -> 14747 B, dados 0 -> 0. `check:perf`: cartão html 5657 B (limite 6553 B, folga 896 B), eagerJs 2845 B (limite 3072 B); "All budgets met."

**Medição (#147, a ilha de busca da barra do topo em outras páginas; 1.14.0 integrado):** a `CitySearch` da barra do topo só hidrata no primeiro toque (`client:interaction`), então a primeira carga no celular (390x844, `scripts/measure.ts`, gzip) não muda com a dica da home. Cartão da cidade (`/rj/cidade-exemplo/`): antes do #147 (223fe21) html 6433 B, JS 7136 B, css 14881 B; depois do #147 (e64f9cf) html 6432 B, JS 7136 B, css 14900 B; com todos os tickets da 1.14.0 integrados html 5712 B, JS 6684 B, css 14618 B. Relatórios (`/relatorios/`): antes html 3417 B, JS 2047 B, css 13141 B; depois do #147 html 3417 B, JS 2047 B, css 13160 B; integrado html 3797 B (+380 B: o cabeçalho único com a busca e o link Início), JS 2047 B, css 13045 B. `check:perf` integrado: "All budgets met." (cartão: html 5712 B de 6553 B, eagerJs 2919 B de 3072 B, folga de 153 B; relatório: html 4195 B de 12288 B). A lista de chaves da dica passou a ser uma só (`HOME_HINT_KEYS` em `catalog-home.ts`, espalhada em `KEYS`), sem tocar no script da home.

**Mudança de orçamento (#35, #40):** o `eagerJs` da home passou de 3 KB para 4.2 KB. A home agora lê o aparelho ao carregar
(o atalho "Sua cidade" e o "esquecer meus dados", ~0.6 KB gzip) e traz o botão "Usar minha localização"; o código que pede a posição
e o arquivo dos centros (70 KB gzip) só carregam no toque, mas o `import()` dinâmico faz o Vite acrescentar seu carregador (~0.9 KB gzip) ao script
da página (medido: embutir o código custou mais, 5.4 KB contra 4.9 KB de JS na página). Medido: eagerJs da home 4.1K; o html da home cresce ~0.4 KB gzip (markup do atalho, do botão e das notas; `measure.ts`: 6.4K -> 6.8K).

**Mudança de orçamento (#51, #52):** o `html` do cartão passou de 4 KB para 4.6 KB (#51) e para 5.2 KB (#52, a segunda coluna do cartão e as descrições dos links, ~0.5 KB): a barra superior do desktop (marca, campo de busca, três links) é HTML pré-renderizado em toda página, escondida abaixo de 1024 px (medido no celular: +0.7 KB gzip de HTML em toda página, +0.6 KB no CSS compartilhado, nenhum byte de JS nem requisição nova: o módulo do desktop é carregado por um trecho inline atrás de `matchMedia`, e o campo só vira o `CitySearch` real no primeiro foco).

**Mudança de orçamento (G2: #26, #41, #31, #33):** o `html` do cartão passou de 5.2 KB para 6.2 KB. As quatro linhas do cartão são texto
pré-renderizado, nos dois registros, sem script e sem requisição nova: o html do cartão (`rj/cidade-exemplo/`, fixture) foi de 5179 para 6138 bytes gzip
(+959 B): cartão de curiosidades 383 B (no celular e no desktop: o mesmo bloco; a página própria e o link de 23 B foram removidos depois, o html da cidade com cartão caiu ~22 B), linha da margem 266 B (seis vistas,
dois registros), cidade gêmea 153 B, arco 132 B. O mínimo que cobre o medido com folga de ~0.2 KB; o resto do cartão (css, js) não mudou de orçamento.

**Mudança de orçamento (G6, #61):** o `html` do cartão passou de 6.2 KB para 6.4 KB. Cada número do cartão ganhou o link "ver cálculo" (as duas barras, as cinco
linhas da legenda, a frase e a linha da margem, nas seis vistas pré-renderizadas; o cartão de curiosidades, um por fato): o html da cidade (`rj/cidade-exemplo/`, fixture, 390x844,
`measure.ts`) foi de 6106 para 6475 bytes gzip (+369 B; 6.32 KB, folga de 0.08 KB). Nada mais mudou na primeira carga do celular: JS 5064 B gzip (10155 raw), antes e depois;
dados 0 B, antes e depois; CSS 15605 -> 15697 B gzip (+92 B, as regras `.calc`, no mesmo arquivo, abaixo do orçamento de 16 KB). A página do cálculo (`/fato/...`) tem o CSS dela
(`fact.css`, só nessa página) e não tem script próprio.

**G3 (#25 a #29), nenhum orçamento mudou:** as dez novas linhas da tabela de eventos (`analytics/events.ts`, com prosa) fariam o script que toda
página carrega passar de 3.1 KB (gzip) e estourar o `eagerJs` de home, mapa e relatório. A tabela foi dividida: `analytics/event-props.ts` traz só o
que o navegador precisa (nome do evento e propriedades permitidas) e `events.ts`, com as descrições, ficou para os testes e a documentação, com um
teste que obriga as duas a dizerem o mesmo. Efeito medido (`npm run check:perf`, fixture): o script de todas as páginas caiu de 3.1 KB para 1.4 KB
gzip; `eagerJs` home 2.8 KB (orçamento 4.2), cartão 2.3 KB (3), mapa e relatório 1.5 KB (3); o html do cartão da cidade continua 6.0 KB (6.2) e o da home
8.2 KB (12). As páginas novas (`/gerador/`, `/abrir-cartao/`, `/resumo/`, `/meu-brasil/`, `/widget/`) são ilhas `client:load`
fora das quatro rotas auditadas; o widget (`/embed/…`) não tem script.

Os orçamentos foram calibrados para o site já passar de folga — a intenção do ticket foi
**fixar o piso atual como linha de base**, para que regressões de peso (voltar a CDNs, importar
uma biblioteca de animação, soltar um CSS duplicado) quebrem o CI em vez de entrar mudo.

Duas notas que o orçamento não esconde:

- **react-dom (o `client.` de ~0.9K, ver `web/perf-record.json`) é o custo fixo das páginas com ilha.** As ilhas desta base são
  todas `client:interaction`, então esse download só sai quando o campo de busca da home ou a
  malha/troca de vista do mapa é tocado; está contabilizado no islandJs da rota.
- A home carrega **um único shard** de dados (`search.json`) e **só quando o campo ganha foco** —
  isso é pinado em e2e (`home.spec`); o mapa puxa a malha de municípios **só quando a vista Mapa
  abre** — pinado em `mapa-rj.spec`.

## O que já foi podado neste ticket

- `tw-animate-css` saiu de `styles/global.css` (as animações dele só fariam sentido num componente
  animado; nenhum existe hoje) — CSS crú de 66.7K para 61.8K, gzip medido 12.2K. Voltar com ele
  na primeira animação de verdade (o comentário no CSS documenta isso).
- Nada mais precisou podar: as rotas já atendiam seus orçamentos com folga.

## Acessibilidade e movimento, do mesmo ticket (aqui por serem de tela, não de peso)

- `prefers-reduced-motion` é honrado: a base zera animações/transições em CSS, e os componentes
  que têm transição própria só a carregam via `motion-safe:`.
- Alvos de toque (44px) foram normalizados via tokens (`--min-tap` / `min-h-11`) na folha de
  compartilhamento, tela de QR, painel do mapa, linhas dos relatórios e grade da home.
- Sem "significado só pela cor": os tiles do mapa carregam o valor à vista e o nome do estado numa
  frase sr-only (o rótulo vem do conteúdo, não de um aria-label), o painel selecionado é
  `aria-live`, os degraus da escala são numéricos, e o relatório tem as frases equivalentes.
- Residual documentado: nos degraus positivos da escala do Sketch, o `fgOf` de #16 já escolhe a
  tinta de maior contraste, e o degrau pos-2 (`#d15c53`) fecha em 4.4:1 nos dois sentidos — a
  paleta não alcança 4.5:1 aí; e o rótulo permanece legível pois há leitura em texto em dois
  lugares (sobre o próprio tile — visível e sr-only — e na tabela por estado). O axe roda em CI
  nas quatro rotas (`e2e/a11y.spec.ts`) com essa e só essa exceção, comentada no arquivo.

## Escala tipográfica (reconciliação limitada do #19)

A regra do ticket foi "tokens ganham": as páginas de relatório já usam a escala de tokens
(`text-title`, `text-body`, `text-small`…), então não houve nada a reconciliar nelas. Sobram duas
exceções pontuais, padrão de todo o site e não só dos relatórios — o badge numerado dos rankings
(`text-[13px]`) e o rodapé de fonte (`text-[12.3px]`) — que ficam como estão: valores únicos numa
escala compartilhada, mexer neles mudaria o visual que o ticket manda preservar.
**G5 (#32, #34), nenhum orçamento mudou:** "Ficaram em casa" (`/mapa/ficaram-em-casa/`) e "Cidades fora da curva" (`/relatorios/cidades-fora-da-curva/`) são páginas novas; a primeira carga das páginas que já existiam
cresceu +16 B de JS (as duas linhas de `analytics/event-props.ts`), +260 B de gzip no CSS compartilhado (de 15779 para 16039 B; o orçamento é 16 KB) e, nas páginas de relatório, +51 B de JS
(o botão de compartilhar lê `data-share-text`). O html do cartão da cidade ficou igual (6481 B): as sete cores da escala do mapa não entram nos tokens, que viram variáveis CSS no `<head>` de toda página.
A página do mapa não carrega React na primeira carga (a ilha do mapa é `client:interaction`, a do compartilhar `client:visible`); a lista de relatório não tem ilha nem arquivo de dados.
Números por página em `docs/checkpoints/issue-32.md` e `issue-34.md`.

**G8 (#44, #46, #42, #43, #47, #45, #97), no budget changed.** City card (`/rj/cidade-exemplo/`, fixture, 390x844, `scripts/measure.ts`), #44 only: html 6482 -> 6548 B gzip (budget 6.4 KB = 6553 B: the arc block moved to the top as the answer, so the page grew by the question line alone), css 16223 -> 16320 B
(budget 16 KB = 16384 B: the old pill rules became the answer box, the desktop overrides they made dead were removed), JS 5130 -> 6087 B (the guess is a static import of `city-card`'s own script: a dynamic import cost 2.3 KB because of Vite's preload helper). The replay (#46) and the season (#42, #43) have their own stylesheets
(`replay.css`, `season.css`, loaded by those pages only), the story pages (#47, #97) have `story.css`; none touches the shared stylesheet or an audited route. The three-cycle page of a city carries +1967 B of JS gzip for the replay. The Meu Brasil page (#97 button): JS +101 B gzip.
Per ticket numbers: `docs/checkpoints/issue-44.md`, `issue-46.md`, `issue-97.md`.

**Mudança de orçamento (#122), nenhum orçamento mudou:** todas as ilhas hidratadas passaram a publicar `data-ready`/`data-error` pelo mesmo portão (`lib/island-ready.ts` + `components/use-island-ready.ts`), e os dois scripts de retenção de toques (`map-pending.ts`, `overlay-pending.ts`) viraram um só (`scripts/island-pending.ts`). Medido nos builds do merge base (`d4f2524`) e do branch, gzip (`node:zlib` sobre os bytes construídos), eagerJs das quatro rotas auditadas:

| Rota | eagerJs antes | eagerJs depois | delta |
|---|---|---|---|
| home (`/`) | 3126 B (shim `Di_RWPze.js` 1516 B + `Base` 1610 B) | 3126 B (os dois arquivos idênticos, hash igual) | **+0 B** |
| cartão (`/rj/cidade-exemplo/`) | 3016 B (shim `Br5BTUab.js` 1406 B + `Base`) | 3016 B (idênticos) | **+0 B** |
| mapa (`/mapa/`) | 1664 B (shim `CtULk5vW.js` 54 B + `Base`) | 1667 B (shim `CNy9O-Ne.js` 57 B + `Base`) | **+3 B** |
| relatório (`/relatorios/cidades-que-viraram/`) | 1666 B (shim `h1UuuPsj.js` 56 B + `Base`) | 1666 B (idênticos) | **+0 B** |

`check:perf`: "All budgets met." antes e depois; o crescimento do helper ficou ≤150 B por rota (máximo +3 B, dentro da folga dos orçamentos de 3 KB/4.2 KB) e a home não cresceu (regra do dono, 2026-10-28). O script do portão de toques retidos tem duas entregas: nas cinco páginas de mapa (`/mapa/`, `/mapa/<uf>/`, `/mapa/virada/`, `/<uf>/`, `/mapa/ficaram-em-casa/`) carrega como import de módulo do shim da página — `island-pending.js` (845 B gzip) substitui `map-pending.js` (542 B); módulos importados não entram no eagerJs (como o `map-pending` nunca entrou), mas descem com a página: +303 B gzip reais nessas cinco páginas, e só nelas. Na página do overlay (`/overlay/`) o mesmo instalador vai embutido no HTML (`is:inline`, como o antigo `overlay-pending` era — a ilha é `client:load`, um toque pode chegar antes de qualquer módulo): html da página do overlay 6701 → 7745 B gzip (+1044 B; rota não auditada, sem orçamento). A ilha do mapa cresce 41 B gzip (`StateMapMap` 3880 → 3921 B, islandJs, orçamento 85 KB).

**Medição (#149, sem mudança de orçamento):** a resposta da pergunta do cartão começa escondida (`hidden`) e o aviso de que a pergunta precisa de scripts entra nos dois registros; sem scripts o CSS (`scripting: none`) mostra os dois. Cartão, `check:perf`: html 6506 B de 6553 B (folga de 47 B, WARN), eagerJs 3021 B de 3072 B.

**Medição (#155, nenhum orçamento mudou):** cada página tem uma só entrada "De onde vem este número?", um ícone 🔍 com nome acessível, no lugar de um link de texto por número ou seção. Celular, cartão da cidade (`/rj/cidade-exemplo/`), `check:perf`: html 6475 B → 6170 B gzip (**−305 B**: saem os 54 links das seis visões, com a frase e a margem; entra uma entrada), css sem mudança de orçamento (as regras de posição dos links por número saem, a regra do ícone fica), `eagerJs` 3054 B de 3072 B (o script do cartão passa a atualizar o endereço da entrada ao trocar de ciclo e turno: +~40 B, folga de 18 B, um `WARN` de folga e não de orçamento). As outras rotas medidas não mudam de forma relevante; nenhuma requisição nova, nenhuma ilha nova. A ilha de destaque do estado (desktop) perde o link do próprio cálculo, que a entrada da página cobre.
