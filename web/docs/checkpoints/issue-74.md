# Issue 74: Dados para nerds, Brasil and região levels, URL state, entry points

Frames: "N1 ... Brasil (desktop)" and "N2 ... região (Sudeste)", compared at 1440x900 and 390x844 (the page of #73 at the other two levels).

## What was built
- The same `NerdsPage.astro` serves `/dados-para-nerds/` (Brasil), `/dados-para-nerds/regiao/<regiao>/` and `/dados-para-nerds/estado/<uf>/`; the level is a prop and `loadPlace(level, id)` loads that level's shards
  (vitest asserts the three routes import the one component and the loader returns different shards).
- Breadcrumb (Brasil › Sudeste › Rio de Janeiro), the "‹ up" link and "links down" (Brasil: regiões then estados; região: its estados) are plain anchors: tested with JavaScript off.
- The address is the only state: `?ciclo=&turno=&cargo=`; `url-state.ts` round-trips it, an unknown value falls back to the latest cycle (and turno 1, Presidente) with a visible note; nothing is written to local/session storage or cookies (tested on three addresses).
- Entry points (decided with the user, nothing else): "Dados para nerds ›" under the heading of "Brasil e regiões" and one "Dados da região ›" anchor on each região row (only regions that have shards, i.e. every row the page shows); "Comparar regiões" stays a sibling in the "Próximo" nav. Top bar and Home unchanged (asserted).

## Screenshot review: same differences as #73 (Sinais, actions, other panels come with their tickets); extra: the breadcrumb repeats the up link on the region page (low, kept: #74 asks for both).

## Measured (fixture build)
- "Brasil e regiões" at 390x844: JS 1,863 B, CSS 16,353 B gzip unchanged; HTML gzip 4,148 -> 4,216 (+68 B: one top link and two region links in the fixture; about +120 B with the five real regions).
- At 1440x900: JS 2,322 B, CSS 16,353 B unchanged.
- Dashboard pages at 1440x900 (budget recorded): Brasil/região/estado, HTML 4.9 kB gzip each (Placar x 3 cycles), JS 2.3 kB (page script + shell), CSS 17.9 kB (shared 16.4 + nerds 1.5). The next tickets' islands are budgeted in their own notes.
