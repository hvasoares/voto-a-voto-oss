# Slot `report-undesigned` — Relatório (ainda não desenhado)

| | |
|---|---|
| Route | `/relatorios/:report/` |
| Sketch frame | "(não desenhado) Detalhes dos outros 4 relatórios" (page "Election SPA v2") |
| Reference image | (nenhuma: sem quadro no Sketch) |
| Owning ticket | #13 (nobody else edits this directory) |
| Fixture route (screenshots) | `/relatorios/maiores-viradas/` |
| Files you may edit | everything in `site/src/slots/report-undesigned/`; shared parts only as listed in `site/src/shared/README.md` |

## Reads
- depends on the report (turnout + votes + cities)

Get data ONLY through `ctx.data` (see `site/src/data/types.ts`). Never `fetch` anything else (the frontend-only check fails the build).

## Must show
- Um relatório por rota: maiores viradas (100 mil+ votos), votos ganhos e perdidos vs. 2022, disputas mais apertadas, comparecimento mais alto e mais baixo
- Desenho no Sketch ainda não existe: o ticket #13 começa por desenhar o quadro

## Navigation (from the prototype "Fluxo" page and the frame's link texts)
- ‹ Relatórios -> `/relatorios/`

## Analytics
Emit events through `ctx.analytics` only (no-op today). Properties are simple values; never typed text.

## Hydrating this slot
1. Replace `render` in `slot.ts`; set `hydrated: true`.
2. In `slot.test.ts` change `it.fails(...)` to `it(...)`: the "not yet hydrated" test must now pass. Add your behaviour tests there (cheapest layer first).
3. Run `npm run check-slot -- report-undesigned`: behaviour tests, then the fixture-state screenshot for review (`docs/screenshot-review-protocol.md`).
4. Do not import from other slots; do not edit other slots.
Note: Sem quadro no Sketch: a página do relatório ainda não foi desenhada.
