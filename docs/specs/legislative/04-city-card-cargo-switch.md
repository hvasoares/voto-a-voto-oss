# 04. City card cargo switch

Ticket: none yet. Depends on: [01 Hydrated delivery pattern](01-hydrated-delivery-pattern.md). Shared decisions: [README](README.md). Feeds: [05](05-brancos-e-nulos-por-cargo.md).

## Problem Statement

- **Claim.** In this city, for the chosen cargo and cycle, the party vote was split this way: bars of party abbreviations as a share of the valid votes, and one count of how many parties took more than a stated share.
- **Misreading to kill.** "More parties above the line means more competition or more choice" (it measures how the votes were split, not how close the race was, not ideology, not seats). Second: for Senador 2018 and 2026, "the bars are the share of people" (each voter had two votes; the bars are shares of votes).
- **Who asks.** The visitor who read the presidential card of their city and asks "and for Senate and Chamber?".
- **Constraint.** The city card HTML has about 120 B gzip of headroom on the fixture (`perf-budgets.md` shows 5760 B of 6553 B in the latest 1.14.1 note; re-measure before ticketing) and 57 real city pages are already over 6.4 KB. The card gains almost nothing at first paint.

## Solution

A `Presidente | Senador | Deputado Federal` switch on the city card. `Presidente` is today's card, untouched. Tapping `Senador` or `Deputado Federal` loads the city's legislative shard and opens a panel under the switch, as an island that hydrates on first touch (`client:interaction`). The panel has: the cycle chips, the bars (top parties plus "Outros (N partidos)"), the count line, the threshold control, and "ver cálculo" beside every figure. Without JavaScript the card shows one plain link to the state's accessible table by cargo (specs 01 and 03).

## User Stories

- As a visitor with no JavaScript, I follow the link row and read an accessible table of parties by cargo for my state, with the city's own figures when spec 01's table has them.
- As a keyboard or screen-reader visitor, I move through the switch as a labelled group of three buttons (`aria-pressed`), the threshold as a native `select`, and every bar row reads "PT, 31,2% dos votos válidos"; colour carries nothing.
- As a suspicious reader, I open "ver cálculo" beside the count and each bar and see the rule, the dataset fields, and the sum with this city's numbers.
- As a visitor on a phone over 4G, the first paint is the card as before (+ at most the footprint below); the legislative script and shard download only when I touch the switch.
- As a visitor who changed the threshold, I see which limit I chose and that the figures were recomputed on my device.

## Implementation Decisions

**Prerendered footprint (the cap).** Budget line: the existing `/rj/cidade-exemplo/` route in `scripts/perf-budgets.ts`. Cap: html at most +100 B gzip, css +0 B (existing classes only), eagerJs +0 B (headroom is 153 B and not for this). Measured the way every card change is: `npm run build && npm run check:perf`, then compare `html` and `eagerJs` in `web/perf-record.json` before and after, on the fixture, and `scripts/measure.ts` (390x844, gzip) for the numbers written in `perf-budgets.md`. The 57 real cities over 6.4 KB are not audited by `check:perf`; the ticket measures the five largest with `measure.ts` and requires the same delta. How the cap is met: the switch is one island whose server output is the plain link row (the no-JS state) and takes the city from the card's existing `data-uf` and `data-slug`, so no props are serialised. `islandJs` is declared 3 KB for the card and a `client:interaction` island is counted there though it does not load at first paint; the ticket proposes a reviewed `BUDGETS` change for `islandJs` (old and new value in the commit, as the file demands) and does not hide the island behind a dynamic import.

**Default cycle and the cycle rule.** Today the card opens on the latest round of `LATEST_CYCLE` (`lib/facts/model.ts`), or on `?ciclo=&turno=` (`viewHref`). The panel opens on the card's active cycle (so 2018 selected on the card opens 2018), with its own chips for 2018, 2022 and 2026. Legislative cargos have no round: the round tabs stay as they are and the panel says "turno único". The chips change the panel, not the card's address.

