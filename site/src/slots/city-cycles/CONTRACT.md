# Slot `city-cycles` — Três ciclos

| | |
|---|---|
| Route | `/:uf/:slug/tres-ciclos/` |
| Sketch frame | "9 Três ciclos (cidade)" (page "Election SPA v2") |
| Reference image | `site/reference/09-tres-ciclos-cidade.png` |
| Owning ticket | #6 (nobody else edits this directory) |
| Fixture route (screenshots) | `/rj/cidade-exemplo/tres-ciclos/` |
| Files you may edit | everything in `site/src/slots/city-cycles/`; shared parts only as listed in `site/src/shared/README.md` |

## Reads
- cities (cycles available)
- turnout + votes + candidates (2018, 2022, 2026; round 1 or 2)

Get data ONLY through `ctx.data` (see `site/src/data/types.ts`). Never `fetch` anything else (the frontend-only check fails the build).

## Must show
- "Presidente 2018, 2022 e 2026 · <cidade> (1º turno)"
- Para cada ciclo: Votaram X% (barra de votos) e Não votaram Y% (abstenção, brancos, nulos)
- Ciclo sem dados: "sem dados nesse ciclo", nunca zeros
- Legenda Br = brancos, Nu = nulos

## Navigation (from the prototype "Fluxo" page and the frame's link texts)
- ‹ Início -> `/`
- Cartão da cidade -> `/:uf/:slug/`

## Analytics
Emit events through `ctx.analytics` only (no-op today). Properties are simple values; never typed text.

## Hydrating this slot
1. Replace `render` in `slot.ts`; set `hydrated: true`.
2. In `slot.test.ts` change `it.fails(...)` to `it(...)`: the "not yet hydrated" test must now pass. Add your behaviour tests there (cheapest layer first).
3. Run `npm run check-slot -- city-cycles`: behaviour tests, then the fixture-state screenshot for review (`docs/screenshot-review-protocol.md`).
4. Do not import from other slots; do not edit other slots.

