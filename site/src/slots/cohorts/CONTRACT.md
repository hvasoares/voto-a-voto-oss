# Slot `cohorts` — Como cada grupo votou

| | |
|---|---|
| Route | `/relatorios/como-cada-grupo-votou/` |
| Sketch frame | "12 Como cada grupo votou" (page "Election SPA v2") |
| Reference image | `site/reference/12-como-cada-grupo-votou.png` |
| Owning ticket | #15 (nobody else edits this directory) |
| Fixture route (screenshots) | `/relatorios/como-cada-grupo-votou/` |
| Files you may edit | everything in `site/src/slots/cohorts/`; shared parts only as listed in `site/src/shared/README.md` |

## Reads
- turnout + votes + cities (winner of round 2 in 2018, 2022, 2026 per city)

Get data ONLY through `ctx.data` (see `site/src/data/types.ts`). Never `fetch` anything else (the frontend-only check fails the build).

## Must show
- Quatro grupos (venceu em 2018 e 2022: PT; Bolsonaro; Bolsonaro depois Lula; PT depois Bolsonaro) com contagem de cidades e votos válidos
- Vencedor do 2º turno de 2026 por grupo, em % das cidades
- Empates contabilizados (os totais fecham)
- Rodapé "Fonte: TSE, dados finais · Sobre os dados ›"

## Navigation (from the prototype "Fluxo" page and the frame's link texts)
- ‹ Relatórios -> `/relatorios/`

## Analytics
Emit events through `ctx.analytics` only (no-op today). Properties are simple values; never typed text.

## Hydrating this slot
1. Replace `render` in `slot.ts`; set `hydrated: true`.
2. In `slot.test.ts` change `it.fails(...)` to `it(...)`: the "not yet hydrated" test must now pass. Add your behaviour tests there (cheapest layer first).
3. Run `npm run check-slot -- cohorts`: behaviour tests, then the fixture-state screenshot for review (`docs/screenshot-review-protocol.md`).
4. Do not import from other slots; do not edit other slots.

