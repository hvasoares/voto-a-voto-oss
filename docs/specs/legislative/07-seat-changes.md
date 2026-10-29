# 07. Seat changes over the elections

Ticket: none. Depends on: 02 (elected and seats, verified against the TSE rules). Index: [README](README.md).

## Problem Statement

- **The claim.** Seats won per party (and federation), nationally and per state, for the Senate and the Chamber of Deputies in 2018, 2022 and 2026, and the difference between comparable elections. The owner asked for "changes in seats over the elections".
- **The misreadings.** (a) Seats won at the election read as the current composition: deputies and senators switch parties after the election, and substitutes take seats. (b) The Senate renews two thirds in 2018 and 2026 and one third in 2022, so 54 seats in one year set against 27 in the next read as "the party lost half". (c) A party that changed name, merged or entered a federation read as a new party or as one that vanished. (d) A gain read as a verdict on voters or on a party's quality.
- **Who asks.** Journalists and students comparing the Chamber and Senate across elections; readers of a state page who ask "how did my state's seats move?".

## Solution

A table per cargo with one row per party (alphabetical by abbreviation) and three columns of seats won (2018, 2022, 2026), plus the change between the elections that can be compared. Nationally first, then per state. The table is the truth; a dumbbell chart is a second view. A fixed statement above both says what the numbers are and are not.

