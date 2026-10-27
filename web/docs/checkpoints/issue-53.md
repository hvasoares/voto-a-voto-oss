# Issue 53: Home SVG state map with UF outlines (desktop)

## Frame

"1 Home (map version)" does not exist as a frame of its own: the Sketch page "Election SPA v3 desktop" has "1 Home (desktop)", which already
draws the SVG map of Brazil (27 shapes, abbreviations, key squares and leader lines for CE RN PB PE AL SE DF ES RJ SC and AC). That frame was taken as
the approved "map version" and the render is compared with it. Nothing was created in Sketch.

## Checkpoints

1. Data half: `voto-data outlines` / `make data` / `make data-outlines` (`src/voto_a_voto/outlines.py`), `data/geo/uf-outlines.json` + `data/geo/manifest.json`
2. Rendering half: `src/lib/uf-map.ts` (projection, callouts), `components/UfMap.astro`, the fragment document and the Home picker

## Data half

- Source: IBGE malhas API v3, `/malhas/estados/<code>?qualidade=intermediaria` (the service and quality of the municipality maps of #16/#17), 27 files
  cached in `.cache/ibge/uf-<code>.geojson` (+ `.meta.json` with the retrieval moment), retrieved 2026-10-27.
- Processing: outer rings, Douglas-Peucker 0.1 degrees, rings under 0.1 square degrees dropped (the largest always kept), 3 decimals, sorted by IBGE code.
- Idempotent, cached: a second run asks IBGE nothing and changes no bytes (tests: `tests/unit/test_outlines.py`, `tests/integration/test_voto_data_cli.py`).
- Hashed: `data/geo/manifest.json` records the source (url, retrieved_at, digest of the 27 payloads), the processing and the size and SHA-256 of the file.
- Checked: `make data-check` runs `outlines.check` (hash and size, exactly the 27 codes: no missing, no extra, no overseas; closed rings; points inside Brazil).
- The file is outside the six files of an edition (geography, not results): refreshing it never forces a new edition.

## Delivery decision (phone cost)

Measured on Home at 390x844 with the map inline: HTML gzip 7,704 -> 12,910 bytes (+5.2 KB; 0.015 degrees tolerance gave +10 KB). The budget set after
this first measurement was +2 KB of phone HTML for the whole feature; it was exceeded by 2.5x, so, as the ticket says, the desktop view is delivered by a
media-gated lazy fragment: `src/pages/fragmentos/mapa-uf/` (a small static document with the inline SVG, no script, `noindex`, linked from nowhere) in an
`<iframe loading="lazy">` that exists only from 1024 px up (`display:none` below). A lazy iframe that is not drawn is never requested (asserted at 390, 768 and
1023 px). Browsers without lazy iframes would fetch it anyway; that costs the phone only on such old browsers. Phone after the change: HTML 8,382 (the iframe
tag plus the theme variables that moved from the style sheet into the HTML: CSS 14,297 -> 13,742), JS identical, no new request.

## Screenshot review (1440x900, fixture state: rj, sp and mt have pages; capture: `e2e/capture-desktop.spec.ts`)

| # | Location | Frame shows | Render shows | Severity |
|---|---|---|---|---|
| 1 | map, shapes and labels | 27 neutral shapes, abbreviations inside | same; outlines simplified at 1 px | accepted-platform (real IBGE geometry vs the frame's hand-traced shapes) |
| 2 | callouts | key square, label, leader line for 10 coastal states, Acre at the left | same states, same order top to bottom; Acre's leader line is steeper | accepted: line anchors are the state's centroid |
| 3 | map position | x 770 to 1320, top at y 170 | x 760 to 1320, top at y 170 | none |
| 4 | right column heading | "Ou escolha um estado. Clique para ver os municípios." | same | none |
| 5 | left column | as #51 | as #51 | see issue-51.md |

Verdict: PASS (no open code-fixable difference).
