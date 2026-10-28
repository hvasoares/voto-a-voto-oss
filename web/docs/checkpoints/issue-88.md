# #88 Touch targets >= 44 px: notice/footer anchors and the small shapes of the state map

## Probe
`e2e/tap-targets.spec.ts` (phone 390x844, 12 tests, 10x repeat = 120 passed). Every visible link/button/summary/input is scrolled to mid-screen and its REAL hit area is measured with `document.elementFromPoint` going out from the centre (every line box of a wrapped inline link), so padded anchors, hit layers and pseudo-elements count the way a finger finds them. Home with the notice open, Home with search results, `/mapa/` (mosaic and `?vista=mapa`), `/mapa/virada/?vista=mapa`: zero targets under 44 px high. Also: footer lines >= 44 px, gap >= 8 px between footer links, notice link does not touch "Prosseguir", axe with target-size (Home: clean; map view: only the two older findings `label-content-name-mismatch` and `nested-interactive`, identical before this ticket, left alone).
Before (same probe on the old code): "Sobre os dados ›" 16, "Edição" 16, "Privacidade" 16, "Detalhes em Sobre os dados" 16 (two line boxes), map-page "Sobre os dados ›" 16 and "Tabela por estado" 22.

## Text anchors (what changed)
| where | before | after | how |
|---|---|---|---|
| Home "Sobre os dados ›" (footer, `pages/index.astro`) | 16 | 44 | `inline-flex min-h-11 items-center` on the anchor; footer `pb-6 pt-2` -> `pb-2` |
| `/mapa/`, `/mapa/virada/`, `/mapa/<uf>/` footers | 16 | 44 | same classes |
| "Edição ..." / "Privacidade" / "Apoie o projeto" (`layouts/Base.astro` consent-footer, `DonationLink.astro`) | 16 | 44 | same classes; line `pb-6 pt-2` -> `pb-3`: footer line was 49 px, now 56 (+7 px) |
| "Detalhes em Sobre os dados" (`ConsentBanner.astro`) | 16 | 45 | `-my-3.5 inline-block py-3.5 underline` (padding offset by equal negative margin: paragraph lines unchanged); gap above Prosseguir `gap-2` -> `gap-4` so the hit areas do not touch (banner +8 px) |
| map "Tabela por estado" summary | 22 | 44 | `py-3`, details `pt-2` removed |
For #90 (notice restyle): the only touched lines of the notice are the `<a>` class (`-my-3.5 inline-block py-3.5 underline`) and the container `gap-4`; keep both or keep 44 px. For #99 (Home): only the source footer's `pb-2` and the anchor's `inline-flex min-h-11 items-center` changed; markup otherwise untouched.
Other pages' source footers ("Fonte: TSE ... Sobre os dados ›", about 30 pages) still have 16 px links: out of the ticket (Home, notice, map). Needs a decision (a shared footer component would fix all).

