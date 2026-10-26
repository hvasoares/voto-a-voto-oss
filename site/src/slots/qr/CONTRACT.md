# Slot `qr` — Mostrar QR

| | |
|---|---|
| Route | `/:uf/:slug/qr/` |
| Sketch frame | "4 Mostrar QR" (page "Election SPA v2") |
| Reference image | `site/reference/04-mostrar-qr.png` |
| Owning ticket | #9 (nobody else edits this directory) |
| Fixture route (screenshots) | `/rj/cidade-exemplo/qr/` |
| Files you may edit | everything in `site/src/slots/qr/`; shared parts only as listed in `site/src/shared/README.md` |

## Reads
- cities (slug -> short address)

Get data ONLY through `ctx.data` (see `site/src/data/types.ts`). Never `fetch` anything else (the frontend-only check fails the build).

## Must show
- Título "Mostrar QR" e "Presidente 2026 · <cidade>"
- QR escaneável do endereço curto da cidade e o endereço por extenso
- Botão "Voltar" e "‹ Fechar"
- Pôster imprimível de uma página

## Navigation (from the prototype "Fluxo" page and the frame's link texts)
- ‹ Fechar -> `/:uf/:slug/`
- Voltar -> `/:uf/:slug/compartilhar/`

## Analytics
Emit events through `ctx.analytics` only (no-op today). Properties are simple values; never typed text.

## Hydrating this slot
1. Replace `render` in `slot.ts`; set `hydrated: true`.
2. In `slot.test.ts` change `it.fails(...)` to `it(...)`: the "not yet hydrated" test must now pass. Add your behaviour tests there (cheapest layer first).
3. Run `npm run check-slot -- qr`: behaviour tests, then the fixture-state screenshot for review (`docs/screenshot-review-protocol.md`).
4. Do not import from other slots; do not edit other slots.

