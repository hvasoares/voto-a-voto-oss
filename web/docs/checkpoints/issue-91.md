# #91: /brasil/ one bar per region, turnout as text, Compartilhar

## What changed
- `/brasil/` body moved to `components/BrasilScreen.astro` (the page is now a 3-line wrapper). Each region draws ONE bar (its 2nd-round valid votes, ballot order, red first); "Compareceram X% · Não compareceram Y%" and "Brancos · Nulos do comparecimento" are text lines (`[data-participacao]`, `[data-brancos-nulos]`). The turnout/not-voted band is gone, and so are the legend "Barra de cima / Barra de baixo" and the note's first sentence. The national bar prints "Lula 51,79%" fitted to its segment; the vote counts moved to a text line under it (`[data-brasil-votos]`: "Lula 64.256.232 votos · Flávio Bolsonaro 59.826.041 votos"). The sentence "100% da barra = votos válidos de A + B" was dropped (the heading says "votos válidos" and the counts line names both).
- Bar text is 13px bold (step 1), ONE line, fitted by `lib/brasil-label.ts` `barText` over `pickCandidateText` (full name, else the table's short form, else the share alone, else nothing; never an ellipsis; nothing under 13px). New text on the page uses `text-step-1..4`; the h2 faces and the top row live in a scoped `<style>` of the component (the unlayered `h2` rule would beat utilities).
- Compartilhar: a link (`[data-share]`, 44px, in the title row beside "Dados para nerds ›") to `/brasil/compartilhar/`, the SAME sheet as the City card's: bottom sheet over `/brasil/` (the inert backdrop is `BrasilScreen backdrop`), the picture, the message text, the `ShareActions` island (system share; otherwise Copiar link / Baixar imagem), and "Mostrar QR" to `/brasil/qr/` (`QrScreen`, "Presidente 2026 · Brasil"). Without JavaScript the link, the picture and the message text are there; only the buttons need scripts (a `noscript` line says so). No new analytics event: the sheet's `ShareActions` emits the existing `share_opened {has_picture}`, `share_completed {method}`, `share_cancelled`, `share_failed`, `image_downloaded {how}`; no personal property.
- Words: catalog keys `brasil.*` (module `sentences/catalog-brasil.ts`, helpers `sentences/brasil.ts`, both registers). Headline: "No Brasil, no 2º turno de 2026, os votos válidos foram: Lula 51,79% e Flávio Bolsonaro 48,21%." (ballot order, same words for both, no winner/ranking/cause). Text alternative = headline + the five regions with every number on the page; share text = headline + address.
- Picture: `lib/brasil-card.ts` (1080 wide, height from content: 1710 with the five regions; the recap and other pictures are 1080 wide too), `lib/brasil-content.ts` (keys view `brasil`, no place). `card-keys.ts` accepts view `brasil`; `/abrir-cartao/` answers "unsupported" with a link to `/brasil/` (like the recap), so a dropped Brasil picture is recognised, not "sem chaves".

## Decisions and deviations
- The sheet is a ROUTE (like the City's `/:uf/:slug/compartilhar/`), because "Mostrar QR" belongs to that sheet and the recap's inline `ShareActions` has none.
- Turnout figures have no link of their own: the region keeps its one "ver cálculo" (`<regiao>-parcela`) as before; the `-comparecimento/-brancos/-nulos` records exist and are covered by the fact pages and the gate (unchanged, `check:facts` green).
- Region links ("ver cálculo", "Dados da região ›") share one 44px row; "Dados para nerds ›", "Compartilhar", "Comparar regiões ›", "Ver mapa por estado ›", footer "Sobre os dados ›" are 44px too (probe in `e2e/brasil.spec.ts`).

## Markup changes for others (#99/#103 top bar and Home, #87 type)
- `/brasil/` is now `BrasilScreen.astro`; data hooks: `data-brasil-view` (main), `data-brasil-national`, `data-brasil-bar`, `data-brasil-votos`, `data-brasil-legend`, `data-brasil-regioes`, `data-regiao`, `data-regiao-bar`, `data-participacao`, `data-brancos-nulos`, `data-brasil-note`, `data-share`. Removed: the second `[role=img]` band per region, `data-brasil-note`'s first sentence.
- Still off-scale and for #87: `lg:text-[44px] lg:leading-[52px]` on the h1 and `lg:text-[14px]` on "‹ Início" (desktop only), the `Seal` and `PageDataDownload` text.
- The page footer is inside `BrasilScreen` (after `<main>`), as before.

## Measurements (fixture build, base "/", 390x844, gzip; `scripts/measure.ts dist --path /brasil/`)
- `/brasil/` html 4225 -> 4363 B (scoped component CSS and data attributes); shared CSS 15244 -> **15172 B** (-72 B: the old arbitrary 10px/leading classes are gone; room 1212 B of 16384); JS unchanged (1863 B); no data requests.
- Page height at 390: fixture (2 regions) 1407 -> 1408 px; each region block 160 -> 139.7 px, so the real page (5 regions) goes about 1887 -> 1827 px (-60 px) even with the share action in the title row.
- `/` (Home) CSS and html unchanged by this ticket except the shared CSS dropping 72 B.
- New pages `/brasil/compartilhar/` (html 9.4 KB gzip, JS is the existing ShareActions island) and `/brasil/qr/`.

## Tests
`src/lib/brasil-share.test.ts` (14: words, neutrality, alt carries every number, share text, picture numbers/keys, fit of bar text on a 350px bar for 5..95%, the real national result from ../data), `card-reopen.test.ts`, catalog/outside-catalog guards; e2e `brasil.spec.ts` (+3: no label under 13px/fits, 44px links, axe), new `brasil-share.spec.ts` (7, waits on `data-png="ready"`), `real-data-brasil.spec.ts` updated to the new markup.

## Sketch
Page "Election SPA v3": NEW mobile frame 11C44763-5B6C-4E25-9992-C9679464933B "8 Brasil e regiões (celular): uma barra por região + Compartilhar" (390x1290, copied from the v2 frame 3CC6D464, real 2026 numbers; screenshot-verified). Page "Election SPA v3 desktop": 321D61DB-5F34-4534-80E0-7E15EDFF1622 "8 Brasil e regiões (desktop)" updated (one bar per region, turnout text line, Compartilhar button; screenshot-verified). Not updated: B387950C... ("com Baixar os dados desta página"), v1/v2 frames. Known differences code vs frames: the frame's region rows are not re-flowed for the real fonts; the desktop turnout line is one line in the frame and two lines in the code (phone layout kept at every width).

Captures (untracked): `ux-review/2026-10-27/91-{antes,depois}-brasil-{mobile,desktop}.png`, `91-depois-brasil-compartilhar-*`, `91-depois-picture-real.png`.
