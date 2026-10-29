# 06. Vote pullers: who was elected because of a very voted candidate

Ticket: none. Depends on: [02](02-elected-and-seats.md) (its exact reproduction of the elected set) and [01](01-hydrated-delivery-pattern.md). Owner request: per election year (Chamber), the elected candidates who pull others in ("puxadores de voto") and the number of people elected because of each.

## Problem Statement

- **Claim.** "Without the votes of this elected candidate, the list would have had N seats fewer than the M it won; so K other people are elected who would not be under the rule." It is a **calculation on the rule**, in the register of the site's other "o que mudaria se" lines.
- **Misreadings.** (1) "The others do not deserve their seat": every elected candidate is elected by the same rule, and the page says so. (2) "The votes were transferred": the rule pools the list's votes; nothing moves between people. (3) "This is what the voters wanted / would have done": the counterfactual assumes the votes did not exist, not that the voters chose someone else. (4) "The numbers add up": each candidate is computed alone, so the counts of one list can exceed its seats.
- **Who asks.** The owner, and any reader who has heard "Tiririca elegeu fulano".

## Solution

One prerendered, table-only report per election year (2018, 2022, 2026; Chamber only): the elected candidates for whom the count of others is at least one, with: name, list, the votes, the list's seats, the seats the list would hold without those votes, and the count of other people elected because of them. Shown alphabetically, never ordered by the count. Each row has "ver cálculo". The calculation runs in the data task (Python), not in the browser: no island, no shard (budget line "table-only" of 01). A state-year whose reproduction in 02 is not exact prints nothing and says so.

## User Stories

- As a visitor with no JavaScript, I read the whole report as HTML; there is no island to fail.
- As a visitor on keyboard or screen reader, I get a captioned table with row headers, year links as ordinary anchors, and the sentence of each row as text.
- As a suspicious reader, "ver cálculo" shows the two allocations side by side (quociente eleitoral, quociente partidário, leftover rounds), the rule and its source, and the line of 02 that the allocation was reproduced exactly.
- As a visitor on a phone over 4G at first paint, I get a table of a few dozen rows, one stylesheet, no script of its own.
- As a reader who dislikes being told a person "does not deserve" a seat, I find only a stated rule and a stated assumption, and the others are not named.

## Implementation Decisions

**The measure (exact).** Unit: an elected candidate `c` in a state-year (Chamber). Let `L` be c's list (party, federation, or in 2018 coalition), `s` the seats `L` won, `E_L` the candidates of `L` elected.

1. **Counterfactual.** Remove `c` and all of c's votes from the state: `L` loses `votes(c)` of valid votes, the state's valid votes drop by the same amount (so the quociente eleitoral changes), `c` is not a candidate. The votes are not moved anywhere. Rerun the full allocation of 02 (`seats.allocate(..., exclude=c)`), with the rule set that 02 verified for that state-year (same year's variant, same 10%, 80/20 and leftover rules).
2. **`s'`** is the seats `L` holds in the rerun. `E'_L` is the top `s'` of `L` without `c`, in nominal-vote order.
3. **Measure:** `eleitos_por_causa(c) = |E_L minus ({c} union E'_L)|`, the people elected in the real result who would not be elected without `c`'s votes, `c` himself or herself excluded. Since order inside the list does not change, this equals `max(s - s' - 1, 0)`. A candidate is a *puxador* when it is at least 1.
4. **Cascades.** Removing `c` moves the quotient and so every list's quotient and averages: the rerun is complete, never an incremental guess. The last elected of `L` in the rerun is the `s'`-th of `L` without `c`. The seats `L` loses go to other lists; those gains are not attributed to anyone and are not printed. A seat that stays in `L` when `c` leaves goes to the next of the list: no one loses, the measure is 0.
5. **One at a time.** Each candidate is a separate rerun; the page says "calculado um de cada vez, os números não se somam".
6. **Ties.** If the rerun has a tie that decides a seat (equal averages, or equal votes at the cut) the rule is the older candidate (CE art. 110), which needs birth dates not in the extraction (see 02, item 5): the row prints "não calculável" and counts nowhere. Expected to be rare; the build lists them.
7. **Gate.** For a state-year, the measure prints only when 02's reproduction is exact for that state-year (same elected set and the same `ELEITO POR QP` / `ELEITO POR MÉDIA` split). Otherwise the state-year is absent and the report says which and why. Never partial.

**Worked oracle** (also the unit test): 4 seats; valid votes 1000, so QE = 250. List A: a1 600, a2 40, a3 35, a4 25 (700). List B: b1 110, b2 90, b3 60, b4 40 (300). QP: A 2, B 1; one leftover: averages A 700/3 = 233.3, B 300/2 = 150, so A. Elected: a1, a2, a3, b1. Without a1: A 100, valid 400, QE 100; QP A 1, B 3; elected a2, b1, b2, b3. A falls from 3 to 1, so `eleitos_por_causa(a1) = 3 - 1 - 1 = 1` (a3). By hand, the others give 0: a2 (A keeps 3 seats, a4 enters), a3 (the same), b1 (B keeps 1, b2 takes it).

**Data.** From 02: `<cargo>-<year>-votos.csv` (votes per candidate, summed to the state), `candidatos.csv` (with `lista`), `legenda.csv`. A new module `src/voto_a_voto/pullers.py` calls `seats.allocate`; output committed with the other derived tables (01): `data/legislative-web/puxadores-<ano>.json`, one row per puxador. Performance: one rerun per elected candidate (513 per year); each rerun is lists (about 30 in the biggest state) times seats (70 at most) arithmetic: a few thousand operations, about a million per year; expected under a second in Python. The ticket measures it and fails the data task above 60 seconds per year (a guard, not a target).

