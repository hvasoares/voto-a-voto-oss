# Slot `city` — Cartão da cidade

| | |
|---|---|
| Route | `/:uf/:slug/` |
| Sketch frame | "2 Cartão da cidade" (page "Election SPA v2") |
| Reference image | `site/reference/02-cartao-da-cidade.png` |
| Owning ticket | #5 (nobody else edits this directory) |
| Fixture route (screenshots) | `/rj/cidade-exemplo/?turno=1` (the frame draws round 1) |
| Files you may edit | everything in `site/src/slots/city/`; shared parts only as listed in `site/src/shared/README.md` |

## Reads
- cities (name, UF, cycles)
- turnout (every cycle and round)
- votes + candidates (keyed by ano, turno and candidate number; a number never means the same person in another year)

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



## Hydrated (ticket #5)

### Product decisions
1. **Views.** Cycle and round are chosen with query parameters: `?ciclo=2018|2022|2026` and `?turno=1|2`. Default: the
   latest cycle that has data and its latest round (2026 round 2 for every real city). The Sketch fixture state uses
   `/rj/cidade-exemplo/?turno=1` (the frame draws round 1). Any (ciclo, turno) of a city with data renders; a cycle
   with no data for that city (Boa Esperança do Norte before 2026) shows the plain notice "Sem dados nesse ciclo."
   (`[data-nodata]`), never zeros. The polished three-cycle view and its no-data design belong to #6.
2. **Definitions.** "Votaram" = valid votes / aptos. "Não votaram" = aptos - valid votes = abstenção + brancos + nulos,
   where the (rare) "anulados em apuração separada" are counted with the nulos. Where the file reports 0 abstentions
   for a post nobody turned out in, the whole electorate counts as abstention. Candidate percentages are shares of
   valid votes; the three non-voter parts are shares of the non-voters.
3. **Rounding.** Integer percents by largest remainder, so the displayed parts of each bar (A + B + Outros; abstenção +
   brancos + nulos) add up to exactly 100 and voted + not voted = 100. The sentence shows one decimal ("33,6%", a
   trailing ",0" is dropped). Numbers use pt-BR dots ("36.400"); formatting does not depend on the runtime's ICU.
4. **Round 1.** The two candidates with the most votes (ties by candidate number) are A and B (A has the most votes);
   everybody else is one segment and one legend row "Outros candidatos (N)" (N = the other candidates of the round).
   Round 2 shows the two candidates. The bar shows "A" and "B"; the legend rows carry the names (Title Case of
   `nome_urna`, as in the dataset: "Flavio Bolsonaro").
5. **Takeaway sentence.** `src/shared/takeaway.ts`, templates documented at the top of that file and in
   `src/shared/README.md`.
6. **Analytics** (`ctx.analytics`, no text): `city_view {uf, slug, ciclo, turno}` when the page opens (after the view
   asked for in the address was applied), `round_switch {uf, slug, ciclo, turno, from_turno}`,
   `cycle_switch {uf, slug, ciclo, turno, from_ciclo}`.
7. **No JavaScript.** The pre-rendered page is complete for the default view and all six views (cycle x round) are in the
   page, five of them with the `hidden` attribute. A static host ignores the query string, so without JavaScript the
   tabs (plain links with the query parameters) keep showing the default view; with JavaScript `mount()` shows the view
   of the address and switches on click without any request (`history.pushState`; back button works).

### Markup contract
- `[data-city-card]` (`data-view="2026-1"`, `data-path`, `data-uf`, `data-slug`) holds one `.city-panel[data-view]` per
  (ciclo-turno); the visible one has no `hidden`. Tabs: `a[data-ciclo]` and `a[data-turno]` with `aria-current`.
- "Compartilhar" is `a.city-share[data-share]`; its href carries `?ciclo=&turno=` of the shown view so #7 knows what to
  draw. `/compartilhar/` itself is #7's.
- Cycle tabs are built in `slot.ts` with the shared `.tabs` classes, because `cycleTabs()` in `components.ts` belongs to #6
  (still the placeholder). #6 can swap the slot's inline nav for `cycleTabs()` once it renders the same markup.
- Footer: frame text for fixture data ("Dados fictícios para ilustrar o layout. Fonte real: TSE."), "Fonte: TSE, dados
  finais" for real data, plus a "Sobre os dados ›" link that is visually hidden until keyboard focus (every result screen must link to it, `flow.test.ts`; the frame has no such visible link, and the screenshot review does not allow extra visible elements).
- The frame subtitle "Município fictício · UF" literally says "UF" (placeholder); the page prints the real UF ("RJ").
- Overseas posts (`/zz/...`) have no "Ver o estado ›" link; the subtitle says "Voto no exterior".
