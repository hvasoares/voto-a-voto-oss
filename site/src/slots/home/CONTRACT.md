# Slot `home` — Voto a Voto

| | |
|---|---|
| Route | `/` |
| Sketch frame | "1 Home" (page "Election SPA v2") |
| Reference image | `site/reference/01-home.png` |
| Owning ticket | #3 (nobody else edits this directory) |
| Fixture route (screenshots) | `/` |
| Files you may edit | everything in `site/src/slots/home/`; shared parts only as listed in `site/src/shared/README.md` |

## Reads
- cities (search by name, accent/case-insensitive, 5.570 cities)
- states (27 UF tiles; overseas post never offered as a state)

Get data ONLY through `ctx.data` (see `site/src/data/types.ts`). Never `fetch` anything else (the frontend-only check fails the build).

## Must show
- Título "Voto a Voto" e a frase "Eleição presidencial 2026, cidade por cidade."
- Campo "Busque sua cidade" com resultados (nome + UF)
- Grade dos 27 estados (toque leva à página do estado)
- Seção "Para explorar": Brasil e regiões, Mapa por estado, Relatórios, Três ciclos por estado
- Rodapé "Dados oficiais do TSE · Sobre os dados ›"

## Navigation (from the prototype "Fluxo" page and the frame's link texts)
- Cidade Exemplo (resultado da busca) -> `/:uf/:slug/`
- RJ (tile do estado) -> `/:uf/`
- Brasil e regiões -> `/brasil/`
- Mapa por estado -> `/mapa/`
- Relatórios -> `/relatorios/`
- Três ciclos por estado -> `/tres-ciclos/:uf/`
- Sobre os dados › -> `/sobre-os-dados/`

## Analytics
Emit events through `ctx.analytics` only (no-op today). Properties are simple values; never typed text.

## Hydrating this slot
1. Replace `render` in `slot.ts`; set `hydrated: true`.
2. In `slot.test.ts` change `it.fails(...)` to `it(...)`: the "not yet hydrated" test must now pass. Add your behaviour tests there (cheapest layer first).
3. Run `npm run check-slot -- home`: behaviour tests, then the fixture-state screenshot for review (`docs/screenshot-review-protocol.md`).
4. Do not import from other slots; do not edit other slots.