**Name of the measure.** Catalog entries (`web/src/lib/sentences/catalog.ts`, both registers): measure label "Eleitos a mais na lista, calculado"; row sentence "Calculado: sem os votos de {nome}, a lista {lista} teria {s'} de {s} cadeiras, {n} eleitos a menos além de {nome}."; page title "Puxadores de voto: o que mudaria sem a votação deles"; the popular term "puxador de voto" is defined once on the page as the common name of this calculation. Recommended; the owner approves the words.

**Why the Senate is excluded.** Senate seats are won by plurality: the most voted fill the seats, votes are never pooled across candidates, so removing a candidate only promotes the next one; the measure is 0 by construction and "pull" does not exist. The page says this in one catalog line.

**Visual decisions.**
- Chart family: a table with a paired integer pair per row, "cadeiras da lista: s, sem a votação: s'" as two small segments on an integer axis (length = count of seats; a common 0 to 70 axis would crush small lists, so each row's axis is its own `s`, labelled). The row's number is also printed as text.
- Palette: `web/src/shared/tokens.ts` neutral tokens only; no party hue; "com" is the filled token, "sem" the outlined token, so the pair survives color blindness (fill versus outline, not hue).
- Scale: integer seats from zero, per row; the legend says "cada quadrado é uma cadeira".
- Legend copy: computed by the build from the data ("2018: N candidatos têm ao menos um eleito a mais; M estados não puderam ser calculados"), catalog labels.
- Result line: "N outras pessoas eleitas por causa desses votos" is bold body-ink text, not the link style; link color is reserved for navigation ("ver cálculo" stays the only link-styled text in the row).
- Annotations: the assumption line above the table ("o cálculo tira os votos do candidato; não diz o que os eleitores fariam").
- Fallback: the table is the report; no island exists to fail; no `noscript` needed beyond that.
- Neutrality sweep: counterfactual labelled "calculado", never a fact; no "merece", "não merecia", "carona", "beneficiado"; the others are counted, not named (recommended, note 2); only the elected are named; rows alphabetical; groups count lists and seats, not voters; a screening frame line: "lista de cálculo, não uma conclusão".
- Every number has a record: the fact record states the source files, the allocation, both runs and the exclusion; "ver cálculo" opens it.
- Grain: state-year (the election is state-wide); no municipality claim.
- Weight and absorption: table-only budget line of 01 (`region` class: 6 KB html, no island). Absorption first: the party and federation page (03) shows its own puxadores in a section; the cross-party report is a new page in the existing report family under `web/src/pages/relatorios/` (shell `ReportLayout`, like `cidades-fora-da-curva`), because no existing page lists across states. Owner confirms the route (note 1).

## Testing Decisions

Visual testing rules (verbatim from `docs/checklists/dataviz-lens.md`):
- Assert structure and interaction only; never canvas or SVG pixels.
- Generated artifacts (geometry, shards) are pinned byte-for-byte on a synthetic fixture (determinism) and checked against the real dataset by a `check:` script at build time.
- Join invariants fail the build loud: every entity the visual claims to cover appears exactly once.
- e2e runs over the committed fixture dataset; suites are serialised (shared E2E port, never parallel agents).
- Exit criteria include the screenshot-review protocol and a ux-review pass on the phone frame, not just green tests.

Specific: **oracle 1**, the hand-built state above in `tests/unit` (also one with a federation, one with a 2018 coalition where the displaced person belongs to another party of the coalition, one with a tie, one where `c` is below 10% of the candidate minimum after the rerun). **Oracle 2**, the real data: `check` reruns the reproduction of 02 on every state-year of 2018, 2022 and 2026 and asserts it is exact before any counterfactual is run; a state-year not exact must produce no row. Property tests: the measure is never negative, never above `s - 1`, and the Senate yields no rows. Build gate: every row has a fact record and a catalog sentence in both registers; every state-year appears once as computed, "não calculável" or "absent with reason". e2e on the fixture: the table, the assumption line and the "ver cálculo" link are present with scripts off.

## Out of Scope

The Senate; state deputies; removing two or more candidates together; the variant where the removed votes go to the legend (note 3); which list receives the lost seats; the votes the candidate pulled "per municipality"; party-level aggregates of pulling ("quanto o partido depende de um nome"); a historical series before 2018; a calculator for any candidate; the not-elected.

## Further Notes (flagged decisions)

1. **Route.** Recommended: a report under `relatorios/` plus a section on the party page (03). A new top-level entry point is a blocking question per the agent brief.
2. **Naming the others.** Recommended: count only; "ver cálculo" shows the rank inside the list of those displaced, not their names. Naming them would single out people for a counterfactual.
3. **Where the removed votes go.** Recommended: they vanish (the candidate "did not exist"); this is the standard reading and the smallest assumption. The TSE file has a column of nominal votes converted to legend (`QT_VOTOS_NOM_CONVR_LEG_VALIDOS`), meaning some removed candidacies keep their votes as legend; when and why is UNVERIFIED, so the legend variant waits for the owner.
4. **Dependence on 02.** The rule set per year, including whether 2022 follows the pre- or post-STF rule (02, note 1), decides which allocation is rerun; the report states which.
5. **Ties.** Recommended: print "não calculável" instead of buying birth dates for a handful of cases; reopen if the real data has more than a few.
