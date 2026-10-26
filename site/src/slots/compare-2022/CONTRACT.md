# Slot `compare-2022` — Comparar com 2022

| | |
|---|---|
| Route | `/comparar/2022/` |
| Sketch frame | "11 Comparar com 2022" (page "Election SPA v2") |
| Reference image | `site/reference/11-comparar-2022.png` |
| Owning ticket | #14 (nobody else edits this directory) |
| Fixture route (screenshots) | `/comparar/2022/` |
| Files you may edit | everything in `site/src/slots/compare-2022/`; shared parts only as listed in `site/src/shared/README.md` |

## Reads
- turnout + votes aggregated per state (2026 round 2 vs 2022 round 2, largest states)

Get data ONLY through `ctx.data` (see `site/src/data/types.ts`). Never `fetch` anything else (the frontend-only check fails the build).

## Must show
- Abas de ciclo 2018 | 2022 e título "Comparar com 2022"
- Por estado (os seis maiores): votos válidos; Lula e Flavio com percentual em 2026, percentual em 2022 e diferença de votos
- Rodapé "Fonte: TSE, dados finais · Sobre os dados ›"

## Navigation (from the prototype "Fluxo" page and the frame's link texts)
- ‹ Início -> `/`
- Comparar com 2018 -> `/comparar/2018/`
- SP (linha de estado) -> `/:uf/`

## Analytics
Emit events through `ctx.analytics` only (no-op today). Properties are simple values; never typed text.

## Hydrating this slot
1. Replace `render` in `slot.ts`; set `hydrated: true`.
2. In `slot.test.ts` change `it.fails(...)` to `it(...)`: the "not yet hydrated" test must now pass. Add your behaviour tests there (cheapest layer first).
3. Run `npm run check-slot -- compare-2022`: behaviour tests, then the fixture-state screenshot for review (`docs/screenshot-review-protocol.md`).
4. Do not import from other slots; do not edit other slots.

