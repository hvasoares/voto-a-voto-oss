# Slot `reports` — Relatórios

| | |
|---|---|
| Route | `/relatorios/` |
| Sketch frame | "6 Relatórios" (page "Election SPA v2") |
| Reference image | `site/reference/06-relatorios.png` |
| Owning ticket | #12 (nobody else edits this directory) |
| Fixture route (screenshots) | `/relatorios/` |
| Files you may edit | everything in `site/src/slots/reports/`; shared parts only as listed in `site/src/shared/README.md` |

## Reads
- turnout + votes + cities (each report headline number, computed)

Get data ONLY through `ctx.data` (see `site/src/data/types.ts`). Never `fetch` anything else (the frontend-only check fails the build).

## Must show
- Título "Relatórios" e "2º turno de 2026 e comparação com 2022"
- Sete itens de relatório, cada um com título e número-manchete calculado
- Rodapé "Fonte: TSE, dados finais · Sobre os dados ›"

## Navigation (from the prototype "Fluxo" page and the frame's link texts)
- Cidades que viraram no 2º turno -> `/relatorios/cidades-que-viraram/`
- Maiores viradas, cidades de 100 mil+ votos -> `/relatorios/:report/` (params {'report': 'maiores-viradas'})
- Votos ganhos e perdidos vs. 2022 -> `/relatorios/:report/` (params {'report': 'votos-ganhos-e-perdidos'})
- Disputas mais apertadas -> `/relatorios/:report/` (params {'report': 'disputas-mais-apertadas'})
- Comparecimento mais alto e mais baixo -> `/relatorios/:report/` (params {'report': 'comparecimento'})
- Comparar com 2022 e 2018 -> `/comparar/2022/`
- Como cada grupo votou -> `/relatorios/como-cada-grupo-votou/`

## Analytics
Emit events through `ctx.analytics` only (no-op today). Properties are simple values; never typed text.

## Hydrating this slot
1. Replace `render` in `slot.ts`; set `hydrated: true`.
2. In `slot.test.ts` change `it.fails(...)` to `it(...)`: the "not yet hydrated" test must now pass. Add your behaviour tests there (cheapest layer first).
3. Run `npm run check-slot -- reports`: behaviour tests, then the fixture-state screenshot for review (`docs/screenshot-review-protocol.md`).
4. Do not import from other slots; do not edit other slots.

