# 03. Party and federation page

Ticket: none. Depends on: 01 (hydrated delivery pattern), 02 (elected and seats). Index: [README](README.md).

## Problem Statement

- **The claim.** For a party or federation, per cargo (Senador, Deputado Federal) and cycle (2018, 2022, 2026): in how many cities it passed a stated threshold, where those cities are, how many votes it received, how many seats it won and who was elected. A reader who knows a party but not a city has no way in today: every route starts from a place.
- **The misreading.** (a) "Map colour = how strong the party is" read as a ranking or as people ("this land votes X"): the map counts cities that passed a threshold, never people. (b) Two parties with the same abbreviation in different years read as one party (a renamed, merged or federated party silently continued). (c) Federation votes read as a party's own votes.
- **Who asks.** Journalists and curious voters who look for a party by name or abbreviation; the cohort of readers who arrive from a state or city page and want "where else did this party pass 5%?".

## Solution

A new route `/partidos/`: a search field (the city-search pattern) over parties and federations, and a prerendered table of the latest cycle. Each party or federation has its own page `/partidos/<id>/`. Per cargo and cycle the page prints, in this order: a presence table by state (cities that passed the threshold, of the cities with data), votes and seats (spec 02 figures), the elected (name, ballot number, alphabetical), then a "Mapa" view (hydrated) that colours cities by a sequential scale of the party's share of the valid votes of the cargo. Where a name differs by year the page says so in a line computed by the build.

## User Stories

1. As a visitor with no JavaScript, I open `/partidos/`, read the table of parties of the latest cycle, follow a link to a party page and read its state table and elected; every state row links to the state page.
2. As a visitor on keyboard or screen reader, I reach the search field, type "pt", arrow through results that announce name, abbreviation and kind (partido or federação), and press Enter to open the page; the map view is optional and every city on it is also a link in the state list.
3. As a suspicious reader, I click "ver cálculo" beside each figure (cities over the threshold, votes, seats) and get the fact record: source file, aggregation to municipality, threshold, denominator.
4. As a visitor on a phone over 4G at first paint, I get only the HTML of the table; the shard of the party and the map geometry load when I tap "Mapa" or the search.
5. As someone who read "2018: PSL" and "2022: União Brasil", I see the note that the name differs by year and that the two are not merged on this page.

## Implementation Decisions

**Route and absorption.** No existing page absorbs this job: city, state, region and Brasil pages are place-keyed, the reports hub lists reports (each a fixed question). A party-keyed index is a different entry point, so a new route, chosen by the owner. Linked from: the Home task list (one row, "Procurar um partido"), the footer's data group, the reports hub, the elected table of each state page (party abbreviation becomes a link), and the City card's elected block when spec 04 ships. Search reuses `CitySearch.tsx` through its controller (`slots/home/search-ui`, `shared/city-search.ts`) with a second shard `partidos.json` loaded on first interaction exactly as `lib/search-data.ts` does for `search.json`; the island is gated by `use-island-ready`.

**Id scheme (recommended).** The URL id is the abbreviation of the party in the cycle, lowercased and ASCII-folded (`/partidos/pt/`), federations as `fed-<abbreviations joined>` (`/partidos/fed-pt-pcdob-pv/`). The TSE number is the shard key and is printed on the page, but not the URL: a number is reused across years for different parties (it is bound to the party that holds it) and a federation has no number of its own. Collision rule: the abbreviation is unique within one cycle; when a later cycle reuses an abbreviation for a party of another number the build fails loud and the page id gains the number (`/partidos/<sigla>-<numero>/`). The page lists which cycles it covers; it never joins two ids.

**Party identity over time.** Out of scope for v1: a continuity table. In scope: the build compares, per party number, the abbreviation in adjacent cycles and prints "Em 2018 o número 17 era PSL; em 2022, UNIÃO" when it differs. A party present in one cycle only says so. Federations (from 2022) are their own entity; the member parties show "federado em 2022: <federação>" and each member keeps its own page for years without federation. Votes of a federation are never split among members (the data does not allow it); a member's page links to the federation's.

**Data and shard.** Inverted index of the municipality-keyed legislative data: `partido/<id>.json`, per cargo and cycle `{ cities: [[cdIbge, votes, shareBand]], votes, seats, elected }`, with the shared shard plumbing (`lib/shard-files.ts`, `shard-plumbing-guard.test.ts`, layout in `docs/shards.md`), versioned like the other shards. Votes are the nominal candidate votes summed (the legend votes are not extracted yet: the page says "votos nominais"; adding `votacao_partido_munzona` is a flagged decision). The threshold is share of the valid votes (from the municipality totals) of the cargo in the city. For the Senate in 2018 (two votes per voter) the denominator is the valid votes of the cargo, and the legend says so.

