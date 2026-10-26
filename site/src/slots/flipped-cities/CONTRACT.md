# Slot `flipped-cities` — Cidades que viraram no 2º turno

| | |
|---|---|
| Route | `/relatorios/cidades-que-viraram/` |
| Sketch frame | "7 Relatório: cidades que viraram" (page "Election SPA v2") |
| Reference image | `site/reference/07-cidades-que-viraram.png` |
| Owning ticket | #12 (nobody else edits this directory) |
| Fixture route (screenshots) | `/relatorios/cidades-que-viraram/` |
| Files you may edit | everything in `site/src/slots/flipped-cities/`; shared parts only as listed in `site/src/shared/README.md` |

## Reads
- turnout + votes (rounds 1 and 2, margin per city)
- cities (name, UF)

Get data ONLY through `ctx.data` (see `site/src/data/types.ts`). Never `fetch` anything else (the frontend-only check fails the build).

## Must show
- Título e explicação (cidades com 5 mil+ votos válidos; margem em pontos percentuais)
- Lista ordenada de cidades: margem 1º turno → margem 2º turno e votos válidos
- Aviso "Compare por pontos percentuais, não por votos absolutos"
- Botão "Compartilhar"
- Rodapé "Fonte: TSE, dados finais · Sobre os dados ›"

## Navigation (from the prototype "Fluxo" page and the frame's link texts)
- ‹ Relatórios -> `/relatorios/`
- Cidade Exemplo (linha da lista) -> `/:uf/:slug/`

## Analytics
Emit events through `ctx.analytics` only (no-op today). Properties are simple values; never typed text.

## Hydrating this slot
1. Replace `render` in `slot.ts`; set `hydrated: true`.
2. In `slot.test.ts` change `it.fails(...)` to `it(...)`: the "not yet hydrated" test must now pass. Add your behaviour tests there (cheapest layer first).
3. Run `npm run check-slot -- flipped-cities`: behaviour tests, then the fixture-state screenshot for review (`docs/screenshot-review-protocol.md`).
4. Do not import from other slots; do not edit other slots.

