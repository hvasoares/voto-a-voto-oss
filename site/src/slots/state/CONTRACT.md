# Slot `state` — Estado

| | |
|---|---|
| Route | `/:uf/` |
| Sketch frame | "5 Estado (opcional)" (page "Election SPA v2") |
| Reference image | `site/reference/05-estado.png` |
| Owning ticket | #4 (nobody else edits this directory) |
| Fixture route (screenshots) | `/rj/` |
| Files you may edit | everything in `site/src/slots/state/`; shared parts only as listed in `site/src/shared/README.md` |

## Reads
- states (municipality count)
- cities by UF (name, slug)

Get data ONLY through `ctx.data` (see `site/src/data/types.ts`). Never `fetch` anything else (the frontend-only check fails the build).

## Must show
- "Estado selecionado: UF" e "N municípios"
- Área do mapa de municípios (reservada para #16/#17)
- Busca "Busque sua cidade em UF" restrita ao estado
- Lista de cidades com link para a página de cada uma
- Links "Ver mapa por estado ›" e "Ver os três ciclos do estado ›"

## Navigation (from the prototype "Fluxo" page and the frame's link texts)
- ‹ Início -> `/`
- Ver mapa por estado › -> `/mapa/`
- Ver os três ciclos do estado › -> `/tres-ciclos/:uf/`

## Analytics
Emit events through `ctx.analytics` only (no-op today). Properties are simple values; never typed text.

## Hydrating this slot
1. Replace `render` in `slot.ts`; set `hydrated: true`.
2. In `slot.test.ts` change `it.fails(...)` to `it(...)`: the "not yet hydrated" test must now pass. Add your behaviour tests there (cheapest layer first).
3. Run `npm run check-slot -- state`: behaviour tests, then the fixture-state screenshot for review (`docs/screenshot-review-protocol.md`).
4. Do not import from other slots; do not edit other slots.


## Hydrated (ticket #4)
- Map area contract for #16/#17: `<div class="state-map" data-placeholder="state-map" data-ticket="16 17" data-uf="rj" data-map-area>` between the subtitle and the search box (about 220 px high); the map ticket replaces the content of that div, nothing else on the page depends on it.
- The full list is plain anchors (`[data-state-list] a.state-row`); search (`mount`) reads those rows from the page, makes no request, and shows ranked results in `[data-state-results]`.
- `?fixture=sketch` (fixtureRoute) draws the frame's illustrative figures ("92 municípios (exemplo)", cities A to E, frame banner, no footer) read from `frameTexts`; rows still link to dataset cities. Without it the page shows the dataset (fixture RJ: 6 municipalities).
- Events: `search {scope:'state', uf, results, query_length}`, `search_result_tap {scope, uf, position}`, `city_list_tap {uf, position}`, `state_link_tap {uf, link}`. Never the typed text.
