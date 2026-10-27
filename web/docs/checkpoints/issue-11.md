# Issue #11 (map by state: margin and swing, screens 10/10b) : checkpoints

Each checkpoint: failing/behaviour tests first, implement, green, commit. Screenshot review
protocol: `../site/docs/screenshot-review-protocol.md`. Every figure on the page is computed at
build time from the dataset (`DATA_DIR`) by the pure module `src/lib/margins.ts`; nothing in the
browser parses a CSV, and no election number is hard-coded outside committed fixtures/tests.

Screens: `/mapa/` (frame "10 Mapa por estado") and `/mapa/virada/` (frame "10b virada"), each with
the "Mosaico | Mapa" alternation (`?vista=mapa` swaps the pre-rendered mosaic for the inline-SVG
choropleth when JavaScript is on). Colour comes from the Sketch diverging swatches
(`div-neg-3..div-pos-3` in tokens), centred on zero, with the signed value on every tile and a
numeric legend; a sortable table is the non-colour alternative.

1. **Numbers + geometry: pure modules committed and pinned.** `src/lib/margins.ts` (pure, no HTML,
   no store): aggregates turnout and votes per UF for one cycle, derives the runoff pair from the
   round-2 data itself (top two candidates by valid votes; ties by number; the "Lula side" is the
   pair member that leads nationally in the round 2), computes `margin1`, `margin2` (exact pp of
   valid votes) and `swing = margin2 - margin1` on the unrounded margins, and the national row
   (UF `zz` excluded). `src/lib/scale.ts`: diverging bins for margin (-30/-15/0/+15/+30) and swing
   (0/+2,5/+5) and the pt-BR pp formatter. Fixture-geometry: `src/lib/uf-polygons.ts`, generated
   once by `scripts/generate-uf-polygons.ts` from the IBGE state mesh (API v3, quality "minimum",
   downloaded 2026-10-26), simplified with Douglas-Peucker (0.08°) and projected equirectangular
   (x scaled by cos of the mean latitude); provenance in the file header; the committed module is
   the shipped artifact, the build needs no network. Tests: fixture-driven (synthetic arrays) plus
   figures pinned to the real `data/*.csv` (SP -7.7/-13.7/+6.0 with 26.258.452 valid votes, MG the
   only flip, RJ +7.4/AL +7.3/SE +6.9/PB +6.7/RN +6.5/RO +2.3/AC +2.7/SC +2.8 per the highlights
   note).

   Status: DONE — commit "web: margins, diverging scale and committed UF geometry for the state map
   (issue-11 checkpoint 1)".

2. **Both pages + island + analytics + e2e + captures.** `src/components/StateMapMap.tsx` (one
   island for both routes, server pre-rendered so the mosaic is plain HTML): Mosaico/Mapa toggle,
   tile grid (size = valid votes, min 40px edge at 390px), SVG map view with callouts for the small
   UFs, numeric legend, sortable table, selected-state panel ("Votos válidos (2º turno)", both
   margins in margin view; both margins and the variation in swing view), "Abrir estado" button.
   Analytics `map_view {view}` and `map_state_tap {uf}` through `@site/analytics`. Pages
   `mapa/index.astro` and `mapa/virada/index.astro`; footer "Fonte: TSE, dados finais · Sobre os
   dados ›". E2e (phone, fixture state; real project for the real numbers), plus captures at
   390x844: mosaic, map, legend, no-JS, real dataset (`.captures/mapa/`).

   Status: DONE — `web: state-map pages /mapa/ and /mapa/virada/ with the island (issue-11
   checkpoint 2)`.

   Implementation notes (the interaction model of the home page, applied here):
   - `client:interaction` hydrates the island on the first interaction, so `scripts/map-pending.ts`
     (page-level, both routes) keeps the first tap: pointerdown records the UF on the island host
     (`data-pending-uf`), the click is prevented from navigating (the frames say a tap SELECTS) and
     the island honours it right after hydration. Without JavaScript nothing runs and the tiles
     stay plain links. The same script plays a synthetic pointerdown when the deep link
     `?vista=mapa` opens straight into the map view.
   - The pre-rendered markup is always the mosaic; `?vista=mapa` is honoured on hydration (no SSR
     mismatch), so `?vista=mapa` without JavaScript keeps the mosaic (the noscript note says the
     map view needs JavaScript). The "Mosaico|Mapa" anchors carry `?vista=mapa` so the state works
     as a plain link too.

   Deviations from the frames / contract, deliberate:
   - The smallest mosaic tile is 40px (TILE_MIN in `src/lib/scale.ts`), slightly under the 44px
     tap standard: the edge ENCODES the valid votes (sqrt scale 40..48); 48px is the largest that
     fits 7 columns in 390px at 1px gaps, and the table below repeats every row as text.
   - The pre-rendered table is sorted by valid votes (frames list states by turnout); in-table
     sorting stays a hydrated affordance of a later polish (the rows are links meanwhile).
   - Callout boxes are rendered at ~33px effective height (SVG leader-line boxes, as in the frame);
     the 44px tap rule is kept by "Abrir estado", the tabs, the tiles and the toggle.
   - Fixture screenshots show "Candidato sobre Candidato" (and duplicate names on tiles): the
     fixture candidates.csv names both candidates "Candidato A/B", so `shortName` collapses both to
     "Candidato". The real dataset shows "Lula"/"Flavio" as in the frames.

## Neutrality and a11y notes

- Candidates named from `candidates.csv` (`displayName`, short form "Lula"/"Flavio"); colours carry
  the same meaning as the sign, never alone: every tile/map label carries the signed value, the
  legend is numeric, map callouts repeat "UF value", and selected-state sentences state both rounds.
- All states move toward Lula between rounds in this dataset, so the swing legend shows the
  "Sem estados com variação negativa" note of the frame; the bins still handle negatives.