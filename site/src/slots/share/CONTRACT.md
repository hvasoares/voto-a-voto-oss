# Slot `share` — Compartilhar resultado

| | |
|---|---|
| Route | `/:uf/:slug/compartilhar/` |
| Sketch frame | "3 Folha de compartilhamento" (page "Election SPA v2") |
| Reference image | `site/reference/03-compartilhamento.png` |
| Owning ticket | #7 (nobody else edits this directory) |
| Fixture route (screenshots) | `/rj/cidade-exemplo/compartilhar/` |
| Files you may edit | everything in `site/src/slots/share/`; shared parts only as listed in `site/src/shared/README.md` |

## Reads
- cities
- turnout + votes + candidates (2026, the round on the city card) to draw the picture in the browser

Get data ONLY through `ctx.data` (see `site/src/data/types.ts`). Never `fetch` anything else (the frontend-only check fails the build).

## Must show
- Folha "Compartilhar resultado" sobre o cartão da cidade, com botão "Fechar"
- Prévia da imagem: nome, ciclo, turno, Votaram/Não votaram, endereço curto (sem QR)
- Botões "Compartilhar", "Baixar imagem" e "Mostrar QR"
- Nota: o link vai no texto da mensagem; a imagem leva só o endereço curto

## Navigation (from the prototype "Fluxo" page and the frame's link texts)
- Fechar -> `/:uf/:slug/`
- Mostrar QR -> `/:uf/:slug/qr/`

## Analytics
Emit events through `ctx.analytics` only (no-op today). Properties are simple values; never typed text.

## Hydrating this slot
1. Replace `render` in `slot.ts`; set `hydrated: true`.
2. In `slot.test.ts` change `it.fails(...)` to `it(...)`: the "not yet hydrated" test must now pass. Add your behaviour tests there (cheapest layer first).
3. Run `npm run check-slot -- share`: behaviour tests, then the fixture-state screenshot for review (`docs/screenshot-review-protocol.md`).
4. Do not import from other slots; do not edit other slots.

