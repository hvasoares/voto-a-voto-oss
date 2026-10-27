# Issue #16 (municipality map for one state: Rio de Janeiro) : checkpoints

Route `/mapa/rj/`, the drill-down the state map promises: the margin of the runoff round per
MUNICIPALITY, in the same interaction model of `/mapa/` (#11) — a pre-rendered list (rows, like the
mosaic's tiles) and, with JavaScript, a `Lista | Mapa` alternation (`?vista=mapa` deep links). The
module shape is state-agnostic on purpose: `city-map-data.ts` is keyed by `uf` + `cd-municipio` and
`public/geo/municipios-<uf>.json` by the 7-digit IBGE code, so #17 (the other UFs) reuses both as
is — the page file is the only `rj`-specific piece.

1. **Numbers + geometry: pure modules committed and pinned.** `src/lib/margins-city.ts`
   (`computeCityMargins`): reuses the national pair derivation of `src/lib/margins.ts` (`computeMargins`,
   the same pair as the two state-map pages), aggregates per `cd_municipio` within one UF; margin
   null when the round has no valid votes or no pairing (the row stays, without fill); `swing` on the
   unrounded margins; ignores other UFs, overseas posts and TSE codes cities.csv does not list.
   `src/lib/city-map-data.ts`: build-time assembly (`loadCityMapData(uf)` + pure `cityMapData`),
   names of the pair via `shortName`/`displayName`. `src/lib/municipality-geo.ts`: validating parser
   of the committed mesh (provenance, closed rings, 7-digit codes prefixed by the state code).
   Geometry: `public/geo/municipios-rj.json`, generated once by
   `scripts/generate-municipality-polygons.ts <geojson> <uf>` from the IBGE malhas API v3
   (`https://servicodados.ibge.gov.br/api/v3/malhas/estados/33?formato=application/vnd.geo%2Bjson&intrarregiao=municipio&qualidade=intermediaria`,
   downloaded 2026-10-26; "intermediaria" = 6,556 points vs 1,685 at "minima" — minima was too blocky
   for the 92-municipality silhouette). Largest ring only, Douglas-Peucker at 0.008° (adaptive
   fallback for the smallest shapes), equirectangular (x scaled by cos of the mean latitude, 90
   px/degree), keys = 7-digit IBGE codes, provenance header in the file; the committed file is the
   shipped artifact and the build needs no network (regeneration is byte-identical, `cmp`-verified).
   Tests: fixture-driven (synthetic UFs: swing/margins/null pairing/one-sided pairing/ignored codes)
   plus figures pinned to the real `data/*.csv` per the highlights note — Campos -15,8pp/+9,8 swing,
   Barra do Piraí -5,1 → +4,2 (swing +9,3), Belford Roxo +8,6 swing, Rio +3,1pp on 3.683.589 valid
   votes (swing +7,0); the 92 city rows aggregate back to the state row of #11 (RJ -6,2pp).

   Status: DONE — commit "web: municipality map data half … (issue-16 checkpoint 1)".

2. **Page + island + e2e + captures.** `src/components/CityMapMap.tsx` (server pre-rendered; the
   LIST view is the no-JS markup): one row per municipality (chip + name + signed pp + valid votes,
   ordered by round-2 valid votes), `Escala` legend with the #11 numeric edges and the without-fill
   counts, selected-municipality panel (big pp, valid votes, both margins and the variation, "Abrir
   cidade"), `Lista | Mapa` toggle with `?vista=mapa` in the URL. The map view fetches the committed
   mesh (`GET` to the site origin, only when a visitor opens the map, abortable), joins by the 7-digit
   IBGE code, and draws an SVG choropleth with pan (pointer drag ≡ tap below 6px), zoom (buttons +
   keyboard, 1.6 steps up to 12x), inline labels on shapes big enough at the current zoom, muted fill
   for null margins/unmatched shapes (counted in the legend's notes). `scripts/map-pending.ts`
   generalized: a pre-hydration tap on a row/shape records `data-pending-cd` on the island host
   (the never-lost-tap model of #11), honoured and deleted after hydration. Page
   `mapa/rj/index.astro` (lead names Lula/Flavio over 92 municípios; footer "Fonte: TSE, dados finais
   · fronteiras: malhas do IBGE · Sobre os dados ›"). Analytics: `map_view {view}`,
   `map_municipio_tap {cd}`. E2e: `e2e/mapa-rj.spec.ts` (fixture phone), `e2e/real-data-mapa-rj.spec.ts`
   (real numbers, join equality, on-demand GET allow-list, mesh load+render ~0.1–0.3s in-record),
   `e2e/capture-mapa-rj.spec.ts` (390x844 real captures: `.captures/mapa-rj/{lista,mapa,selecionado}.png`).

   Status: DONE — commit "web: /mapa/rj/ page and CityMapMap island … (issue-16 checkpoint 2)".

   Deviations from the frames / parent plan, deliberate:
   - The ROUTE is `/mapa/rj/` (the ticket's own placeholder page): ticket #50 will port the state
     page and host this island under `data-placeholder="state-map"`; until then this is the state's
     route, and the state pages themselves are untouched.
   - The pre-rendered view is the LIST (not a mosaic): 92 tiles of a mosaic would not fit or read on
     390px; the list is the same non-colour alternative the state map's table offers, one link per
     municipality, all figures as text.
   - Geometry checks live in the web vitest suite (`municipality-geo.test.ts`: provenance, 92-shape
     join with cities.csv, bbox/closed-ring invariants, geography pins) and a manual byte-identity
     regeneration run — NOT in `make data-check`/`voto-data check`, which stays about the TSE dataset;
     the mesh is IBGE-derived, not TSE-derived.
   - `fgOf` moved from the island (`StateMapMap.tsx`) to `src/lib/scale.ts` (single source; behaviour
     identical), because the municipality shapes label with it too.
   - No link TO `/mapa/rj/` was added on `/mapa/` (that file is out of this ticket's scope per the
     ticket rules: "the #11 pages are live"): the drill-down is reachable by URL; the parent may wire
     a link on the state map page.

## Neutrality and a11y notes

- Colour never alone: the signed pp is on every list row, on shapes large enough at the current zoom,
  in the aria-label of every row/shape (`valueText`), in the panel sentences (both rounds and the
  variation), and the legend carries the numeric bin edges.
- Municipalities without pairing and mesh shapes without dataset rows stay WITHOUT fill and are
  COUNTED in the legend's note ("Sem cor: N municípios sem dados do 2º turno." / "N dos municípios do
  arquivo de fronteiras não têm dados neste dataset e ficam em cinza."); on the real dataset none exist.
- All interactive elements are at least 40–44px tall (rows 44px, zoom buttons 44px, toggle 36px next
  to the #11 toggle); the page never scrolls sideways at 390px (asserted).