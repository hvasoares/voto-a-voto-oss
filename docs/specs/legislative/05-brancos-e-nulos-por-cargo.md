# 05. Brancos e nulos por cargo

Ticket: none yet. Depends on: [01 Hydrated delivery pattern](01-hydrated-delivery-pattern.md); shares the island and the fact page of [04](04-city-card-cargo-switch.md). Shared decisions: [README](README.md).

## Problem Statement

- **Claim.** In this city, the votes cast that counted for no list (blank and null) for president, senator and deputy, side by side, set against the gap in votes between the two most-voted lists. The page states arithmetic: which number is larger.
- **Misreading to kill.** "Blank and null votes decided the result" or "those voters would have changed it". Nothing here says who those voters are, whom they would have chosen, or that the result would differ; a gap between two lists is not how Chamber seats are assigned (seats follow a quotient), so for Deputado the comparison is a size comparison only. `docs/nonvoters-vs-margin.md` takes the same stance and this page copies its wording rule.
- **Difference from that measure.** It counts only people who went to the polls and cast a non-valid vote; abstention is not in it, and the count is of **cities, never people**.
- **Who asks.** The visitor who sees "Brancos" and "Nulos" on the card for president and asks whether the same happened for Senate and Chamber.

## Solution

**Where it lives (absorb first).** Two surfaces, no new city route.
1. *Per city:* a second panel of spec 04's island, "Brancos e nulos", one row of three columns (Presidente, Senador, Deputado Federal): blank, null, other non-valid, the gap, and the relation word. It reuses the island, the shard, the cycle chips and the fact page of 04, so first-paint bytes on the city card are 0 beyond 04's cap. A page of 5,570 city rows would be a ranking nobody asked for and 400 KB of HTML.
2. *National and per state:* a report page `/relatorios/brancos-e-nulos/` through `layouts/ReportLayout.astro` (the pattern of `pages/relatorios/*`: `reportFacts().calc`, `seal`, `ReportNotice`, `ReportTable`), static, no island. Rows: Brasil (sem exterior) and 27 states; per cycle and cargo: cities in the base, cities where the non-valid votes exceed the gap, share of cities. Three cycle sections on one page, anchors `#2018`, `#2022`, `#2026`, default the latest. It names no city. A state page absorbs nothing yet (see Out of Scope).

## User Stories

- As a visitor with no JavaScript, I read the report's tables (all text) and follow the link row of spec 04 to my state's accessible table; I get no per-city panel and the page says so.
- As a keyboard or screen-reader visitor, I read each table with real headers (`th scope`), the relation as a word ("maior", "menor ou igual") and never by colour alone.
- As a suspicious reader, I open "ver cálculo" beside every number and see the identity, the dataset fields (`turnout`, per cargo) and this city's sum.
- As a visitor on a phone over 4G, the report is under its budget and the city panel's data loads only on my tap.
- As a reader of the report, I see that it counts cities and that no list singles any of them out.

## Implementation Decisions

**Definitions** (per cargo, city, cycle; fields of the extraction, `data/legislative/`):
- `votos` (turnout totals) = `validos` + `brancos` + `nulos` + `anulados` + `anulados_subjud` + `apu_sep`. The build checks the identity for every city and cargo and fails if it does not hold.
- *Brancos*: the voter chose "branco". *Nulos*: the TSE `nulos` total (a number matching no candidate, or an invalid ballot; the data cannot tell deliberate from by mistake, and 2026 `nulos` can include technical nulls, as `nonvoters-vs-margin.md` records). *Anulados* and *anulados sub judice*: votes for candidacies the Justice voided or had under judgement; *apurados em separado*: votes counted apart (voter not on the section's list). The exact TSE wording of the last three must be quoted from the TSE file layout by the ticket (not verified here).
- **Counted as "blank or null"**: all non-valid votes cast, `votos − validos`, shown in three parts: brancos, nulos, and "demais não válidos" (anulados + sub judice + apu_sep). Reason: no vote cast disappears from the sum; it reconciles with the card, which folds apuração separada into nulos (`shared/city-model.ts`). The row and the table print brancos and nulos separately so the title is honest. Abstention is out.
- **Gap.** First minus second most-voted list in the city, second = 0 if only one list has votes. *List* = federation where the data carries one (2022, 2026), otherwise the party (2018 coalitions are not in the extraction). *Chamber*: list votes = its candidates' votes (legend votes not extracted yet; labelled "votos nos candidatos"). *Senate*: **party level** (consistent with the Chamber and with the README's no-named-non-elected rule; a party with two candidates sums both). In 2018 and 2026 every voter has two votes, so both sides are in votes (the non-valid count is votes too: a voter may cast one valid and one blank), the sum of lists is about twice the voters, and the sentence says "votos, não eleitores". *President*: the two most-voted candidates in the 1st round, as in `nonvoters-vs-margin.md`.
- **Relation** is "maior" only when strictly larger; equal is "menor ou igual". Cities without turnout or without valid votes are out of the base and counted ("cidades fora da base: n").

