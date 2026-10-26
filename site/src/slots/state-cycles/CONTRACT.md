# Slot `state-cycles` — Três ciclos por estado

| | |
|---|---|
| Route | `/tres-ciclos/:uf/` |
| Sketch frame | "13 Três ciclos por estado" (page "Election SPA v2") |
| Reference image | `site/reference/13-tres-ciclos-por-estado.png` |
| Owning ticket | #14 (nobody else edits this directory) |
| Fixture route (screenshots) | `/tres-ciclos/sp/` |
| Files you may edit | everything in `site/src/slots/state-cycles/`; shared parts only as listed in `site/src/shared/README.md` |

## Reads
- turnout + votes aggregated per state for 2018, 2022, 2026 (round 2)

Get data ONLY through `ctx.data` (see `site/src/data/types.ts`). Never `fetch` anything else (the frontend-only check fails the build).

## Must show
- Seletor de estado (SP, MG, RJ, BA, PR, RS, PE, CE)
- Barras 2018, 2022 e 2026 do estado e mudança de Lula em pp contra o ciclo anterior
- Legenda de cores (vermelho = Lula, azul = Bolsonaro/Flavio)
- Seção "Outros estados" com as três barras de cada um
- Links "Ver o estado ›" e "Ver os três ciclos de uma cidade ›"

## Navigation (from the prototype "Fluxo" page and the frame's link texts)
- ‹ Início -> `/`
- Ver o estado › -> `/:uf/`
- Ver os três ciclos de uma cidade › -> `/:uf/:slug/tres-ciclos/`

## Analytics
Emit events through `ctx.analytics` only (no-op today). Properties are simple values; never typed text.

## Hydrating this slot
1. Replace `render` in `slot.ts`; set `hydrated: true`.
2. In `slot.test.ts` change `it.fails(...)` to `it(...)`: the "not yet hydrated" test must now pass. Add your behaviour tests there (cheapest layer first).
3. Run `npm run check-slot -- state-cycles`: behaviour tests, then the fixture-state screenshot for review (`docs/screenshot-review-protocol.md`).
4. Do not import from other slots; do not edit other slots.