## Map (phone, vista=mapa; SVG 350 CSS px over a 486-unit viewBox, 44 px = 62 units)
Design: (1) invisible hit path per shape smaller than 62 units in either direction: its outline with a transparent round stroke (`pointer-events: all`, `aria-hidden`, not focusable), drawn BELOW every visible shape, so it only claims empty space and never a neighbour's drawn area; (2) callout rows are 62 units (44.6 px) tall, touching, the hit rectangle spans the whole row (box drawn 54 units); (3) Acre's callout moved from on top of AC/AM/RO to the empty corner below (it covered Rondonia and Amazonas, and its row would have taken more of them). Keyboard: anchors unchanged (tab order, focus ring follows the anchor: tight on a shape, around the row on a callout); hit paths are outside any anchor. `lib/map-hit.ts` has the geometry. The map is 51 px taller on the phone (395 -> 446 px; `maxHeight` dropped so the scale stays 350/486).
Measured on the REAL outlines (`e2e/real-data-mapa-toque.spec.ts`, 27 states, 10x clean; margin and virada views identical). Sizes in CSS px; "own square" = largest square a state owns by `elementFromPoint` on a 1 px grid.
| uf | drawn before | hit path after | callout row | own square, shape side | own square, callout |
|---|---|---|---|---|---|
| ac | 51x29 | 67x45 | 63x45 | 21 | 44 |
| al | 21x12 | 54x45 | 63x45 | 15 | 44 |
| ce | 29x36 | 45x52 | 63x45 | 17 | 45 |
| df | 7x4 | 48x45 | 63x45 | 3 | 45 |
| es | 15x24 | 45x54 | 63x45 | 18 | 44 |
| pb | 27x16 | 56x45 | 63x45 | 6 | 45 |
| pe | 46x16 | 74x45 | 63x45 | 10 | 45 |
| rj | 27x19 | 53x45 | 63x45 | 14 | 45 |
| rn | 25x15 | 55x45 | 63x45 | 22 | 44 |
| sc | 38x24 | 59x45 | 63x45 | 19 | 44 |
| se | 13x14 | 45x47 | 63x45 | 7 | 45 |
| ap | 35x41 | 45x51 | - | 19 | - |
| rr | 41x49 | 45x53 | - | 22 | - |
| pi | 39x59 | 45x65 | - | 18 | - |
| to | 35x60 | 45x70 | - | 26 | - |
| ro | 49x41 | 53x45 | - | 24 | - |
| pr | 46x30 | 61x45 | - | 21 | - |
| sp | 62x40 | 67x45 | - | 21 | - |
| am, ba, ma, mg, ms, mt, pa, go, rs | >= 49x48 | unchanged (already >= 44 in both directions or hit path hidden) | - | 22 to 50 | - |
HONEST LIMIT: every shape's hit bounding box is >= 44x44, every centre reaches its own state, and no tap on a drawn shape is taken by another state's invisible area (0 interior points stolen, 27 states). But the invisible margin of the east-coast states (PB, PE, DF, SE, AL) can only claim the sea that exists, because every other direction is a neighbour's drawn area, which must not be taken (DF is enclosed by GO: no sea at all). So the 44x44 EXCLUSIVE target of those states is their callout row (the 11 callouts all own a 44x45 square); on the shape itself the own square is smaller (table). If the user wants more on the shapes, the options are a zoomable map or letting tiny states overlap neighbours' borders: product decision.
Tests: `lib/map-hit.test.ts` (geometry of all 27), `StateMapMap.test.tsx` (hit layer before every drawn shape, aria-hidden, a tap on a hit path or a row margin selects), fixture e2e (RJ/SP/MT: hit box, row, centres, stolen = 0, tap on the big states, tap on the row margin), real e2e (above). `map-pending` untouched: the SVG view exists only after hydration; map specs (mapa, mapa-uf, mapa-rj, mapa-ficaram-em-casa, desktop-map, desktop-mapa) 10x green.
Municipality map (`CityMapMap`): same pattern (anchors on shapes, list rows below); municipality shapes are hundreds per state and many are a few px, so it has the same problem on a larger scale. Not fixed (ticket text is about the state shapes); the list under the map is the touch alternative. The desktop fragment map (`UfMap.astro`, >= 1024 px, pointer) is untouched.

## Bytes
Shared CSS (gzip): 15328 B (after #86) -> 15284 B (room 1100 B of 16384). Home html 8377 -> 8364 B; city html 6489 B (budget 6554). `mapa/index.html` 7089 B; StateMapMap island 3971 B (4.8K with client). No other page's first load changed in JS or CSS. `check:perf` green.

## Screenshots (untracked, `ux-review/2026-10-27/`)
`88-depois-home-aviso.png`, `88-depois-home-fim.png`, `88-depois-home-fim-aviso.png` (390x844 at 2x), `88-antes-mapa27.png` / `88-depois-mapa27.png` (map with all 27 states from a harness, 350 px wide), `88-depois-foco-al-shape.png`, `88-depois-foco-se-callout.png` (focus rings). Differences: notice +8 px with the link underlined as before; footer lines 7 px taller; map taller by 51 px, callout boxes 54 units tall, Acre's box below its shape.

## Sketch
Not updated. Map frames "10 Mapa por estado (mapa)" 9D218792 and "10b ... (mapa)" 72950054 (v3) show the old callout column (pitch 55, Acre on top of the shape): intended difference above. Footer/notice differences are 7-8 px. Needs the user's decision whether to redraw the two map frames.