**No-JS story (recommended: index plus per-party pages, statically generated).** About 30 parties plus 3 to 4 federations per cycle, perhaps 60 pages across three cycles, against 5,570 city pages already built: negligible build time. One page with every party would carry the union of all tables (too heavy for a phone), and a client-only page has no zero-script story. A per-party page prerenders summaries, never the city list: 27 state rows per cargo and cycle, plus the elected (at most 513). The city list per state is read from the shard when "Mapa" or "Ver cidades" is used (hydrated list of links, the same rows as the map); with no JavaScript the state row links to the state page, whose city list is the way to each city.

**Budget line.** A new audited route class `party` in `scripts/perf-budgets.ts`, on the report shell: html 8 KB, css 16 KB, eagerJs 3 KB, islandJs 120 KB with the search and map islands under `client:interaction` (they do not load at first paint). The ticket fixes the measured baseline; an over-budget page lists elected only for the latest cycle and links older cycles to anchors fed by the shard. Any increase of the shared CSS follows the existing rule (edit `BUDGETS` with a commit that states old and new).

### Visual decisions

- **Chart family and grain.** A presence choropleth of one state's municipalities (`CityMapMap.tsx` pattern: mesh per UF, `lib/map-path` `toPath`, `use-map-view.ts` for the selection and the replay of early taps). The finest grain is the municipality; nothing sub-municipal. The national view is the table by state, not a map of 5,570 shapes. The table is the truth; the map is an optional second view.
- **Palette tokens.** A single-hue sequential scale of five steps built from `accent` (`#14505c`) mixed with `paper`/`paper-2` from `shared/tokens.ts`; no use of `cand-a`/`cand-b`/`lula`/`bolsonaro` (those mean the runoff pair) and no `div-*` (the scale is not signed). Cities without the party in the race take `paper-2` with a hatch pattern and the legend entry "sem candidatos do partido".
- **Scale rule.** Sequential, five bands of the party's share of valid votes in the city; breakpoints are constants of the build, and the legend words are generated from them: "menos de 1%", "de 1% a menos de 5%", "de 5% a menos de 10%", "de 10% a menos de 20%", "20% ou mais". "Passed the threshold" means the second band or above (1%), stated in the legend and in the fact record. Never typed in a component.
- **Second channel beyond hue.** Every band has a fill density pattern (none, dots, lines, cross-hatch, solid) and the share is printed on shapes large enough at the zoom, in the selected panel and in the aria-label of each shape; the state table gives counts in digits.
- **Legend copy computed by the build.** Bands, denominators and the sentence "a conta é de cidades, não de pessoas" come from the catalog with the numbers filled by the build.
- **Annotation plan.** Selected-city panel (name, share, votes, "Abrir cidade"); a note under the map counts cities outside the colouring (no candidate of the party, no mesh shape), as the state map does.
- **Presence grid.** Every tile of the presence grid carries the city name; a grid of anonymous squares is not allowed. The no-JS equivalent is the linked list of cities with the band in words.
- **Fallback content.** Prerendered state table and the elected list; failed island shows the island-failed line with the table untouched.
- **Neutrality sweep.** Counts cities, never people; party order is alphabetical by abbreviation, never by votes or seats; no "mais forte", "domina", "vence", "reduto"; elected are listed alphabetically.

## Testing Decisions

Test behaviour: the search finds "PT", "Partido dos Trabalhadores" and a federation by a member's abbreviation; the page of a renamed number prints the differing-name line; no page merges two ids (join invariant: each (cycle, party number) appears exactly once). Unit tests on the id builder (collision rule, ASCII folding) and on the band computation (pure functions, output-based). The catalog test covers the new sentences in both registers; the fact-record coverage test covers each printed figure.

- Assert structure and interaction only; never canvas or SVG pixels.
- Generated artifacts (geometry, shards) are pinned byte-for-byte on a synthetic fixture (determinism) and checked against the real dataset by a `check:` script at build time.
- Join invariants fail the build loud: every entity the visual claims to cover appears exactly once.
- e2e runs over the committed fixture dataset; suites are serialised (shared E2E port — never parallel agents).
- Exit criteria include the screenshot-review protocol and a ux-review pass on the phone frame, not just green tests.

## Out of Scope

A continuity table of mergers and renames; other metrics (vote growth, share of seats, margin); the party legend votes (until extracted); a comparison of two parties; the Presidente cargo per party; cycles before 2018; people who were not elected; a national map of all municipalities at once; party pages by state.

## Further Notes

Flagged for the owner, each with a recommended answer:

1. **URL id**: abbreviation (recommended) versus TSE number; the number stays in the shard and on the page.
2. **Threshold**: 1% of the valid votes of the cargo in the city (recommended), with five bands; alternatives 2% or 5%. The word "threshold" must not suggest the legal clause barrier (cláusula de desempenho), which is national: the legend says so.
3. **Votes**: nominal only in v1 (recommended); adding the legend votes needs the `votacao_partido_munzona` extraction (23 to 28 MB per year).
4. **Pages**: index plus per-party pages (recommended); the single-page alternative fails the no-JS and weight tests.
5. **Federation presentation**: own page plus a line on each member's page (recommended); members' votes are never split.
6. **Budget class `party`** as above; the ticket may need to raise html if the elected lists of three cycles exceed 8 KB, in which case older cycles move to the shard.