**What "change" means (verified).** Chamber: all 513 seats are contested at each election, so change = seats in election N minus seats in the previous election (2022 minus 2018; 2026 minus 2022). Senate: terms last eight years; 2018 contested 54 of 81 seats (two per state), 2022 contested 27 (one per state), 2026 contests 54 (two per state). The seats up in 2018 are the same seats up in 2026, so the comparable pair is 2018 with 2026 (54 with 54, per state 2 with 2). 2022 is shown in its own column, marked "um terço", with no change computed against 2018 or 2026: its predecessor is 2014 (not in the data) and its successor 2030. The reasoning holds; the only correction to a naive reading is that 2022 is not a "drop" from 2018. A seat is compared by the party under which it was won, not by the person (a reelected senator under another party counts as the new party's seat).

**Composition by term (computable without extra data).** The Senate composition as elected is the sum of the two classes in office: after 2022 = 2018 class + 2022 class (54 + 27 = 81); after 2026 = 2022 class + 2026 class. This needs only spec 02 data and is shown as a derived row, "eleitos que estariam no mandato", labelled not current. What is not computable: who actually holds a seat today (party switches, resignations, substitutes, deaths), a 2014 class, and any Chamber composition after the vote. The page never says "bancada".

## User Stories

1. As a visitor with no JavaScript, I read two prerendered tables (Chamber, Senate) with seats per party in each year and the signed change, and follow each state name to its state page.
2. As a visitor on keyboard or screen reader, I tab to the state selector, choose a state, and the table below announces the party, the seats by year and the change; the chart is optional and described by the same table.
3. As a suspicious reader, I click "ver cálculo" beside a figure and get the fact record: which spec 02 verified file, the cargo, how seats are counted (situation "eleito" per the TSE rules), federation versus member party.
4. As a visitor on a phone over 4G, I get the national tables as HTML only; the per-state breakdown and the chart load when I choose a state or "Gráfico".
5. As a reader who sees "UNIÃO" in 2022 with no row in 2018, I read "em 2018 o número 17 era PSL" instead of a silent blank.

## Implementation Decisions

**Absorption.** The report pattern fits, and a report carries it first: a new report `/relatorios/mudanca-de-cadeiras/` in the `ReportLayout.astro` shell. A new report needs only its data, copy and three registers, listed in the layout header: the fact records in `lib/facts/pages.ts` (`loadFactPages`), the route in `e2e/routes-inventory.ts` (`KNOWN_ROUTES`), and the row in `lib/reports/hub.ts` for the hub listing. `lib/fallback.ts` already holds `/relatorios/:report/` and the `report` perf class reads the built route. The page data and rows live in a loader beside the other report modules in `lib/reports/`. The Brasil page and each state page get one link (a state page may later embed its own table, a follow-up); neither carries it first, because the state page has no budget headroom and the national table is a question of its own. The party names in the table link to spec 03's page when it ships.

**Data.** Elected rows from spec 02 (cargo, year, UF, party number and abbreviation, federation, situation). Seats are counts of rows with an elected situation per (cargo, year, UF, party). A federation's seats are the sum of its members' seats; both are shown (the federation as a group row above its members, indented), so a reader sees "federação: 81" and "PT: 68" without the member rows being double counted in totals (the totals row sums the federation rows and non-federated parties only). The build gate checks: Chamber 513 per year; Senate 54, 27, 54; per state totals equal the TSE seat tables.

**Shards and weight.** National tables prerendered; a shard `cadeiras/<uf>.json` per state loaded on selection (27 files, small) and a national shard for the chart. Budget: the `report` class, html 12 KB; if the two national tables (about 30 rows each, three years) exceed it, the Senate table is trimmed to parties with at least one seat in some year (the rest are counted in a note, "N partidos sem cadeira"), computed by the build.

**Continuity (minimal).** No continuity table. Rule: for a party number that has a different abbreviation in an adjacent year the row carries a note computed from the data, "2018: PSL (17)"; a party in one year only has an empty cell with "não disputou" or "sem cadeira" (two different cells; the build knows if it stood). Federations from 2022 appear as federation rows with the member list. The row never merges two numbers. A mergers table is a follow-up.

### Visual decisions

- **Chart family.** A dumbbell per party (a row, three markers on a shared seat axis for 2018, 2022 and 2026, joined by a line) for the national view; small multiples are not needed. A slope chart with 30 crossing lines is unreadable. The table stays the no-JS truth and the chart is hydrated on request. Rows are alphabetical, never sorted by seats. Senate dumbbells draw 2022 on a separate axis band ("um terço") so the shared axis is not crossed by an incomparable value.
- **Palette tokens (`shared/tokens.ts`).** Years are told apart by `ink` (2018), `accent` (2022), `muted` (2026) and by shape (circle, square, diamond), never by `cand-a`/`cand-b`/`lula`/`bolsonaro` (they mean the runoff pair, and a red-blue change colour would colour a party). No `div-*`: the change is a signed number with a glyph, not a coloured cell.
- **Scale rule.** Seat axis linear from 0, one axis per cargo (and per state); no breakpoints. Change cells: "+4", "−2", "0" with "▲", "▼", "=" and the words "mais cadeiras", "menos cadeiras", "mesmo número" in the aria-label.
- **Second channel beyond hue.** Shape per year, the sign glyph, and printed numbers on every marker; nothing relies on colour.
- **Legend copy computed by the build.** "Cadeiras conquistadas na eleição, não a composição atual." "O Senado renova dois terços em 2018 e 2026 e um terço em 2022; 2018 e 2026 são comparáveis." The numbers (81, 54, 27, 513) come from the data, the sentences from the catalog.
- **Annotation plan.** A note on 2022 Senate, a footnote link to the Chamber and Senate rules, the name-differs note, and the totals row with "conferido" via `Seal`.
- **Fallback content.** The prerendered tables; island-failed shows a line and keeps the tables.
- **Neutrality sweep.** Counts seats and states, never ranks parties or implies people; no "ganhou força", "perdeu espaço", "avanço" or "derrota"; "mais/menos cadeiras" only as arithmetic; alphabetical order throughout; "a conta é de cadeiras da eleição, não de pessoas no cargo hoje".

## Testing Decisions

Pure functions tested output-based: seats per (cargo, year, UF, party), the change rule (Chamber consecutive; Senate 2018 with 2026, 2022 separate), the federation total rule, the name-differs note. Totals checked against 513/54/27/54. A report-pattern test: the route is in the inventory, the hub row exists, each figure has a record.

- Assert structure and interaction only; never canvas or SVG pixels.
- Generated artifacts (geometry, shards) are pinned byte-for-byte on a synthetic fixture (determinism) and checked against the real dataset by a `check:` script at build time.
- Join invariants fail the build loud: every entity the visual claims to cover appears exactly once.
- e2e runs over the committed fixture dataset; suites are serialised (shared E2E port — never parallel agents).
- Exit criteria include the screenshot-review protocol and a ux-review pass on the phone frame, not just green tests.

## Out of Scope

The current composition (after party switches, substitutes, deaths); a 2014 and a 2030 comparison; a continuity table of renames and mergers; Presidente and state-level cargos; seats per region; individual people moving between parties; vote share change (spec 03 covers votes); an embed of the table in the state page; a gender, race or age split.

## Further Notes

Flagged for the owner, each with a recommended answer:

1. **Home**: a report under `/relatorios/` (recommended) versus the Brasil page; the report avoids the state-page budget and fits the pattern.
2. **Senate 2022**: shown, not compared (recommended), versus omitted; omission hides one third of the 2026 composition.
3. **Composition by term**: show the derived "as elected" row (recommended, computable) labelled not current, versus leave it for a follow-up.
4. **Federation rows**: group row plus indented members (recommended) versus members only; federation-only would hide the party's own seats.
5. **Rows with no seats in any year**: hidden and counted in a note (recommended) versus shown.
6. **Seat counts per state in 2026**: confirm 513 total with the apportionment in force for that election before the gate is written; a change in seats per state between 2022 and 2026 must be stated in the legend, not hidden by the difference.
