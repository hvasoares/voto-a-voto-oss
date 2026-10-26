# Slot `about` — Sobre os dados

| | |
|---|---|
| Route | `/sobre-os-dados/` |
| Sketch frame | "14 Sobre os dados" (page "Election SPA v2") |
| Reference image | `site/reference/14-sobre-os-dados.png` |
| Owning ticket | #18 (nobody else edits this directory) |
| Fixture route (screenshots) | `/sobre-os-dados/` |
| Files you may edit | everything in `site/src/slots/about/`; shared parts only as listed in `site/src/shared/README.md` |

## Reads
- manifest (sources, hashes, retrieval dates)

Get data ONLY through `ctx.data` (see `site/src/data/types.ts`). Never `fetch` anything else (the frontend-only check fails the build).

## Must show
- "De onde vêm os números", "O que foi conferido", "O que ainda não temos", "Limites"
- "Confira você mesmo" em quatro passos e "Código aberto"
- Rodapé "Fonte: TSE, dados finais"

## Navigation (from the prototype "Fluxo" page and the frame's link texts)
- ‹ Início -> `/`

## Analytics
Emit events through `ctx.analytics` only (no-op today). Properties are simple values; never typed text.

## Hydrating this slot
1. Replace `render` in `slot.ts`; set `hydrated: true`.
2. In `slot.test.ts` change `it.fails(...)` to `it(...)`: the "not yet hydrated" test must now pass. Add your behaviour tests there (cheapest layer first).
3. Run `npm run check-slot -- about`: behaviour tests, then the fixture-state screenshot for review (`docs/screenshot-review-protocol.md`).
4. Do not import from other slots; do not edit other slots.
Note: Atenção: este quadro tem 390x1123 (página longa), não 390x844; a referência tem a altura inteira.