**One pure function** `nonValidVsGap(totals, listVotes)` in `web/src/lib/` (the hub of `lib/margins.ts` and `lib/reports/compute.ts` is the neighbour; the existing measure is Python, `make nonvoters`, pinned by `tests/integration/test_nonvoters_note.py`): returns `{ brancos, nulos, others, nonValid, gap, relation }`. The island, the report and the facts call it; the report's tables are summed from the same city results. Cross-check: the real-data oracle (`web/e2e/real-data-oracle.ts`) recounts from the data directory independently of the function.

**Aggregates.** Per state: cities in the base, cities with `nonValid > gap`, percent of cities. Brasil (sem exterior): the same, uf `zz` excluded as in the existing note. Per cycle and cargo. The unit is the city; no electorate-weighted percent in v1 (that would speak of people).

**Records and sentences.** Measures `brancos`, `nulos`, `demais`, `naoValidos`, `diferenca`, `relacao` per `<uf>/<slug>/<ciclo>-<cargo>/`, on spec 04's per-city fact page (2026) and the method page for earlier cycles; the report uses `reportFacts()` and `lib/facts/pages.ts` like its siblings, with a seal for the sums the build checks. Catalog: `lib/sentences/catalog-legislative.ts`, both registers, e.g. "{n} votos em branco e nulos para {cargo}; a diferença entre as duas listas mais votadas foi de {g} votos"; "A conta é de cidades, não de pessoas"; "Isto compara dois números; não diz quem votou em branco nem se o resultado mudaria". Report notice carries "lista de triagem, não uma conclusão" only if a list ever names cities (it does not in v1).

### Visual decisions

- **Chart family.** No chart: a table. Three numbers per cargo are exact comparisons and the finest grain is the municipality; bars would invite reading ratios as outcomes. The city panel is a three-column row (`ListRow`-like rows), the report a `ReportTable`.
- **Palette.** Tokens from `shared/tokens.ts`, text-first; the relation word is the carrier, never hue (no red for "maior"). `abstencao` stays unused here.
- **Scale rule.** No scale; counts with `number-format.ts`. If a share of cities is drawn as a bar, it is a plain 0 to 100% bar in one ink.
- **Legend copy.** Computed by the build from the function and the catalog: which votes count as non-valid, what the gap is for each cargo, the two-vote note for 2018 and 2026 Senate, the base ("{n} cidades; {m} fora da base").
- **Annotations.** Row note on Deputado ("a diferença entre duas listas não decide cadeiras"); Senate two-vote note. None else.
- **Fallback.** No JavaScript: the report is complete; the city panel's replacement is the link row. Island failed: same text as 04, `data-error`.

## Testing Decisions

- Unit (output-based, parametrised): the identity and its failure; equal numbers are not "maior"; one list only; zero valid votes; the three cargos and the two-vote cycles; federation versus party; brancos/nulos split sums to `votos − validos`.
- Report: builds with `assertReportPage`; the facts gate refuses an uncovered figure; aggregates equal the sum of the city results; Brasil excludes `zz`.
- e2e: serial, fixture, presets and ready attributes; figures from the oracle, sentences via `catalogText`.
- Assert structure and interaction only; never canvas or SVG pixels.
- Generated artifacts (geometry, shards) are pinned byte-for-byte on a synthetic fixture (determinism) and checked against the real dataset by a `check:` script at build time.
- Join invariants fail the build loud: every entity the visual claims to cover appears exactly once.
- e2e runs over the committed fixture dataset; suites are serialised (shared E2E port; never parallel agents).
- Exit criteria include the screenshot-review protocol and a ux-review pass on the phone frame, not just green tests.

## Out of Scope

- A ranked or filtered list of cities by blank rate or by "exceeds gap" (it would need the screening frame and invites an irregularity reading); abstention (that is `nonvoters-vs-margin.md`); causes of blank and null voting; electorate-weighted shares; second round and 2nd-round president; a state-page absorption; the share card; seat or quotient calculations (spec 02). Budget: the report becomes an audited route in `check:perf` (the `region` precedent: html about 4 KB, JS 0 B), baseline measured by the ticket; the city panel adds no first-paint bytes.

## Further Notes (decisions for the owner)

1. Non-valid votes counted as all of `votos − validos` (recommended) versus strictly brancos + nulos.
2. Senate gap at party level (recommended) versus candidate level.
3. Chamber gap on nominal votes until the legend file is extracted (recommended) versus waiting.
4. Whether to run the comparison for Deputado at all, given that seats follow a quotient (recommended: yes, with the row note, since the owner asked for all three cargos).
5. A city list in the report: none in v1 (recommended); if wanted, alphabetical per state, with the screening frame.
6. Python twin of the measure (as `make nonvoters`) versus the TS function with the oracle only (recommended: oracle).
7. The exact TSE definitions of anulados, sub judice and apurados em separado, and whether Senate totals are in votes or voters per cycle: unverified, the ticket confirms from the TSE layout and the data manifest.