**Switch and loading.** One toggle component for the three islands that have one (`CityMapMap.tsx`, `StateMapMap.tsx`, `StayHomeMap.tsx` each draw a `role="group"` pair): extract it as a shared piece and build this switch on it (the own-copies guard fails on a fourth copy). Taps before hydration use the held-tap queue (`lib/island-ready.ts`, `scripts/island-pending.ts`); the deep link is `?cargo=senador|deputado` read like `?vista=mapa`, kept in the address like `keepVistaInUrl`. The island publishes `data-ready`/`data-error` through `components/use-island-ready.ts`, loads data through `components/use-city-shards.ts` (the pattern of spec 01), and links states and regions with `PlaceLink`.

**One pure function, `partyShares(votes, { minShare })`** in `web/src/lib/` (name to the ticket): input the city's party votes for one cargo and cycle; output `{ bars, outros: { parties, votes }, above, effective, total }`. Used by the build (default threshold, fact records) and by the browser (any threshold): one code path, so the page and its record cannot differ.

- *Unit.* Party (not candidate, not coalition); federations (2022, 2026) are one unit, the list that competed. Votes of a party = its candidates' votes in the city (legend votes are not extracted yet; flagged below).
- *Shares.* Share of valid votes for the cargo in the city: valid = nominal + legend, so with no legend votes the denominator is the sum of the extracted party votes and the line says "votos nos candidatos".
- *Count above threshold* = number of units with share strictly above `minShare`.
- *Effective number* (Laakso-Taagepera) = 1 / sum of share squared over all units. Ranges from 1 (one unit has everything) to the number of units (equal shares).
- *Misreading of the effective number.* It is not a count of real competitors; it falls by construction when parties merge into a federation (2022 onward), so it must not be compared across cycles; it ignores the political meaning of parties.
- *Recommendation.* Headline the **count above the threshold**: it is one sentence anyone can audit. Compute the effective number in the same function and show it only in "ver cálculo" and in the state and Brasil pages. Owner decision below.
- *Threshold control.* A `select` with 1%, 2%, 5% and 10% "só partidos com mais de X% dos votos válidos"; **default 5%**. It changes the bars (units above the limit, at most 6 rows) and the count; the rest folds into **"Outros (N partidos)"**, N being computed. Ties on votes are listed lower ballot number first (`shared/ballot-order`). Rounding: `largestRemainder` as the card does.

**Senador and the two votes.** 2018 and 2026 renew two seats per state, so each voter has two votes (2022: one). The bars are the **percent of votes**: party votes over valid votes cast (the denominator the TSE counts); they add to 100%. "Percent of voters" (votes over voters) would add to up to 200% and cannot be stacked or compared with Deputado, so it is not shown. The legend says "cada eleitor tinha dois votos; as barras são parte dos votos, não das pessoas". A party with two candidates sums both. The ticket checks in the data manifest that the totals per cargo are in votes; a field "votes per voter" per cargo and cycle should come from the data task rather than be hard-coded.

**Records and sentences.** Fact records in `lib/facts/` (`model.ts`, `other.ts`; gate `gate.ts`), ids `<uf>/<slug>/<ciclo>-<cargo>/<medida>` with measures `partidos` (the count), `efetivo`, `p-<sigla>` per bar and `outros`. Only `LATEST_CYCLE` has pages per city (`web/docs/facts.md`, Deviation 2); earlier cycles link `/fato/metodo/ciclos-anteriores/#…` with six-plus new method records. One fact page per city for both legislative cargos (not per cargo), shared with spec 05. Because the visitor can move the threshold, records are built for the default only; a recomputed figure shows its working inline (the parties summed) and its "ver cálculo" opens the rule record, labelled "limite escolhido por você". Catalog: a new `lib/sentences/catalog-legislative.ts` in the `Object.assign` style of `catalog-season.ts`, both registers (`standard`, `plain`), nothing typed in components. Labels (pt-BR, plain register): "Votos por partido para {cargo} em {cidade}, {ano}"; "{n} partidos tiveram mais de {x}% dos votos válidos"; "Outros ({n} partidos)"; "Só partidos com mais de {x}% dos votos válidos"; "Cada eleitor tinha dois votos: as barras são parte dos votos, não das pessoas"; "{n} votos válidos". No "vencedor", no "mais votado", no "por quê".

