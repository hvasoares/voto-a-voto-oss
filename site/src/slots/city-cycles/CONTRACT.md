# Slot `city-cycles` — Três ciclos

| | |
|---|---|
| Route | `/:uf/:slug/tres-ciclos/` |
| Sketch frame | "9 Três ciclos (cidade)" (page "Election SPA v2") |
| Reference image | `site/reference/09-tres-ciclos-cidade.png` |
| Owning ticket | #6 (nobody else edits this directory) |
| Fixture route (screenshots) | `/rj/cidade-exemplo/tres-ciclos/` |
| Files you may edit | everything in `site/src/slots/city-cycles/`; shared parts only as listed in `site/src/shared/README.md` |

## Reads
- cities (cycles available)
- turnout + votes + candidates (2018, 2022, 2026; round 1 or 2)

Get data ONLY through `ctx.data` (see `site/src/data/types.ts`). Never `fetch` anything else (the frontend-only check fails the build).

## Must show
- "Presidente 2018, 2022 e 2026 · <cidade> (1º turno)"
- Para cada ciclo: Votaram X% (barra de votos) e Não votaram Y% (abstenção, brancos, nulos)
- Ciclo sem dados: "sem dados nesse ciclo", nunca zeros
- Legenda Br = brancos, Nu = nulos

## Navigation (from the prototype "Fluxo" page and the frame's link texts)
- ‹ Início -> `/`
- Cartão da cidade -> `/:uf/:slug/`

## Analytics
Emit events through `ctx.analytics` only (no-op today). Properties are simple values; never typed text.

## Hydrating this slot
1. Replace `render` in `slot.ts`; set `hydrated: true`.
2. In `slot.test.ts` change `it.fails(...)` to `it(...)`: the "not yet hydrated" test must now pass. Add your behaviour tests there (cheapest layer first).
3. Run `npm run check-slot -- city-cycles`: behaviour tests, then the fixture-state screenshot for review (`docs/screenshot-review-protocol.md`).
4. Do not import from other slots; do not edit other slots.


## Hydrated (ticket #6): product decisions
- **Round.** `?turno=1|2`. Default for real data is round 2 (all three cycles have it and the pair of runoff candidates is stable); anything else falls back to it. The fixture state (`fixtureRoute`) is `?turno=1`, as the Sketch frame draws round 1.
- **Works without JavaScript.** Both rounds are in the page HTML (3 cycles each, about 4 KB per round). Round 2 is visible, round 1 carries `hidden`; `mount()` shows the round asked for in the address and handles the switch link (no request). With scripting off (`@media (scripting: none)`) both rounds are stacked, each with its own subtitle "(Nº turno)", and the switch link is hidden because a static host ignores query strings.
- **Stable side order.** In every cycle the candidate with the lower ballot number is on the left (dark segment), the higher on the right. Round 2 is the pair of the runoff (13 vs 17 in 2018, 13 vs 22 in 2022 and 2026). Round 1: the two candidates with the most votes IN THIS CITY, placed by number, and "Outros" (everyone else) on the right. The page says so in one sentence in the legend line. Names come from `candidates.csv` keyed by (ano, turno, numero), never assuming a number is the same person across years.
- **No data.** A cycle without data (no turnout row, or no electorate) is a block of the same height (150 px) with "sem dados nesse ciclo" and one sentence: "Este município só tem dados a partir de {ano}." when the dataset's `ciclos` starts later, otherwise "Não há resultado deste município no Nº turno de {ano}." Never zeros. A city with an electorate but nobody turned out is data: "Votaram 0%", the voted bar says "Nenhum voto válido".
- **Numbers.** All from the shared `buildCityResult` (largest remainder); `cycles-model.ts` only reorders segments and chooses the text that fits a segment. Each bar's displayed parts add up to 100; Votaram + Não votaram = 100.
- **Frame note removed.** The frame's note "Dados de 2018 e 2022 ainda não foram coletados" is gone (data exists, also in the fixture). Its place holds the round-switch link ("Ver o 1º turno ›"); the link "Cartão da cidade" sits below it.
- **Footer.** The shared "Fonte: TSE, dados finais" line; the fictitious banner only when `manifest.fixture` is true.
- **Overseas posts (`/zz/...`).** Same page. Posts without turnout in a cycle show "Votaram 0%" with the empty-bar note; posts that did not exist in a cycle show the no-data block.
- **Events (ctx.analytics only).** `city_cycles_view {uf, slug, turno}` on load, `round_switch {uf, slug, turno, from_turno, view: 'tres-ciclos'}` on a switch. No typed text.
