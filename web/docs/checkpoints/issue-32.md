# Issue #32 (Mapa de quem ficou em casa): checkpoints

Frames: "20 Mapa de quem ficou em casa (mosaico)" and "(mapa)" on the page "Election SPA v3" (they already existed; treated as approved). Entry point decided with the user:
a THIRD OPTION in the toggle of the Mapa por estado (Margem | Virada | Ficaram em casa), on the two existing pages and on the new one. Nothing else links to it (tested).

1. **Numbers and words, pure.** `lib/stay-home.ts` (share of each state's electorate that did not vote for anyone = `aptos - validos` over `aptos`, overseas `zz` never a state,
   the seven colour steps with fixed edges 17/20/23/26/29/32 so a colour means the same in every cycle and round, the claim of the measure note), `lib/sentences/catalog-stayhome.ts`
   (the `stayhome.*` sentences, both registers, loaded only by this screen's modules, like `catalog-duel.ts`), `lib/sentences/stayhome.ts`. Tests: `stay-home.test.ts` (including the six
   "Brasil (sem exterior)" lines of `docs/nonvoters-vs-margin.md`, 59,6 / 55,2 / 56,6 / 53,3 / 52,5 / 46,7 percent of the cities, and the 5.570 / 5.571 city counts, on the real
   dataset), `sentences/stayhome.test.ts` (neutrality: no winner, cause, effect or irregularity word in either register).
2. **Page, island, desktop fragment, toggle.** `StayHomePage.astro` (routes `/mapa/ficaram-em-casa/` = newest cycle round 1, and `/mapa/ficaram-em-casa/<ano>-<turno>/` for the other five),
   `StayHomeMap.tsx` (phone island: tile mosaic by default, SVG map after a tap on Mapa, legend, selected-state panel, claim, table), `StayHomeFragment.astro` + `pages/fragmentos/mapa-por-estado/ficaram-em-casa/<ciclo>/`
   (desktop, 1024 px up, a lazy iframe like the other two maps), `lib/stay-home-view.ts` (every sentence and number as a model of strings: the island gets it as props and does not carry the catalog).
   A tap on Mosaico | Mapa that lands while the island hydrates is kept by `map-pending.ts` (`data-pending-vista`) and applied with the address (tested by holding the island's file).
3. **Share image and events.** `lib/stay-home-card.ts` / `stay-home-content.ts` (a 1080-wide picture: title, cycle and round, the mosaic with a percentage on every state, the scale with its edges, the
   base, address, source), `StayHomeShare.tsx` (the existing `ShareActions`, `client:visible`, so the phone's first load does not carry React), events `stayhome_opened {ciclo, turno}`
   (page script `scripts/stayhome-analytics.ts`) and `stayhome_shared {ciclo, turno}`.

## The headline wording (what the measure supports)

From `docs/nonvoters-vs-margin.md`: only per cycle and round, with that selection's own number. The page prints, under the panel, "Em 46,7% das cidades, o número de pessoas que não votaram em ninguém foi
maior do que a diferença de votos entre os dois primeiros (2º turno de 2026)." followed by "A conta compara dois números da mesma cidade. Não diz quem são essas pessoas, em quem votariam, nem que o
resultado teria sido outro." The number is computed at build time by the same rule as `make nonvoters` (strictly larger; overseas out), and the real-dataset test pins all six lines of the note. There is
no one-line claim for the country, no "most cities", no per-state claim, no "would have decided". The share text and the picture carry only what the map shows, not the claim.

## Decisions and deviations from the frames

- **Six views, not two.** The frame draws two tabs ("2026 · 1º turno", "2022 · 1º turno"); the ticket says "each cycle and round", so there are six links, one row of two-line chips on the phone.
- **Three-option toggle.** The frame has none; the entry-point decision adds it (labels "Margem", "Virada", "Ficaram em casa" on the new page; the two existing pages keep their longer labels).
- **Teal scale.** Step 5 is `#38707d`, not the frame's `#43808c`: the paper ink on the frame's colour reaches only 4,2:1 (the dark ink 3,9:1), under the 4,5:1 of WCAG AA; this one reaches 5,2:1. The seven swatches live in
  `lib/stay-home.ts`, not in `shared/tokens.ts`: a token is inlined as CSS variables in the head of every page and the city card's html (6,4 KB budget) has no room for them (measured: +94 B).
- **Order and first selection** follow the size of the electorate (SP first), never the value: no ranking of states by how many stayed home.
- **Sentence of the legend** says what the frame says; the edges are printed with "%" under the swatches (six edges for seven steps; the frame prints five).
- **Nothing for desktop** was asked (no desktop frame): the fragment follows the two existing maps.
- Not done: facts records / "ver cálculo" for this screen (the G6 gate covers pages that have records; this one is a map, not a report). Needs a decision if the user wants them.

## Screenshot review (fixture state), Sketch frame vs render (390x844, capture `e2e/capture-ficaram-em-casa.spec.ts`)

| # | Location | Frame shows | Render shows | Severity |
|---|---|---|---|---|
| 1 | status bar, wordmark header | "Voto a Voto | Presidente 2026", 9:41 | absent (like the pages of the other two maps) | accepted-platform: prototype chrome |
| 2 | title row | Mosaico \| Mapa toggle at the right of the title | the toggle is a row of its own below the tabs | note: the three-option toggle must sit above it; same arrangement as /mapa/ |
| 3 | tab strip | two tabs | three options + six chips | note: product decisions above |
| 4 | tiles | 44 px at a 45 px pitch | 48 px at 49 px (the margin map's convention) | note |
| 5 | selected-state card | bordered rounded card | a rule above and plain text (as /mapa/) | note: same panel as the margin map |
| 6 | legend | 5 edges | 6 edges with "%" | note: seven steps need six |
| 7 | claim | not in the frame | one block under the panel | note: required by the ticket ("headline claim") |
| 8 | mosaic data | frame's sample numbers (SP 21,1%) | fixture states rj, sp, mt | accepted: different data state |
| 9 | consent banner | absent | drawn over the bottom in the fixture capture | accepted: same on every captured page |
Verdict: PASS (no code-fixable blocker left).

## Weight (phone, gzip, `scripts/measure.ts dist`, fixture build, before -> after)

| Page | JS | CSS | HTML | data |
|---|---|---|---|---|
| `/` | 3683 -> 3699 | 15779 -> 15823 | 8448 -> 8448 | 0 |
| `/rj/cidade-exemplo/` | 5100 -> 5116 | 15779 -> 15823 | 6482 -> 6482 | 0 |
| `/mapa/` | 2360 -> 2376 | 15779 -> 15823 | 7078 -> 7124 | 0 |
| `/mapa/virada/` | 2360 -> 2376 | 15779 -> 15823 | 7048 -> 7094 | 0 |
| `/mapa/ficaram-em-casa/` (new) | 2530 | 15823 | 9744 | 0 |

The growth of the existing pages: +16 B JS (the two new rows of `analytics/event-props.ts`, carried by every page's analytics script), +44 B of the shared CSS (the utilities of the new island), +46 B html on the
two map pages (the third link). The city card's html is byte-identical (6482). No budget changed. The new page's first load has no React: the map island is `client:interaction` and the share island `client:visible`.
