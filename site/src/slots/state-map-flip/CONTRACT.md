# Slot `state-map-flip` — Mapa por estado: virada

| | |
|---|---|
| Route | `/mapa/virada/` |
| Sketch frame | "10b Mapa por estado: virada" (page "Election SPA v2") |
| Reference image | `site/reference/10b-virada-mosaico.png`, `site/reference/10b-virada-mapa.png` |
| Owning ticket | #11 (nobody else edits this directory) |
| Fixture route (screenshots) | `/mapa/virada/` |
| Files you may edit | everything in `site/src/slots/state-map-flip/`; shared parts only as listed in `site/src/shared/README.md` |

## Reads
- turnout + votes aggregated per state (change of margin between round 1 and round 2)

Get data ONLY through `ctx.data` (see `site/src/data/types.ts`). Never `fetch` anything else (the frontend-only check fails the build).

## Must show
- Mesma estrutura do mapa por estado, mostrando a variação da margem entre os turnos (pp)
- Escala sem estados negativos: "Sem estados com variação negativa" quando for o caso
- Estado selecionado com votos válidos e as duas margens

## Navigation (from the prototype "Fluxo" page and the frame's link texts)
- ‹ Início -> `/`
- Margem (2º turno) -> `/mapa/`
- Mapa (vista) -> `/mapa/virada/` `?vista=mapa`
- Abrir estado -> `/:uf/`

## Analytics
Emit events through `ctx.analytics` only (no-op today). Properties are simple values; never typed text.

## Hydrating this slot
1. Replace `render` in `slot.ts`; set `hydrated: true`.
2. In `slot.test.ts` change `it.fails(...)` to `it(...)`: the "not yet hydrated" test must now pass. Add your behaviour tests there (cheapest layer first).
3. Run `npm run check-slot -- state-map-flip`: behaviour tests, then the fixture-state screenshot for review (`docs/screenshot-review-protocol.md`).
4. Do not import from other slots; do not edit other slots.

