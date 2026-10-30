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

**Medição (private#211, família `compartilhar` da cidade; o portão `check:dist-size` ainda não existe e não foi mudado aqui):** a folha de compartilhamento de toda cidade é um stub mais um arquivo de dados (private#210), e o código da página antiga pré-renderizada saiu (escopo `city` de `lib/screen-scopes.ts`, o tipo `sheet` do corpo, `CityTexts.astro`). Build da fixture (9 cidades), família = as páginas `<uf>/<slug>/compartilhar/index.html` e seus arquivos `data/v…/compartilhar/<uf>/<slug>.json`, medida por um script descartável, antes (5a0d640, a página pré-renderizada) -> depois: 18 arquivos nos dois; bytes 511695 -> 81975 (-84%); gzip 107234 -> 29792 (-72%); html 502676 -> 71893 B; dados 9019 -> 10082 B. Em média, de 55,9 KB para 8,0 KB de html por cidade. A queda em bytes brutos passa de 80%; em gzip fica em 72% porque o casco comum de cada página (cabeçalho, rodapé, o script do stub) é pequeno e não encolhe, e o arquivo de dados cresceu 1 KB por pegar a pergunta e a data da edição. O casco não foi mexido (decisão D-043). Orçamentos de `check:perf`: nenhum mudou.

**Medição (#184, nenhum orçamento mudou):** todo estado (sigla ou nome) e toda região impressos no texto de uma página são um link para a página do estado ou da região (`lib/place-link.ts`, `components/PlaceLink.tsx`, `PlaceText`). Celular (390x844), `scripts/measure.ts`, antes -> depois (gzip), primeira carga: cartão da cidade html 5663 -> 5760 B, css 14613 -> 14663 B, JS 6684 -> 6684 B; home html 8962 -> 8965 B, css 13040 -> 13090 B, JS igual; `/mapa/` html 7251 -> 7307 B (o painel "RJ · selecionado" vira link), JS da ilha +15 B; relatório e região html +1 a +2 B; `/brasil/` html 4456 -> 4523 B. `check:perf`: "All budgets met." (cartão: html 5760 B de 6553 B, eagerJs 2919 B de 3072 B, folga de 153 B, como antes). O link grande de 44 px é uma camada transparente (`after:-inset-y-4`) na mesma classe do link, sem CSS novo além das classes que entram no arquivo compartilhado (+50 B gzip). A página de compartilhar da cidade (`/rj/cidade-exemplo/compartilhar/`, onde o texto da mensagem agora traz o estado como link) carrega 107499 -> 109947 B de JS (+2448 B gzip: a ilha `ShareActions` importa o `PlaceText`, e com ele os nomes dos estados e a frase do link); não é uma rota auditada.

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

**A página do cálculo virou stub com arquivo de dados (private#214), nenhum orçamento mudou:** `/fato/...` não é uma das cinco rotas auditadas. O html da página (`fato/rj/cidade-exemplo/2026-2/`, fixture, 390x844, `measure.ts`) foi de 5756 para 3509 bytes gzip (23156 -> 11177 raw), e o arquivo de dados (1661 B gzip) e o script da página (JS 2047 -> 11883 B gzip, das quais 3120 B são as palavras do catálogo que as frases pedem, `virtual:fact-words`) passam a ser pedidos. A primeira carga de uma única página do cálculo ficou mais pesada (20,9 -> 30,1 KB gzip); o que cai é o total do site (a família `fato` inteira, raw, -40% contando os arquivos de dados que já existiam, -23% sem eles). O catálogo inteiro não vai para o navegador.

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

**Experiência não mantida (private#202, `build.inlineStylesheets: 'never'`):** a opção foi tentada e revertida; nenhum orçamento mudou. Build da fixture (182 páginas), por família, raw -> gzip (somando todos os arquivos): total 8,28 MB -> 7,91 MB (-4,5%) e 2,61 MB -> 2,49 MB gzip (-4,6%); `fato` 525737 -> 333225 B (gzip 164582 -> 112052); `compartilhar` 71893 -> 62713 B; `qr` 71290 -> 62110 B; cartão 503657 -> 485589 B; relatórios 407469 -> 387069 B. Primeira carga no celular (390x844, `scripts/measure.ts`, html + css, gzip), antes -> depois: Home 22047 -> 22104 B; cartão da cidade 20407 -> 20467 B; stub `qr` 15831 -> 15886 B; stub `fato` 16592 -> 16760 B. O html cai uns 0,4 KB (1,1 KB no `fato`), mas o css que sai do html vira arquivo próprio e a primeira carga fica de 55 a 170 B mais pesada e com uma requisição a mais (duas no `fato`: `DocHead` e o css da página); só as visitas seguintes ganham, pelo cache. Além disso `check:perf` quebra ("expected exactly one stylesheet shared by all routes"), pois passa a haver dois css compartilhados. Extrapolação (não medida; contas com a diferença por página da fixture vezes as contagens reais): ~0,4 KB gzip x 5.760 cidades x (qr, compartilhar) e x 5.814 cartões, ~1,1 KB gzip x 12.449 páginas `fato` (~14 MB gzip, ~51 MB raw): o site fica mais leve, mas a primeira carga de cada página fica mais pesada, e o critério do ticket é "mais leve e não mais lento". Sem dist de dados reais atual; só a fixture foi medida. Para tentar de novo seria preciso um só arquivo de css compartilhado (o tema dentro do `global.css`) e a medição da página real.

## Tamanho do site construído por família (private#204)

`npm run check:dist-size` (`make dist-size`; roda depois de um build, não constrói nada) lê `web/dist` (ou a pasta dada como argumento), classifica cada arquivo com `classifyPath` (`src/shared/page-family.ts`, private#203), imprime a tabela (páginas, arquivos, MB, KB médios por arquivo), a contagem de arquivos de dados (família `data-shards`: os stubs somam um JSON por endereço, então arquivos e bytes são contados à parte), o custo de mais uma edição e sai com 1 acima do orçamento. MB são decimais (1 MB = 1 000 000 B). O orçamento é `DIST_BUDGET_BYTES` em `scripts/dist-size-budget.ts`: começou em 1,29 GB (o total do build real, abaixo) e desde private#215 é 890 MB (o total medido depois dos stubs, 847,2 MB, mais cerca de 5%), e o valor final recomendado, `RECOMMENDED_FINAL_BYTES` = 900 MB, **está por ser confirmado pelo dono** (não é o portão; só a segunda linha do cálculo de folga). O build de fixture (cerca de 8 MB) passa com folga enorme: o portão só morde num build de dados reais até os tickets o baixarem.

**Custo de mais uma edição (estimativa):** as edições são imutáveis, então cada rodada nova soma páginas. O script agrupa os arquivos `fato/**/<ciclo>-<rodada>/index.html` e `data/<versão>/fato/**/<ciclo>-<rodada>.json` pelo rótulo da edição, soma os bytes de cada rótulo e usa a média como custo de uma edição; a folga em edições é (orçamento menos total) dividido por esse custo. É estimativa porque o `dist/` não diz quantas cidades terão a rodada nova; a média é a de edições já construídas. Nenhuma outra família cresce por rodada hoje (cartão, `compartilhar`, `qr` e `tres-ciclos` são por cidade).

**ANTES do marco 1.14.3 (build de dados reais; números tirados do ticket private#197, não medidos de novo aqui; a data é a do ticket, 2026-10-29):**

| Família | Páginas | MB |
|---|---|---|
| `compartilhar` | 5 760 | 330 |
| `fato` | 12 449 | 293 |
| `city-card` | 5 814 | 185 |
| `qr` | 5 760 | 138 |
| `tres-ciclos` | 5 760 | 102 |
| total do site | | 1 290 |

**Build de fixture, medido em 2026-10-29 (depois de private#210 a private#214):** 182 páginas, 484 arquivos (105 de dados), 8,3 MB; `other` 5,9 MB (inclui `_astro`), `fato` 47 páginas 0,5 MB, `city-card` 14 páginas 0,5 MB, `report` 20 páginas 0,4 MB, `data-shards` 105 arquivos 0,4 MB, `compartilhar` 9 páginas 0,1 MB, `qr` 9 páginas 0,1 MB, `tres-ciclos` 9 páginas 0,2 MB. Uma edição custa em média 0,2 MB na fixture (2 edições). Os números de dados reais ainda têm de vir de um build de dados reais.

**DEPOIS do marco 1.14.3 (build de dados reais, `DATA_DIR=../data OUT_DIR=dist-real`, `npm run check:dist-size dist-real`, medido em 2026-10-29 depois de private#210 a private#214, private#215):** 77 574 arquivos (29 954 de dados), total **847,2 MB** (era 1 290 MB). O orçamento passou de 1,29 GB para 890 MB (847,2 MB mais cerca de 5%). Os 900 MB recomendados continuam **por confirmar pelo dono**; o total medido está 52,8 MB abaixo deles, mas isso não confirma o número. Uma edição custa em média 102,0 MB (2026-1: 103,9; 2026-2: 100,1), então a folga abaixo de 900 MB é de 0 edições.

| Família | Páginas | MB ANTES | MB DEPOIS (páginas) | MB DEPOIS (arquivos de dados do stub) |
|---|---|---|---|---|
| `compartilhar` | 5 760 | 330 | 45,8 | 6,3 |
| `fato` | 12 449 | 293 | 123,6 | 95,6 |
| `city-card` | 5 814 | 185 | 183,6 | 0 |
| `qr` | 5 760 | 138 | 45,5 | 3,2 |
| `tres-ciclos` | 5 760 | 102 | 100,6 | 0 |
| `previews` (imagens, fora da tabela do ticket) | 0 | n/d | 108,9 | |
| `other` (inclui `_astro`) | 5 917 | n/d | 102,6 | |
| `state` / `report` / `region` | 28 / 120 / 5 | n/d | 7,3 / 5,4 / 0,1 | |
| total do site | 41 613 | 1 290 | 847,2 | (os arquivos de dados somam 123,9 MB em `data-shards`, já dentro do total) |

Leitura: `compartilhar` cai 84% (330 para 52,1 MB com os dados) e `qr` 65% (138 para 48,7 MB); `fato` cai 58% só nas páginas (293 para 123,6 MB) e 25% contando os 95,6 MB de arquivos de dados (219,2 MB), então **não chega aos 80% previstos**: o texto das frases e as entradas de cada registro agora moram no JSON (95,6 MB, 7,7 KB por página) e cada stub continua carregando o casco comum (cabeçalho, rodapé, estilos inline, em média 9,9 KB por página, contra 8,0 KB de `compartilhar`). Reduzir mais exigiria mexer no casco ou no formato do JSON, o que é outro ticket. `city-card` e `tres-ciclos` não mudaram (não fazem parte do marco).

**Limpeza (private#215):** saíram as regras de `fact.css` que só a página antiga usava (`.fact-page .fact-page ...`, que nunca casam no stub, e as de `.page__main`, `.page__title`, `.back`), as chaves de catálogo sem uso (`fact.method`, `fact.others`, `fact.sub.hub`, `fact.back.relatorios`), `registerBootScript`, `placeOf` e o reexport de `cameFromSite` em `facts/link.ts` (o teste foi para `way-back.test.ts`). Ficam, porque ainda têm uso: `Fact.sentences` (o portão de neutralidade e as frases dos relatórios), `FixtureBanner`, `SiteFooter` e `Seal` (outras páginas).
