# Issue 71: Dados para nerds, região outlines

## Frame

The map area of "N1 Dados para nerds: Brasil (desktop)" and "N2 ... região (Sudeste)" (page "Election SPA v3 desktop", approved). The dashboard map panel itself is #78; this
ticket ships the geometry it will draw, so the screenshot review of the map area is done there against the same frames (the geometry fixture page is not the panel).

## Checkpoints

1. Data: `data/geo/regions.json` (membership of the 27 UFs in the 5 regions), written by the same `voto-data outlines` task, listed in `data/geo/manifest.json`, checked by
   `make data-check` (`outlines.check_regions`: file hash and size, exactly five regions, every UF in exactly one: none missing, none extra, none twice).
2. Rendering: `src/lib/region-map.ts` groups the projected UF shapes of `loadUfMap()`; `components/RegionMap.astro` draws five linked shapes (title + text label);
   fixture page `/dados-para-nerds/geometria/` (linked from nowhere) draws the region SVG and the UF SVG side by side.

## Decisions

- No second geometry: a region is its states' paths concatenated, so "the region outline is exactly the union of its states" holds by construction and is asserted
  twice (vitest on the path data, e2e on the rendered DOM at 1440 px with JavaScript off).
- The second run changes no bytes: the same `write()` that wrote the outlines now also writes `regions.json`; unchanged bytes return "unchanged" (pytest).
- Region links point to `/dados-para-nerds/regiao/<regiao>/` (the addresses of #74); until then the fixture page is the only place the SVG is drawn.
- Styles live in `src/styles/nerds.css`, imported by dashboard routes only (the shared stylesheet has no room).

## Measured

Region SVG HTML: 10,319 bytes raw, 3,982 bytes gzip. Included on no phone page; only on the fixture page and, from #78, on the dashboard (desktop media-gated).
