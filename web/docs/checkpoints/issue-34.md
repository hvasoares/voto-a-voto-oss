# Issue #34 (Cidades fora da curva): checkpoints

Frames: "22 Cidades fora da curva" (page "Election SPA v3", phone) and "22 Cidades fora da curva (desktop)" (page "Election SPA v3 desktop"); they already existed and are treated as approved.
Entry point: a row of the Relatórios hub (nothing else links to it).

1. **Method, pure.** `lib/reports/outliers.ts` (peers' median, gaps, distance, order, filters, addresses) and the method note `docs/cidades-fora-da-curva.md`. Tests: `outliers.test.ts` (the typical is the median,
   the swing is between the same ballot numbers, exact gaps, a city without three peers with the measure or without 2022 is left out, overseas never, ties by `uf/slug` whatever the input order, the
   filters, the addresses, and the real dataset: 5.570 cities in decreasing distance with finite figures).
2. **Words, records and hub.** `sentences/catalog-outliers.ts` + `reports/outliers-view.ts` (the screening text, the rows, the filters, the count, the sign convention; neutrality tested over both registers), the fact records
   (`facts/other.ts`: one per listed city with its peers, one per count; `facts/pages.ts` builds one page of records per state and one for the counts), the hub row with its record. Tests: `outliers-view.test.ts`,
   `facts/outlier-facts.test.ts` (gate, ids, a row without a record cannot be linked, a record without calculation or inputs fails), `hub.test.ts`.
3. **Page and share.** `components/OutlierPage.astro` with `pages/relatorios/cidades-fora-da-curva/index.astro` and `[uf]/[min]/index.astro` (28 x 4 static pages: the filters are `<details>` menus of links), the share
   (the report script's button, now with an optional `data-share-text`, the screening sentence), e2e `cidades-fora-da-curva.spec.ts`, capture `capture-cidades-fora-da-curva.spec.ts`.

## Decisions and deviations from the frames

- **Filters are links, not scripts.** The frame draws two selects; they are `<details>` menus whose options are links to static pages (28 x 4 pages), so the list needs no JavaScript and no data is fetched.
- **No "Ordenar" select.** The desktop frame has a third select ("Ordenar: distância dos pares"). The ticket asks for the state and minimum-size filters only; one order is built (the distance). Other orders would
  multiply the pages by the number of orders.
- **25 rows.** The frames show 5 and 7; the page lists the first 25 and says how many the filter compared.
- **Extra lines the frames do not have, all required elsewhere:** the swing line of each row (the ticket ranks on turnout and swing), "ver cálculo" per row and per count (G6 build gate), the seal, the count line, the sign convention and
  the method line.
- **Signs.** The swing is printed with a sign; the convention is stated once under the list with the two names of the pair (the other reports do the same). The order ignores the sign.
- **Share on desktop** is at the right of the filters (the frame); on the phone it is at the bottom (the frame). Two buttons, one hidden at each size, one script.
- **Overlap with #13** recorded in `docs/cidades-fora-da-curva.md`.

## Screenshot review (fixture state), Sketch frame vs render (390x844 and 1440x900, capture `e2e/capture-cidades-fora-da-curva.spec.ts`)

| # | Location | Frame shows | Render shows | Severity |
|---|---|---|---|---|
| 1 | status bar, wordmark header (phone) | "Voto a Voto | Presidente 2026", 9:41 | absent, as on every report page | accepted-platform: prototype chrome |
| 2 | phone, back link | "‹ Relatórios" outlined box | same | none |
| 3 | phone, title and subtitle | 30 px serif title, 12 px muted subtitle in two lines | same sizes; subtitle wraps in two lines | none |
| 4 | phone, filters | two boxes 170x34, "Estado: todos ▾", "Mínimo: 5 mil votos ▾" | two 44 px boxes with the same labels | note: 44 px tap target (frame 34) |
| 5 | phone, rows | rank badge 32, name, "58,2% (típico 76,4%) · 12.410 votos válidos" | same, plus the swing line and "ver cálculo" | note: required (see above) |
| 6 | phone, count line | not in the frame | "Mostrando N de M cidades ..." | note: states how many the filter compared |
| 7 | phone, notice and share | notice chip, then "Compartilhar" | seal, notice, sign convention, method, "Compartilhar" | note: seal required by G6 |
| 8 | desktop, columns | #, Cidade, Comparecimento, Típico entre pares, Diferença, Virada desde 2022, Votos válidos, chevron | same columns, "ver cálculo" in the last column instead of the chevron (the name is the link) | note |
| 9 | desktop, controls | three selects and Compartilhar | two selects (no "Ordenar") and Compartilhar | note: decision above |
| 10 | desktop, fixture names | "Cidade Zeta/PR ..." sample | "Cidade Exemplo C/RJ ..." | accepted: different data state |
| 11 | both, consent banner | absent | drawn over the bottom in the fixture capture | accepted: same on every captured page |
Verdict: PASS (no code-fixable blocker left; the first capture had a two-line "Mínimo" label, a 20 px left offset on desktop and a wrapped "ver cálculo", fixed before this verdict).

## Weight (phone, gzip, `scripts/measure.ts dist`, fixture build, before -> after, both issues of the milestone together)

| Page | JS | CSS | HTML | data |
|---|---|---|---|---|
| `/` | 3683 -> 3699 | 15779 -> 16039 | 8448 -> 8446 | 0 |
| `/rj/cidade-exemplo/` | 5100 -> 5116 | 15779 -> 16039 | 6482 -> 6481 | 0 |
| `/relatorios/` | 1791 -> 1807 | 15779 -> 16039 | 3534 -> 3600 | 0 |
| `/relatorios/cidades-que-viraram/` | 2253 -> 2304 | 15779 -> 16039 | 3946 -> 3944 | 0 |
| `/relatorios/comparecimento/` | 2253 -> 2304 | 15779 -> 16039 | 4397 -> 4393 | 0 |
| `/mapa/` | 2360 -> 2376 | 15779 -> 16039 | 7078 -> 7122 | 0 |
| `/relatorios/cidades-fora-da-curva/` (new) | 2304 | 16039 | 5366 | 0 |

Growth of existing pages: +16 B JS everywhere (the event rows of #32), +51 B of JS on the report pages (the share script now reads `data-share-text` and binds every share button), +260 B of the shared CSS (the utilities of the
two new screens; budget 16 KB = 16.384 B, 345 B of headroom left), +66 B html on the hub (the new row). The city card's html is unchanged (6481 B). No budget changed. The list has no island and no data file.
