# Slot `region-detail` — Detalhe de região (ainda não desenhado)

| | |
|---|---|
| Route | `/brasil/:regiao/` |
| Sketch frame | "(não desenhado) Detalhe de região" (page "Election SPA v2") |
| Reference image | (nenhuma: sem quadro no Sketch) |
| Owning ticket | #10 (nobody else edits this directory) |
| Fixture route (screenshots) | `/brasil/sudeste/` |
| Files you may edit | everything in `site/src/slots/region-detail/`; shared parts only as listed in `site/src/shared/README.md` |

## Reads
- turnout + votes aggregated to one region

Get data ONLY through `ctx.data` (see `site/src/data/types.ts`). Never `fetch` anything else (the frontend-only check fails the build).

## Must show
- Detalhe de uma região (estados dentro dela). Aparece na página "Fluxo" como caixa tracejada, sem quadro no Sketch

## Navigation (from the prototype "Fluxo" page and the frame's link texts)
- ‹ Brasil e regiões -> `/brasil/`

## Analytics
Emit events through `ctx.analytics` only (no-op today). Properties are simple values; never typed text.

## Hydrating this slot
1. Replace `render` in `slot.ts`; set `hydrated: true`.
2. In `slot.test.ts` change `it.fails(...)` to `it(...)`: the "not yet hydrated" test must now pass. Add your behaviour tests there (cheapest layer first).
3. Run `npm run check-slot -- region-detail`: behaviour tests, then the fixture-state screenshot for review (`docs/screenshot-review-protocol.md`).
4. Do not import from other slots; do not edit other slots.
Note: Sem quadro no Sketch: o detalhe de região ainda não foi desenhado.
