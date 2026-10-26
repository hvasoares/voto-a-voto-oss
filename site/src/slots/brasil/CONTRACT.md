# Slot `brasil` — Brasil e regiões

| | |
|---|---|
| Route | `/brasil/` |
| Sketch frame | "8 Brasil e regiões" (page "Election SPA v2") |
| Reference image | `site/reference/08-brasil-e-regioes.png` |
| Owning ticket | #10 (nobody else edits this directory) |
| Fixture route (screenshots) | `/brasil/` |
| Files you may edit | everything in `site/src/slots/brasil/`; shared parts only as listed in `site/src/shared/README.md` |

## Reads
- turnout + votes aggregated to Brasil and to the 5 regions (round 2)

Get data ONLY through `ctx.data` (see `site/src/data/types.ts`). Never `fetch` anything else (the frontend-only check fails the build).

## Must show
- "2º turno de 2026"
- Brasil, votos válidos: barra Lula x Flavio
- Por região: % dos votos válidos do país, barra de votos e barra de comparecimento
- Notas de leitura das barras
- Link "Ver mapa por estado ›"

## Navigation (from the prototype "Fluxo" page and the frame's link texts)
- ‹ Início -> `/`
- Ver mapa por estado › -> `/mapa/`
- Sudeste (detalhe de região, não desenhado) -> `/brasil/:regiao/`

## Analytics
Emit events through `ctx.analytics` only (no-op today). Properties are simple values; never typed text.

## Hydrating this slot
1. Replace `render` in `slot.ts`; set `hydrated: true`.
2. In `slot.test.ts` change `it.fails(...)` to `it(...)`: the "not yet hydrated" test must now pass. Add your behaviour tests there (cheapest layer first).
3. Run `npm run check-slot -- brasil`: behaviour tests, then the fixture-state screenshot for review (`docs/screenshot-review-protocol.md`).
4. Do not import from other slots; do not edit other slots.

