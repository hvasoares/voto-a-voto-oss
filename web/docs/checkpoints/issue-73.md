# Issue 73: Dados para nerds, foundation (panel catalogue, provenance footer, Placar)

Frame: "N3 Dados para nerds: estado (desktop)" (approved), compared at 1440x900 with the built page for Rio de Janeiro (fixture) and at 390x844.

## Checkpoints
1. Library: `src/lib/nerds/` (`panels.ts` record schema, closed kind registry, footer gate, specs; `catalog.ts`; `shards.ts` build-time reader; `url-state.ts`; `view.ts`).
2. Page: `components/nerds/{NerdsPage,PanelFrame,StatPanel,TablePanel}.astro`, routes under `pages/dados-para-nerds/`, `styles/nerds.css` (loaded by these routes only), page script `scripts/nerds-state.ts`.
3. Entry point on the Estado page (`data-link="nerds"`, between "Comparar com outro estado" and "Resumo do estado").

## Decisions and deviations
- Zero JavaScript by default; this ticket ships no island (stat and table render on the server). The three cycles are in the HTML (latest shown; `?ciclo=` shows another through a 1.3 kB page script;
  without scripts `<noscript>` shows all three). The test asserts no `astro-island` and no chart request at 390 and 1440 px; later tickets' islands are `client:media="(min-width: 1024px)"` + `client:visible`.
- Registry: `bar | line | histogram | heatmap | map` are declared and fail the build ("kind ... has no renderer") until their tickets add a renderer.
- Footer gate: four fields exactly (a fifth is refused), `fonte` must carry `{edicao}` (the page writes "edição 26/10/2026 (2026-10-26)"), title must be a question. The same record schema builds a candidatos-family fixture as a table.
- Shards are pinned: a shard whose edition/hash differs from the edition the site shows stops the build.
- **Seções apuradas**: the dataset has no section counts, so the Placar card says "não consta nos dados publicados" instead of a number (ticket asks for the measure; it cannot be built from the committed data).
- Placar prints exact integers for eleitorado ("442.265", not "442,3 mil") and percent with the absolute figure beside it, so a test can compare text with the shard; the frame abbreviates ("36,4 mi").
- Fact records (G6): not added; the dashboard has its own provenance footer and the #77 contracts. Say so if the user wants fact records for these numbers too.
- Design tokens only (no Tailwind utilities in the new components), so the shared stylesheet is unchanged: global.css 16,353 B gzip before and after; nerds.css is 1,544 B gzip, on dashboard pages only.

## Screenshot review (1440x900 vs N3, after fixes)
| # | Difference | Severity | Where | Handling |
|---|---|---|---|---|
| 1 | Placar was inside a bordered card; the frame has none | medium | Placar | fixed (stat panels have no card) |
| 2 | Values serif; frame is sans bold, 1º turno teal, 2º turno amber | medium | Placar cards | fixed (labels "1º turno/2º turno" keep colour from being the only cue) |
| 3 | Sinais strip, Citar/CSV/Imagem, "Citar esta página", other panels, Invariantes absent | n/a | page | later tickets (#77, #79, #75-#78) |
| 4 | Cycle chips and "Presidente 2026" heading are not in the frame | low | under "Como ler" | kept: the address is the only state, so the cycle needs a control and the no-JS page needs a heading per cycle |
| 5 | "Como ler" is a one-line bar with the note on the right; here a collapsed `<details>` | low | header | kept (collapsible, as the ticket says) |
| 6 | Breadcrumb trail beside the back link (frame has only the back link) | low | header | kept (#74 asks for a breadcrumb) |
| 7 | Values exact, frame abbreviated | low | Placar | deliberate, see above |

## Measured (fixture build, `scripts/measure.ts`)
- Estado page `/rj/` at 390x844 and 1440x900: JS 4,859 / 82,861 B gzip and CSS 16,353 B gzip unchanged; HTML gzip 7,858 -> 7,883 (+25 B, the one link).
- New page `/dados-para-nerds/estado/rj/`: 390x844 JS 1,863 B, CSS 17,897 B (global 16,353 + nerds 1,544), HTML 4,984 B gzip (three cycles of Placar); 1440x900 JS 2,322 B. No chart library, no island.
