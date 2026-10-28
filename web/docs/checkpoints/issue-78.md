# Issue 78: Dados para nerds, map panel

Frames: the map panel of "N1/N2/N3" (map, legend, chips, municipality slot), compared at 1440x900 (Mapa | Escada side by side, as in the frames).

## What was built
- Record `mapa` (kind `map`, `shard: 'ciclos'`, options read from the record): `lib/nerds/mapa.ts` (`buildMapa`, `shading`, `stepOf`) - five equal whole-point steps over the values of the places shaded, with the numeric legend ("até 80%", "80–82%", ... "86% ou mais").
- `components/nerds/MapaPanel.astro` draws the static inline SVG with the existing `UfMap.astro` (the same 27 outlines as Home / Mapa por estado; the only change there is an optional `hrefFor`): every state that has a page is a link with a title and a text label
  (abbreviation + value; callouts for the small coastal states), the legend prints its steps, Brasil has the five region chips (value printed, link to the região page; Exterior is not a chip). Região: its UFs shaded and linked, the rest neutral, unlinked.
  Estado: a slot ("Mapa dos municípios", link to `/mapa/<uf>/` when that page exists, link to the table).
- Island `MapaEnhancer` (client:panel: 1024 px and up, in view): measure and turno pickers, recolouring, a read-out of the state under the pointer or the keyboard focus, choice kept in `?medida=&turno=`, cycle from `?ciclo=`. `data-drawn` = key of the view on screen.
- Page layout: the cycle blocks and the series dissolve into one grid (`display: contents` + `order`) so the panels follow the frames' order (Placar, Mapa | Escada, Tabela, Invariantes).

## Decisions
- The Região view uses the grouping of #71 (region membership) only for the chips; no second geometry is drawn.
- The estado "slot" loads nothing (a link and a text), so "loads only at 1024 px and only when visible" holds trivially; without scripts it shows the link to the table.
- Phone cost of the inline SVG (Brasil, fixture): 15,426 B raw / 5,230 B gzip, plus about 3 kB gzip of view data in the island props. No existing phone page changes. The dashboard is a new page and is table-first; I kept the SVG inline (a link-map is useful with scripts off and on a phone) instead of a media-gated fragment: **decision for the user** if +5 kB gzip on this page is too much (the fragment pattern of #53 would remove it).
- Colour: a 5-step teal ramp; every state also prints its value; the legend prints the steps; the shading does not order places.

## Screenshot review (1440x900 vs frame)
| # | Difference | Severity | Handling |
|---|---|---|---|
| 1 | Measure/turno are chip groups, the frame has dropdowns | low | kept |
| 2 | Value label of SP is partly covered by the PR outline (existing UfMap label placement) | low | not changed (shared component) |
| 3 | Actions row (Citar/CSV/Imagem) absent | n/a | #79 |
