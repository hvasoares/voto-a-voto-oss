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

