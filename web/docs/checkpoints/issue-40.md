# Issue #40 ("Usar minha localização"): checkpoints

1. **Centroids in the data build** (`src/voto_a_voto/centroids.py`, `data/centroids.csv`). The IBGE mesh service publishes the
   metadata of every municipality of a state, centre included (`/api/v3/malhas/estados/<code>/metadados?intrarregiao=municipio`):
   27 small files, fetched once into `.cache/ibge/`, then `centroids.csv` (`cd_ibge, lat, lon`, 5,570 rows, sorted, 4 decimals).
   The source is a new entry of `manifest.json` (`ibge_malhas_metadados`: url, retrieval time, files, rows, digest of the
   file hashes) and the table is hashed with the others, so `make data-check` covers it: every city with an IBGE code has
   a centre, every centre is a city, every centre falls inside Brazil. One documented exception: Boa Esperança do Norte/MT
   (5101837), created after the mesh IBGE serves, has none, so it is never offered as the nearest city. Offline runs and
   second runs ask IBGE nothing. The other tables are byte-identical to before.
2. **The shard and the lookup.** `centroids.json` (`{ uf: [[slug, lat, lon]] }`, 186 kB raw / 70 kB gzip, fetched only on the tap,
   in the fingerprint of the dataset) and `src/lib/nearest-city.ts` (haversine over the shard; "outside Brazil" is the bounding box of
   Brazil with a margin, or more than 250 km from every centre). Tests: fixed coordinates in rj, sp and mt on the real data, a point
   between two cities, Lisbon / Miami / Buenos Aires / Santiago / Bogotá / the Atlantic, and positions that are not positions.
   The IBGE source and the new table are on the data page (manifest list, "De onde vêm os números", licensing).
3. **The button.** `scripts/home-locate.ts` shows it only where the browser has a position API; the tap loads
   `locate-run.ts`, which asks (`locate-flow.ts`), loads the shard and opens the city, or shows one of four messages
   (denied, outside Brazil, unavailable, timeout; `locate-messages.ts`), each pointing back to the search and the states.
   Permission is requested only after the tap (a test asserts zero calls to the position API on load); the coordinates never leave
   `findMyCity` (its result is the city only), nothing is written to storage (a city opened this way is not saved as "Sua cidade":
   only a pick on Home saves, #35) and no request other than the static shard is made.
   Nearest means nearest centre: for a very large municipality its centre can be far from its town, so a position at the
   edge of one may open a neighbour. The data page says "a cidade mais próxima".

## Screenshot review (fixture state: nothing remembered, button offered), 390 wide, full page

Frame "1 Home, with the location button" (page "Election SPA v3", 390x916); capture `e2e/capture-locate.spec.ts`.

| # | Location | Frame shows | Render shows | Severity |
|---|---|---|---|---|
| 1 | button | 350x44 at y 198, 8 px radius, 1.5 px teal border, paper fill, teal "Usar minha localização" with a ring icon, centred | same box; text 15 px medium; the ring is an SVG, not the "◎" glyph (Hiragino fallback) | accepted-platform (glyph font) |
| 2 | note under the button | "Só pedimos depois do toque. Nada é guardado." 11 px muted at y 248 | same text at y 248, 12 px high | none |
| 3 | state hint and tiles | "Ou escolha um estado" at y 266, tile grid at y 284, "Para explorar" lower by the same 16 px as the frame | same y positions (measured: 266, 284) | none |
| 4 | status bar "9:41" | drawn | absent | accepted-platform (prototype chrome) |
| 5 | bottom of the page | footer only | footer plus the "Privacidade" link of the metrics notice (#20) | note (not in the Sketch frames) |
| 6 | the button before the script runs | drawn | hidden until the page script confirms a position API (no scripts: not shown) | note: with a remembered place, the "Sua cidade" block and the button push the tiles down once the script runs |

With both a remembered place and the button, the button sits 10 px under the "Sua cidade" block (no frame shows both; spacing taken from the same rhythm).
Verdict: PASS (no blockers).

## Weight (home, gzip, `scripts/measure.ts dist`, fixture build)

JS 3982 B (after #35) -> 4929 B: the page script 470 -> 1417 B because Vite adds its preload loader (about 0.9 kB gzip) to the
page script for a dynamic import; the code itself (`locate-run`, 0.6 kB gzip) and the 70 kB centre file are fetched only on the tap.
Inlining the code instead measured worse (5421 B), so the dynamic import stays. HTML 6604 -> 6806 B, CSS 12764 -> 12829 B.
Against the state before this milestone (JS 3114 B, HTML 6386 B, CSS 12681 B) the two tickets add 1.8 kB JS, 0.4 kB HTML and 0.15 kB CSS gzip.
