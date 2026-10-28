# Fact records (#61, #62)

Status of #62: records, seal, gate and highlight are done for the city card, Brasil e regiões, Comparar com 2022 / 2018, Três ciclos por estado, and every report (Cidades que viraram, Maiores viradas, Comparecimento,
Votos ganhos e perdidos, Disputas mais apertadas, Como cada grupo votou), the Relatórios hub, the state page and the state recap.

Every number the site publishes on a page that has a record is a **fact record**: an id, a sentence (standard and plain register, from the catalog),
the numbers it is made of (each with the dataset field it is read from, `turnout.csv · aptos`), the **source**, and the **calculation** (the rule in
words and the same rule with the numbers in it). Code: `src/lib/facts/` (model, gate, loader, link), page: `src/pages/fato/[uf]/[slug]/[page]/`,
styles: `src/styles/fact.css` (only that page loads it), site-level gate: `integrations/facts-gate.ts`, data-level check: `npm run check:facts`.

## Addresses and ids

| | Form | Example |
|---|---|---|
| Id | `<uf>/<slug>/<ciclo>-<turno>/<medida>` (curiosities: `<uf>/<slug>/comparacoes/<código>`) | `rj/cidade-exemplo/2026-1/votaram` |
| Page | `/fato/<uf>/<slug>/<ciclo>-<turno>/`, the record is the fragment `#<medida>` | `/fato/rj/cidade-exemplo/2026-1/#votaram` |

The id names the place, the cycle, the round and the measure, never a number or a position: the same place, measure and cycle keep the same id in every edition
(the unit test pins it with different numbers). Measures of the city card: `frase` (the card's sentence), `votaram`, `naoVotaram`, `a`, `b`, `outros` (round 1 with more than
two candidates), `abstencao`, `brancos`, `nulos`, `margem`. The cards of the curiosities have `td tu ml mh bl bh`.

**Deviation 1, one page per view, not one per number.** The ticket says each number has "its own permalink page". The real dataset has 5,760 cities, about 57 records per
view-set: one page per record is 328,502 pages (`check:facts:real`). Each record is still its own address (fragment), its own section with its own id, and the page highlights the one the link names (`:target`).

**Deviation 2, only the latest cycle has a page per city and round (measured, see #62).** One page per city, cycle and round was 35,335 pages and 757 MB raw (about 21 KB each; the real site went from 1.0 GB to 1.77 GB
raw and 64,302 pages). With only the latest cycle (2026, two rounds, plus the curiosities) it is 12,383 pages and 256 MB. The "ver cálculo" of a 2018 or 2022 view of the city card opens the one page
`/fato/metodo/ciclos-anteriores/#<tipo>` (`olderCyclesFacts`, six records: the sentence, voted, did not vote, candidates, blank/null/abstention, margin) which gives the rule, the dataset fields and the
formula of each kind of figure, in both registers, with the seal; it has no worked numbers of a city (its worked line says to replace each quantity by the city's). The records of the earlier views are still built
and gated for every city (`load.ts`), so the card cannot print a figure without its record; only their pages are not written. `LATEST_CYCLE` (`model.ts`) is the one constant.

## What the card links

Next to every figure: both bar titles, the five or six legend rows, the sentence (one link for both registers) and the margin line, and one on each fact of the curiosities card.
A card, a figure or a record without its counterpart does not build:

1. `factLinks` (gate.ts) refuses to hand out a link for an anchor with no record, and refuses every link when any record of the page fails `factProblems`
   (no id, no sentence, no source, no calculation, no inputs, a repeated id). The card builders (`slots/city/card.ts`) require `links`, so a figure cannot be printed without a record.
2. After the build, `integrations/facts-gate.ts` reads the pages written: every record page shows inputs, calculation, source link and edition link, and every "ver cálculo" of
   every page lands on a page that exists and has that record.
3. `npm run check:facts` runs the same record checks over a whole dataset (fixtures by default, `check:facts:real` for `../data`) without a build.

Tests: `src/lib/facts/model.test.ts` (records, calculations, edge cases, ids, gate failures on fixtures), `src/slots/city/card.test.ts` (the links, a card with a failing record cannot be drawn),
`integrations/facts-gate.test.ts` (failing site fixtures), `e2e/fatos.spec.ts`.

## Wording and methods

The sentences are catalog keys `fact.*` (guarded by `outside-catalog.test.ts`); the card's sentence and the margin line are the very strings the card prints. The page says
the numbers are arithmetic over the TSE file and do not say why anyone voted or stayed home. Records of derived numbers cite the note of their method: the margin
`docs/nonvoters-vs-margin.md`, the curiosities `web/docs/curiosities.md` (the size band: `web/docs/peer-similarity.md`).

The percentages the card prints are whole numbers rounded so the parts of a bar add to 100 (`largestRemainder`); the record shows the exact value (`70,0%` as `70%`, `33,6%`)
and "No cartão: 70%". Not covered by a record: the arc label and the twin line (they print years and a name, no computed figure).

## Other pages (#62)

`src/lib/facts/other.ts` builds the records of Brasil e regiões (`brasil/<ano>-<turno>`), Comparar com 2022 / 2018 (`comparar/<ciclo>/estados`), Três ciclos por estado
(`estado/<uf>/tres-ciclos`) and Disputas mais apertadas (`relatorios/disputas-mais-apertadas/cidades`); `pages.ts` gathers every page of records (cities included), runs the gate over them
and hands `sealOf` to the pages. One route draws all of them: `src/pages/fato/[...path]/`. These pages link per figure group (a bar, a region, a state row, a cycle, a race), not per
number: the record of every number of the group is on the page the link opens. The build gate covers them: a link to a record that does not exist, or a record without source, calculation, inputs or check, fails the build.

## The "conferido" seal

`src/lib/facts/checks.ts` runs the build's own checks, once per build, over the dataset (`checks-load.ts`): **national** (the site's national comparecimento and votos válidos of a cycle and round
against the totals the edition recorded when it was published, which `make data-check` already compared with the TSE national totals) and **municipios** (the sum of every city shard, overseas posts
included, of electorate, turnout and valid votes against the national sums, and the sum of the regions against them). A failed check fails the build. Each fact names the checks that cover it
(`Fact.checks`); the seal of a page (`components/Seal.astro`) has one line per check and round the page uses, written from the catalog (`seal.*`) with the measured numbers. No seal text is typed anywhere.

