# Issue 54: Mapa por estado: SVG map on desktop

## Frames

"10 Mapa por estado (desktop)" and "10b Mapa por estado: virada (desktop)" on the Sketch page "Election SPA v3 desktop", taken as approved. ("10b" was
compared through the same layout: its frame differs by the tab, the legend and the sentence.)

## Delivery

Same decision as #53 (docs/checkpoints/issue-53.md): the desktop body is the document of a lazy iframe drawn only from 1024 px up
(`/fragmentos/mapa-por-estado/margem/` and `/virada/`, pre-rendered, `noindex`, linked from nowhere). Inline it would have put the map, the legend, the panel
and their markup (about 8 KB gzip) in the HTML of a phone that shows the tile mosaic. The page keeps the heading and, below 1024 px, the island with the mosaic (#11).

Deviation from the ticket text: "one small island with `client:media`" is the inline script of the fragment document (about 1 KB, no request of its own, no React), not an
Astro island: an island puts the astro-island runtime and its props in every phone's HTML. It exists only where the iframe is drawn, so it "loads only at 1024 px
and up" (asserted by `e2e/desktop-mapa.spec.ts` at 390, 768, 1023 px (no request for the document) and 1024, 1440 px (one request, no script file)).

## What is built

- `src/lib/state-map-panel.ts`: per state the colour step (the mosaic's own `marginBin`/`swingBin`, so "the same diverging scale as #11"), the printed value, the label, the
  two sentences of the panel (the phone's `SelectedDetails` now calls the same `panelLines`: the two layouts cannot say different things).
- `components/UfMap.astro` takes the cells: fill, value printed in the shape (abbreviation and value, ink chosen by contrast) or in the callout ("RJ -6,2").
- `components/MapaEstadosFragment.astro`: tabs (Margem | Virada, real links), map, selected-state panel (default: the state with most valid votes), "Abrir estado", numeric
  scale with the equal-size note, and the table alternative (`<details>`, every row a link).
- Hover (`mouseenter`) and keyboard (`focus`, arrow keys to the nearest state in that direction) fill the panel and Abrir estado; without scripts the panel keeps its default state
  and every link works (asserted at 1440 with JavaScript disabled).
- The third tab "Ficaram em casa" is #32's: not drawn.

## Screenshot review (1440x900, fixture state; capture: `e2e/capture-desktop.spec.ts`, names `mapa` and `mapa-virada`)

| # | Location | Frame shows | Render shows | Severity |
|---|---|---|---|---|
| 1 | tabs | three tabs, the third "Ficaram em casa" | two tabs | accepted: #32's view is not built (the ticket says so) |
| 2 | map | 27 coloured shapes, value inside or in a callout | same, drawn from the IBGE outlines; the fixture colours three states (the others are neutral: no data) | accepted-platform / fixture |
| 3 | panel | "SP · selecionado", 44 px value, two sentences, hint, Abrir estado | same layout; the fixture selects RJ (most valid votes of the fixture); the real build opens on SP | accepted: data |
| 4 | scale | 7 steps with -30 ... +30 | same (margin) and the swing scale on 10b | none |
| 5 | value signs | "−7,7" with the typographic minus | "-7,7" (the site-wide formatting of `formatSwing`, pinned by the real-data tests) | accepted: the site's number format |
| 6 | callout key colours | key square carries the colour | same | none |
| 7 | table | no table in the frame | `<details>` "Tabela por estado" under the map (the ticket requires a list alternative) | accepted: requirement |

Verdict: PASS.
