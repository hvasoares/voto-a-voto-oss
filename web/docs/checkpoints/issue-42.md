# Issue #42 (State season: three episodes): checkpoints

Where it lives: the frames "13b Temporada do estado" / "13c Temporada de trás para frente" are the three-cycle page of a state (`/tres-ciclos/<uf>/`, screen 13 of #14, the page the ticket is blocked by). The state's municipality list page (`/<uf>/`) is untouched.

1. **The season and its pivot, pure.** `src/lib/season.ts` + `src/lib/sentences/catalog-season.ts`: episode n is cycle n (2018, 2022, 2026); the pivot sits between episodes 2 and 3 and comes from a closed list of templates:
   `change` (the share of the page's first candidate varied {pp} pp between the 2nd rounds of 2022 and 2026 (the page's own number, with its record), and in N of the TOTAL cities the side with the most votes changed), `steady` (nothing changed: the share is the same to
   the decimal and no city changed side: plain text), `single` (a one-city state, e.g. DF: "nela, o lado com mais votos ... mudou / não mudou"), `missing` (names the year(s) with no 2nd round: no number is printed). One-city and zero-city count phrases have their own template. Tests: every kind, both
   registers, the count of cities, a share that did not move while a city did (still a change), a state whose cities lack cycles (the share sentence with no count) and neutrality (no why, no winner/loser word).
2. **Arc counts use the city arcs.** `arcs.json` gained `byState` (the counts of #41 per state; the overseas posts are not a state; `SHARD_GENERATOR` is `voto-shards/7`). The count of the pivot is `switched2026 + returned + switchedTwice` over the cities with the three cycles and no tie
   (`same + switched2022 + those`): the arcs of #41, not a second computation. Tests: `arcs.test.ts` (per state) and `season.test.ts`.
3. **The page.** Each episode is a pre-rendered block with a stable anchor (`#2018`, `#2022`, `#2026`) and a header "Episódio n · ano"; the pivot is an `<aside>` between the 2nd and the 3rd; everything is in the HTML in reading order (e2e without scripts). A link to an anchor lands on the episode (the
   episode is highlighted by `:target`; at 390x844 the block starts in the first screen). The numbers of the pivot have their record: `2026-viradas` on the page of the calculation of the state (`estado/<uf>/tres-ciclos`), with the arc counts as inputs and the note of #41 as the method; the share's own record
   (`2026-variacao`) already existed. `check:facts` / the build gate cover it.

## Screenshot review (390x844, scroll 0, fixture `/tres-ciclos/rj/`)

Frame "13b Temporada do estado" (id E8B8108F-5101-4C7E-B3B9-5F37E37E1252), whose state is "São Paulo" with Lula and Bolsonaro; the fixture is RJ with A and B.

| # | Location | Frame shows | Render shows | Severity |
|---|---|---|---|---|
| 1 | title | the state's name, then "Temporada em três episódios · Presidente, 2º turno" | the page's title "Três ciclos por estado", its intro and the state chooser (the #14 page, kept), then the same sub line | accepted: the season is a layer on the #14 page, which other tickets and desktop frames rely on |
| 2 | switch | "Cronológica" (active) / "De trás para frente" | same, 44 px high, hidden without scripts | none |
| 3 | episode card | "EPISÓDIO 1 · 2018", "#2018", bar, "Ponto de partida da série", legend | same header and anchor; the card also has the page's "RJ · 2018" heading and the "ver cálculo" link (G6) | accepted (G6 requires the link) |
| 4 | pivot | "Entre 2022 e 2026 a diferença de Lula mudou +1,4 pp. Em 38 de 645 cidades o vencedor mudou." | "Entre 2022 e 2026, a parcela de A nos votos válidos do 2º turno variou -1,9 pp. Em 3 das N cidades com os três ciclos o lado com mais votos mudou." | accepted: neutral wording (no "vencedor", no "diferença de Lula"): the share the page already prints and the cities of the arcs |
| 5 | legend | "Vermelho = Lula · Azul = adversário" | the page's own legend below the season | accepted |
| 6 | status bar "9:41", home indicator | drawn | absent | accepted-platform |

Verdict: PASS (no blockers).
