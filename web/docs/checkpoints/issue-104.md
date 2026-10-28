# #104 City card and share pictures: candidates in ballot-number order

One checkpoint (logic only, no markup or CSS change), one commit.

## What changed
- `buildCityResult` (`src/shared/city-model.ts`) still picks the two candidates shown by votes (round 1: the two with most votes; the rest are "Outros"), but now LISTS them by ballot number: the lower number is segment `a` (red), the other `b` (blue), whoever leads. "Outros candidatos" stays last. `ranking` stays most-votes-first and remains what the headline, margin line ("Faltaram N votos"), arc, overlay, texts and facts read.
- New `leader(result)` (same file): the a/b segment with more votes, `undefined` on a tie or with fewer than two candidates. Nothing may read "first bar = leader" any more.
- Link-preview description (`preview.pair` in the catalog): both shares in ballot order, no word naming a leader: "..., votaram 63% do eleitorado; dos votos válidos, Fernando Haddad recebeu 30% e Jair Bolsonaro 70%." With a single candidate the old `preview.default` wording is used.

## Consumers, before and now
| Consumer | Before | Now |
|---|---|---|
| City card bars (`turnoutBar`), legend, bar text alternative (`toTurnoutBarProps`, `toLegendRows`) | by votes, leader first | ballot order |
| Share picture and link-preview picture (`share-card.ts`, reads `voted`) | by votes | ballot order |
| Link-preview description (`link-preview.ts`) | `voted[0]` as the leader, one share | both shares, ballot order, no leader word |
| Three-cycle page, replay (`cycles-model` `orderedSides`) | ballot order (re-sorted) | ballot order (unchanged) |
| Meu Brasil card (`buildCycleBlock`) | ballot order | unchanged |
| State recap (`recap-card`, left/rival from `runoffPair`) | ballot order | unchanged |
| Headline, margin line, arc, overlay, city texts, fact margin record (`ranking`) | true leader by votes | unchanged |
| Fact records for candidates (iterate `voted`, keyed a/b) | by votes | ballot order; same numbers, `check:facts` and `check:facts:real` green |

## Tests
- `src/shared/ballot-order.test.ts`: one table-driven test feeds the table's candidates (3 cycles) to the card, legend, text alternative, share picture, preview description, three-cycle block and recap in a city won by the first, won by the second and a tie; `leader()` cases; 2018 Haddad 13 / Bolsonaro 17 real-data shape; round 1 with "Outros"; one candidate missing.
- Updated pins: link-preview unit and e2e description, share-card swap test, candidates colour test, city-model unlabelled-number order.
- e2e `city.spec.ts`: Cidade Exemplo 2018 round 2 (second candidate leads) lists Candidato A first in bars, legend and aria-label (10x repeat, phone and desktop, green).

## Budgets (gzip, as `check:perf` measures)
City html 6515 B of 6554 B (unchanged), shared CSS 16359 B of 16384 B (unchanged). `check:perf` green.

## Sketch
The card frames (v3 "2 Cartão da cidade ..." x8 and the desktop frames) already show the first candidate (Lula / A, 52%) first with the second after it; none showed leader-first against ballot order, so no frame changed.
