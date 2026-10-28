# Cidades fora da curva: the method (ticket #34)

A report under Relatórios that lists the cities furthest from their peer cities on turnout and on the swing since 2022. It is a **screening list**: a place to
start checking the data, never a conclusion about any city. The page says so above the list ("Lista de triagem, não uma conclusão"), in the share text and in a
note under it; no sentence says a city is irregular, suspicious or wrong, gives a cause, or names a city in the share. The code is `src/lib/reports/outliers.ts`
(pure), `outliers-view.ts` (the words of a list), `outliers-load.ts` (build time), the page `src/components/OutlierPage.astro`, the records `src/lib/facts/other.ts`
(`outlierRecord`, `outlierCountRecord`, `outlierFactPages`). The sentences are the catalog's `outlier.*` (`catalog-outliers.ts`) and `fact.outlier*` (`catalog-facts.ts`).

## The measures

Both are of the **2nd round**, the round the other reports of the hub use. Overseas posts (uf `zz`) are never cities here.

| | Definition |
|---|---|
| Turnout | `comparecimento / aptos` of the 2nd round of 2026, in % |
| Valid votes | `validos` of the 2nd round of 2026: the volume printed next to the rate, and what the minimum filters on |
| Swing since 2022 | margin of the 2nd round of 2026 minus margin of the 2nd round of 2022, in pp of each round's valid votes, between the **same two ballot numbers** (the pair of the 2026 runoff, "first" = the lower number, as in the other reports). `+` means the margin moved toward the first |

## Peers and the typical

Peers are the five nearest cities of `peers.json` (#23, `web/docs/peer-similarity.md`: size band, round-1 turnout, margin and history of the three cycles). The
**typical** is the **median** of the peers that have the measure (a peer without the 2nd round of 2022 has no swing: "sem dados", never zero). A city needs at least
three peers with the measure, for both measures; otherwise it is not compared. The **gap** is the city's value minus the typical, in pp.

## The order

`distance = sqrt(zT² + zS²)`, where `zT` and `zS` are the turnout gap and the swing gap divided by the standard deviation of that gap over **all** the cities compared
(so the filters do not move a city's distance), the two measures weigh the same, and the sign of a gap does not matter for the order (both signs are printed). Largest
distance first; equal distances (at 1e-9) by `uf/slug` in code-point order. The rank printed is the position in the filtered list.

## The filters

Minimum valid votes in the 2nd round of 2026: 1 mil, **5 mil (the default: cities below it are hidden)**, 20 mil, 50 mil. State: all or one. Each combination is a static page,
`/relatorios/cidades-fora-da-curva/<uf|todos>/<minimo>/` (the plain address is the default list), so the filters are links and work without JavaScript. A list shows
its first 25 cities and says how many the filter compared. Every row shows the valid votes next to the rate, links to the city card, and has its fact record
("ver cálculo": the votes of both cycles, the five peers with their figures, the median and the calculation); the page has the "conferido" seal.

## Limits

- Peers are similar in size, turnout, margin and history of round 1; the method knows nothing about region, economy or people. Being far from the peers says nothing about why.
- The 2nd round only; a city's first round enters only through its peers.
- A median of five is a rough "typical"; a city with a small electorate moves a lot with a few votes (hence the minimum).
- The list is one ranking on two numbers weighted equally; another weighting would give another order.

## Overlap with the remaining-reports ticket (#13), checked on the real data

#13 built absolute rankings (highest and lowest turnout among 5 mil+ electorates, biggest swings of 100 mil+ cities, closest races, votes gained and lost). This list is
relative to the peers and mixes turnout and swing, so it is not a duplicate. Measured on the real dataset with the default list (5 mil, all states, 25 cities, 3.588 compared):

| #13 list | Cities also in this list |
|---|---|
| Comparecimento mais baixo (10) | 5 |
| Comparecimento mais alto (10) | 0 |
| Maiores viradas, cidades de 100 mil+ votos (173 toward the first candidate) | 0 |
| Cidades que viraram (first 25) | 0 |
| Disputas mais apertadas (20) | 0 |

The overlap is with the lowest turnout, expected: a city with low turnout whose peers have high turnout is far from them. The page does not duplicate that report: it adds the peers, the swing, the
state and minimum filters and the screening wording.
