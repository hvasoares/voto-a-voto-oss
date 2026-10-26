# Slot `state-map` — Mapa por estado

| | |
|---|---|
| Route | `/mapa/` |
| Sketch frame | "10 Mapa por estado" (page "Election SPA v2") |
| Reference image | `site/reference/10-mapa-por-estado-mosaico.png`, `site/reference/10-mapa-por-estado-mapa.png` |
| Owning ticket | #11 (nobody else edits this directory) |
| Fixture route (screenshots) | `/mapa/` |
| Files you may edit | everything in `site/src/slots/state-map/`; shared parts only as listed in `site/src/shared/README.md` |

## Reads
- turnout + votes aggregated per state (round 2 margin Lula - Flavio, valid votes)

Get data ONLY through `ctx.data` (see `site/src/data/types.ts`). Never `fetch` anything else (the frontend-only check fails the build).

## Must show
- Abas "Margem (2º turno)" | "Virada (1º→2º)" e alternância "Mosaico" | "Mapa"
- Mosaico de estados: tamanho = votos válidos, cor = margem, sinal escrito em cada tile
- Escala de cores e legenda de leitura
- Estado selecionado: votos válidos e margens, botão "Abrir estado"
- Rodapé "Fonte: TSE, dados finais · Sobre os dados ›"

## Navigation (from the prototype "Fluxo" page and the frame's link texts)
- ‹ Início -> `/`
- Virada (1º→2º) -> `/mapa/virada/`
- Mapa (vista) -> `/mapa/` `?vista=mapa`
- Abrir estado -> `/:uf/`

## Analytics
Emit events through `ctx.analytics` only (no-op today). Properties are simple values; never typed text.

## Hydrating this slot
1. Replace `render` in `slot.ts`; set `hydrated: true`.
2. In `slot.test.ts` change `it.fails(...)` to `it(...)`: the "not yet hydrated" test must now pass. Add your behaviour tests there (cheapest layer first).
3. Run `npm run check-slot -- state-map`: behaviour tests, then the fixture-state screenshot for review (`docs/screenshot-review-protocol.md`).
4. Do not import from other slots; do not edit other slots.

