# Frontend-only Brazil map, and what the cached TSE data can support

Date: 2026-10-26

## Rendering the map (frontend only)

No server or tile service is needed. Everything is static files plus browser JS.

| Option | Feel | Best for |
|---|---|---|
| D3-geo + TopoJSON | SVG, no base map, easy to export as share cards | States, regions, municipalities, click-to-drill-down. Zoom gets sluggish at municipality level. |
| MapLibre GL JS + PMTiles | Closest to Google Maps, smooth pan/zoom, WebGL | 5,570 polygons without lag. One `.pmtiles` file with HTTP range requests. |
| Leaflet + GeoJSON | Simple raster base map plus layers | Quick choropleth and popups |
| deck.gl | WebGL, huge datasets | Overkill here |

Recommendation: D3-geo + simplified TopoJSON for the static shareable site. Switch to MapLibre + PMTiles if
Google-style pan/zoom down to individual cities is wanted.

Boundary data:
- IBGE Malhas API (state / region / municipality GeoJSON):
  `https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?intrarregiao=municipio&formato=application/vnd.geo+json&qualidade=minima`
- Simplify once, offline: `mapshaper -simplify 5% -o format=topojson` (about 1-3 MB for all municipalities), commit the output.
- Join key: TSE municipality codes (5 digits) are NOT IBGE codes (7 digits). A crosswalk is needed
  (Base dos Dados municipality directory has one). Not built yet.

## Neighbourhood (bairro) level

- Boundaries: IBGE 2022 Census bairro polygons exist only for municipalities that supplied them (coverage unverified).
  Census tracts (about 470k) cover everything but are too heavy nationally, so load per city on drill-down. OSM
  `suburb` / `neighbourhood` and some prefeitura open-data portals are alternatives.
- Votes: TSE publishes results by polling section, not by bairro. Bairro results must be derived:
  section results -> polling place (`eleitorado_local_votacao`, has address and bairro, possibly coordinates; not verified
  for 2026) -> bairro by address text or, better, point-in-polygon on coordinates.
- Caveat: a polling place is where people vote, not where they live, so this approximates neighbourhood voting.
- Fits the lazy-loaded per-city file design: `cities/<ibge>.json` fetched only on drill-down.

## What is cached (checked 2026-10-26)

| Cycle | Location | Granularity | Bairro info |
|---|---|---|---|
| 2026 rounds 1 and 2 | `.cache/tse/` (11,142 + 11,144 `.jws`) | Municipality | none (decoded payload has only totals and candidate votes) |
| 2022 | `.cache/tse-opendata/presidente_2022_municipios.csv`, `votacao_candidato_munzona_2022.zip` | Municipality; municipality x zone | none (no section, bairro or coordinates) |
| 2018 | `.cache/tse-opendata/presidente_2018_municipios.csv`, `votacao_candidato_munzona_2018.zip` | Municipality; municipality x zone | none |
| 2028 | none | n/a | Does not exist yet. It is a municipal election (prefeito / vereador). |

No cached source goes below the municipality (or electoral zone, which has no official polygons). Neighbourhood results
need new downloads: section results (`votacao_secao_<ano>_<UF>.zip`, large; SP alone is hundreds of MB) and the polling
place directory. 2026 section data may not be published yet, so 2022 is the realistic first target. Suggested pilot:
one city (e.g. Sao Paulo), then test whether the polling place file has usable coordinates or bairro names.

## 2018 municipality results (done)

- Source: `https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_candidato_munzona/votacao_candidato_munzona_2018.zip` (377 MB).
- Output: `.cache/tse-opendata/presidente_2018_municipios.csv`, 83,550 rows, 5,570 municipalities, columns
  `turno,uf,cd_municipio,candidato_numero,votos` (same shape as the 2022 file).
- Built by `scripts/munzona_to_municipios.py`, which sums presidential rows from the zip's `_BR.csv` member.
  Presidential rows are only in `_BR.csv`, not in the per-state files.
- Validation: run on the 2022 zip, it reproduces `presidente_2022_municipios.csv` exactly for every Brazilian
  municipality. The old file omits overseas votes (UF `zz`, about 593k in 2022), so the script drops `zz` too.
- 2018 sanity check: round 1 Bolsonaro (17) 49.16M, Haddad (13) 31.32M. Round 2 Bolsonaro 57.67M, Haddad 46.99M.
- Caveats: nominal votes only (no blank or null), so shares are of nominal votes. Codes are TSE codes, not IBGE.

## Open items

- Build the TSE -> IBGE municipality code crosswalk.
- Download simplified IBGE boundaries and produce TopoJSON.
- Decide D3 vs MapLibre after a prototype on the cached data.
- Pilot the bairro pipeline on one city with 2022 section data.