## The sentence highlight (desktop only)

`components/FactHighlight.tsx`, the only island of Três ciclos por estado, `client:media="(min-width: 1024px)"`. It renders nothing on the server and fetches the page of the calculation of the
state (`/fato/estado/<uf>/tres-ciclos/`, a desktop-only request) and reads the records from it (`lib/facts/parse.ts`). The sentences are buttons (click, tap, Enter or Space; Escape clears);
choosing one lights the bar segment (`[data-seg]` of the page) and the table cells of its cycle and writes the calculation beside them in a polite live region, so every highlighted value is also
readable by keyboard and touch. Styles are inline: the phone's stylesheet gets only the `.seal` rules (+166 B gzip in all).

## Reports, hub, state page and recap (#62, last checkpoint)

`other.ts` also builds: `swingFacts` (Cidades que viraram, Maiores viradas: both rounds' votes and valid votes, the margins and their change; Maiores viradas adds the filter count and the cities that moved the other way),
`turnoutListFacts` (Comparecimento: each rate with its volume, plus the filter count), `deltaFacts` (Votos ganhos e perdidos: the national sum per candidate and each listed city; the 2022 votes are 2026 minus the change),
`cohortFacts` (Como cada grupo votou), `hubFacts` (one record for each headline figure of the hub, same builders) and `stateCountFacts` (the number of municipalities of the state page, from `cities.csv`).
The state recap links to the three-cycle records of its state (the same shares and changes), one link per cycle. Every page has its `Seal`; `integrations/facts-gate.ts` now also fails a fact page without the seal.

**Como cada grupo votou, neutrality.** Its numbers count CITIES grouped by who had more votes in 2018 and 2022; they say nothing about who voted for whom or why, and the groups have no order of importance. The page and its
fact page say so in plain words (`fact.cohort.limits`); the records say "cidades" in every sentence ("A conta é de cidades, não de pessoas"); nothing ranks groups or people (tested).

## The catalog split

The fact and seal sentences live in `src/lib/sentences/catalog-facts.ts`, which registers them in `CATALOG` when imported (only the fact modules and `Seal.astro` import it). Putting them in `catalog.ts` added 14 KB raw
(3.3 KB gzip) to the share code (`share-card`) that the recap and share pages load on a phone; measured with `scripts/measure.ts` and fixed here: the JS of those pages is again byte-identical to before G6.
