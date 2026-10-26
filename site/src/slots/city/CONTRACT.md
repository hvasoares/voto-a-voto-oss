# Slot `city` — Cartão da cidade

| | |
|---|---|
| Route | `/:uf/:slug/` |
| Sketch frame | "2 Cartão da cidade" (page "Election SPA v2") |
| Reference image | `site/reference/02-cartao-da-cidade.png` |
| Owning ticket | #5 (nobody else edits this directory) |
| Fixture route (screenshots) | `/rj/cidade-exemplo/` |
| Files you may edit | everything in `site/src/slots/city/`; shared parts only as listed in `site/src/shared/README.md` |

## Reads
- cities (name, UF, cycles)
- turnout (2026, round 1 and 2)
- votes + candidates (2026)

Get data ONLY through `ctx.data` (see `site/src/data/types.ts`). Never `fetch` anything else (the frontend-only check fails the build).

## Must show
- Nome da cidade e UF
- Abas de ciclo 2018 | 2022 | 2026 e de turno 1º | 2º
- Barra "Votaram X% do eleitorado" dividida entre os dois candidatos
- Barra "Não votaram Y%" dividida em abstenção, brancos e nulos
- Cinco linhas de legenda (candidato A, B, abstenção, brancos, nulos) com votos e %
- Frase-resumo construída com os números
- Botão "Compartilhar" e links "Comparar com 2022 ›", "Ver os três ciclos ›", "Ver o estado ›"

## Navigation (from the prototype "Fluxo" page and the frame's link texts)
- ‹ Início -> `/`
- Compartilhar -> `/:uf/:slug/compartilhar/`
- Comparar com 2022 › -> `/comparar/2022/`
- Ver os três ciclos › -> `/:uf/:slug/tres-ciclos/`
- Ver o estado › -> `/:uf/`

## Analytics
Emit events through `ctx.analytics` only (no-op today). Properties are simple values; never typed text.

## Hydrating this slot
1. Replace `render` in `slot.ts`; set `hydrated: true`.
2. In `slot.test.ts` change `it.fails(...)` to `it(...)`: the "not yet hydrated" test must now pass. Add your behaviour tests there (cheapest layer first).
3. Run `npm run check-slot -- city`: behaviour tests, then the fixture-state screenshot for review (`docs/screenshot-review-protocol.md`).
4. Do not import from other slots; do not edit other slots.