### Visual decisions

- **Chart family.** Horizontal bars, one row per unit with the abbreviation and the printed percent: the finest honest grain is the municipality, and a list of labelled rows reads on a phone and by screen reader; a pie or map would imply geography or seats.
- **Palette.** One neutral ink token for every party bar and `cand-outros` for "Outros" (`shared/tokens.ts`); the red and blue `cand-a`/`cand-b` stay reserved for the presidential pair. No party colours (they would favour). Identity is carried by the label and position, so a colourblind reader loses nothing.
- **Scale.** Fixed 0 to 100% axis, same for every cargo and cycle, so bars compare across tabs; small shares stay small, with the number printed. A tick for the chosen threshold, labelled with its value.
- **Legend copy.** Computed by the build and the island from `partyShares`, never typed: base ("% dos votos válidos para {cargo}"), threshold in words, the N folded in "Outros", and the two-vote note when the cycle has it.
- **Annotations.** The threshold tick; the two-vote note; "limite escolhido por você" when changed. No other.
- **Fallback.** No JavaScript: the link row to the accessible state table. Island failed: the panel says "Não deu para carregar os dados deste cargo. A tabela do estado está em [link]", sets `data-error`, and the card above is unaffected.

## Testing Decisions

- Unit (output-based, parametrised, no mocks): `partyShares` on a synthetic city: shares sum to 100; effective number is 1 for one unit and N for N equal units; threshold edges (exactly at the limit is not above); folded count N; ties; one unit; zero valid votes; Senate two-vote cycle.
- Catalog test: every key exists in both registers; fact-gate coverage: the card cannot print a figure without its record (`factLinks`).
- Integration: the built city page has the link row, no legislative script among `eagerJs`, and `check:perf` stays "All budgets met." with the html delta at or under the cap.
- e2e: serial, committed fixture, presets and `data-ready` waits; figures from `real-data-oracle.ts` and sentences through `catalogText`.
- Assert structure and interaction only; never canvas or SVG pixels.
- Generated artifacts (geometry, shards) are pinned byte-for-byte on a synthetic fixture (determinism) and checked against the real dataset by a `check:` script at build time.
- Join invariants fail the build loud: every entity the visual claims to cover appears exactly once.
- e2e runs over the committed fixture dataset; suites are serialised (shared E2E port; never parallel agents).
- Exit criteria include the screenshot-review protocol and a ux-review pass on the phone frame, not just green tests.

## Out of Scope

- Share card "Sua cidade em três cargos" (the share-picture builder, `lib/share-picture*.ts`, a new writer): follow-up, not here.
- Candidate-level views, named non-elected people, seats and elected (specs 02, 03, 06); party legend votes until the extraction exists; party colours; cross-cycle comparison of the effective number; Presidente party mix; a state-level version of this panel.

## Further Notes (decisions for the owner)

1. Headline measure: count above threshold, effective number in "ver cálculo" only (recommended), or the effective number as headline.
2. Default threshold 5% (recommended), with 1, 2, 10 offered.
3. Party legend votes: ship with nominal votes only and the label "votos nos candidatos" (recommended), or wait for `votacao_partido_munzona_<year>.zip`.
4. 2026 Senate has two votes per voter (inferred from 54 seats; not verified in the data): confirm and add the field to the manifest.
5. Raise the card's `islandJs` budget (recommended) versus a smaller island.
6. One fact page per city for both legislative cargos, 2026 only (about 5,760 pages), versus method-page records only (recommended: per-city page, as the card does today).
7. 2018 coalitions are not in the extraction: the unit is the party that year.
