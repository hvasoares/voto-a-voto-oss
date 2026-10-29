# 02. Elected and seats, verified against the TSE rules

Ticket: none. Depends on: [01](01-hydrated-delivery-pattern.md). Feeds 03, 06, 07.

## Problem Statement

- **Claim.** In each state and year, these people were elected to the Senate or the Chamber, these lists (party, federation or, in 2018, coalition) hold these seats, and each list's seats cost this many valid votes: "votos por cadeira".
- **Misreadings.** (1) "More votes per seat means a vote was worth less" or "the party wasted votes": the figure is an arithmetic division, shaped by the quotient, the leftover-seat rounds and the size of the state. (2) In 2018 a coalition, not a party, won the seats: "seats of party X" are only the elected candidates of X inside a list. (3) A seat figure that is wrong without anyone noticing: a mis-flagged election, a changed rule.
- **Who asks.** The party and federation page (03), the vote pullers (06), the seat changes (07), and the reader who asks "who got in, and how many seats did this party get in my state".

## Solution

A per-state, per-year table prerendered by the pattern of 01: the elected (name, party or federation, ballot number, alphabetical order; never by votes), and the list table (list, valid votes, seats, votos por cadeira, with the state's quociente eleitoral printed as the reference). **No seat figure prints for a state-year until the build has verified it twice**: the count of the elected equals the seats of the state, and the TSE allocation rules, rerun on the votes, give exactly the elected set the TSE flagged. A state-year that fails prints only the TSE flag as the file has it, with the catalog line "conferência pendente", and the build fails unless the failure is listed in a committed, reasoned exceptions file.

## User Stories

- As a visitor with no JavaScript, I read the elected and the list table as HTML.
- As a visitor on keyboard or screen reader, I get a captioned table, row headers, and the year and state controls as native `select` elements.
- As a suspicious reader, I open "ver cálculo" on a seat and see: valid votes of the list, the quociente eleitoral, the quociente partidário, the leftover rounds with each average, and the rule text with its source; and I can see the build's verification line.
- As a visitor on a phone over 4G at first paint, I get one state-year table (about 15 rows at most); the vote shards load on the first touch of the control.
- As a reader of the Senate, I see the one or two senators of the state, with the count of seats of that year.

## Implementation Decisions

### The rules the build reproduces

Verified on the official consolidated text of the Código Eleitoral (Lei 4.737/1965, Planalto) and the text of Lei 14.211/2021 unless marked UNVERIFIED.

| Rule | Content | Source |
|---|---|---|
| Quociente eleitoral (QE) | valid votes divided by seats of the state; fraction dropped if at most one half, counted as one if above | CE art. 106 |
| Valid votes | candidate votes plus legend votes of the lists; brancos and nulos out | CE art. 106 with Lei 9.504/1997 art. 5 (UNVERIFIED, not read in this pass; the build checks the identity on the TSE totals instead) |
| Quociente partidário (QP) | valid votes of the list divided by QE, fraction dropped | CE art. 107 (wording of Lei 14.211/2021) |
| Who takes the QP seats | among the list's candidates with at least 10% of QE, in nominal-vote order | CE art. 108 (Lei 14.211/2021); the 2018 text (Lei 13.165/2015) UNVERIFIED |
| Leftover seats | each round: average = list's valid votes divided by (seats it holds plus 1); highest average takes a seat, provided it has a candidate with the minimum vote; repeat per seat; when no list qualifies, the seats go to the highest averages | CE art. 109 I to III (Lei 14.211/2021) |
| 80% and 20% | only lists with at least 80% of QE, and candidates with at least 20% of QE, compete for leftovers | CE art. 109 par. 2 (Lei 14.211/2021) |
| Tie | the older candidate is elected | CE art. 110 |
| No list reaches QE | the most-voted candidates are elected | CE art. 111 (Lei 14.211/2021) |
| Coalitions | allowed in proportional elections in 2018; banned from the 2020 elections | EC 97/2017 (art. 17 par. 1 and art. 2) |
| Federations | act as one party, in 2022 and later | Lei 14.208/2021 (art. 6-A of Lei 9.504/1997), read through a secondary summary of an STF judgment: UNVERIFIED against the law text |
| Leftovers in 2018 | all parties and coalitions compete, by highest average | Lei 13.488/2017 art. 3, applied to 2018 by the TSE and upheld in STF ADI 5947, read in secondary summaries: UNVERIFIED against the law text |
| Clause de barreira | 2018 cycle: 1.5% of valid Chamber votes in at least a third of the federative units with 1% in each, or 9 deputies in a third of the units; 2022: 2%, 1%, 11; 2026: 2.5%, 1.5%, 13 | EC 97/2017 art. 3. It conditions fund and air time, **not seats**: the reproduction does not apply it, and the check proves it by matching the flags without it |
| Seats of the Chamber | 513 in total, 8 to 70 per state | CF art. 45 par. 1 and LC 78/1993: UNVERIFIED in this pass; for 2026 the 513 and the 2022 distribution were kept by the STF, sources diverge on details |
| Seats of the Senate | 3 per state, renewed by one third (27 seats) and two thirds (54) | CF art. 46: UNVERIFIED in this pass; senators are elected by plurality, the most voted fill the seats |

**STF decision on 2022 (flag).** In 2024 the STF (ADIs 7228, 7263, 7325) held that the 80% and 20% limits of art. 109 par. 2 and the rule of art. 111 are unconstitutional (all parties compete in the last leftover round), and in March 2025 held that this applies to the 2022 election; the embargos were rejected in June 2025, and seven deputies lost their seats (CONJUR report, secondary source). Whether the TSE file `votacao_candidato_munzona_2022.zip` carries the pre-ruling diplomation or the corrected one is UNVERIFIED: the build finds out, see below.

### Verification, exactly

1. **Count check** (new `check` in `src/voto_a_voto/reconcile.py`, beside `check_legislative`): per cargo, year and state, `ELEITO*` candidates in `candidatos.csv` equal the seats in a committed table `data/legislative-seats.csv` (`cargo, ano, uf, cadeiras`, with the source column). Chamber: sum of 513 per year, every state between 8 and 70. Senate: 2 per state in 2018 (54), 1 in 2022 (27), 2 in 2026 (54). Fails the build otherwise.
2. **Identity check** per municipality: the party legend votes (below) summed equal `legenda_validos` of `totais.csv`; the candidate `votos_nominais_validos` summed equal `nominais_validos`. This catches a bad join before any allocation runs.
3. **Reproduction** (new pure module `src/voto_a_voto/seats.py`, no I/O): `allocate(lists, seats, rules)` returns the QE, each list's QP, each leftover round with every average, and the elected candidates. For every state-year it must equal the TSE flags: the same set of elected numbers, and the same split `ELEITO POR QP` versus `ELEITO POR MÉDIA` (the strongest check the file allows). Senate: the top `seats` candidates by votes equal the `ELEITO` set.
4. **Rule sets are fixed in code from the law, never fitted to the data**: `RULES[2018]` (coalitions as lists, all lists in leftovers), `RULES[2022]` run in two variants, `diplomado` (80/20 and art. 111) and `stf` (all lists in the last round); 2026 follows `RULES` of 2022 until the owner decides (note 2). A state-year passes if the declared variant of its year matches; the build reports which variant matched per year and fails if a year matches neither, or if a state-year matches under neither variant.
5. **Ties** cannot be decided from the extracted data (art. 110 needs birth date, held in `consulta_cand`, already fetched and unused: `legislative.SOURCE_KINDS`). Rule: a tie that decides a seat is reported as "tie, from the TSE flag"; if none occurs in the real data, nothing more is built.

The 2018 inputs per list come from the candidate file's `SQ_COLIGACAO`, `NM_COLIGACAO`, `DS_COMPOSICAO_COLIGACAO` (present in both years, checked on the real 2018 and 2022 files) and, in 2022, `SG_FEDERACAO` (already kept). The extraction adds a `lista` key (the coalition sequence in 2018, the federation or party in 2022) to `<cargo>-<year>-candidatos.csv`.

### Extending the data task for the legend votes

- Add `votacao_partido_munzona` to `SOURCE_KINDS` and `USED_KINDS` in `src/voto_a_voto/legislative.py`; the existing `fetch_open_data` in `src/voto_a_voto/cli.py` downloads it through `OpenDataCache` (`src/voto_a_voto/opendata.py`: etag revalidation, resume, SHA-256, offline mode) from `https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_partido_munzona/votacao_partido_munzona_<year>.zip` (exists for 2018, 2022, 2026; 2022 is 25 MB; it has one member per UF plus `_BR` and `_BRASIL`, so `member_of` works unchanged). The `fingerprint` takes its SHA-256; bump `VERSION` so every year is extracted again.
- New output `<cargo>-<year>-legenda.csv`: `uf, cd_municipio, lista, sigla, votos_legenda_validos, votos_nominais_validos, votos_nominais_convertidos` from `QT_VOTOS_LEGENDA_VALIDOS`, `QT_VOTOS_NOMINAIS_VALIDOS`, `QT_VOTOS_NOM_CONVR_LEG_VALIDOS` (checked columns of the 2022 file), per cargo, municipality and party, summed over zones; same sinks, manifest entry and byte determinism as the existing files.
- The check validates: the new file is non-empty for every UF and cargo; identity 2 above; no `lista` of the candidates file is missing in the legend file and the reverse; and the manifest hash. Whether `QT_TOTAL_VOTOS_LEG_VALIDOS` already includes the converted nominal votes is UNVERIFIED; identity 2 decides it.

### Votos por cadeira

`votos_por_cadeira(lista) = valid votes of the list in the state-year / seats the list holds`, valid votes = nominal valid plus legend valid of every party of the list; shown rounded half up to an integer, with numerator and denominator in the fact record. A list with no seat shows its votes and "sem cadeira", never zero or infinity. A federation or a coalition is one list; the 2018 coalition's parties are named beside it, and a party inside a coalition has no votes per seat of its own (seats are won by the list). The national figure of a party is the sum of its votes over the sum of its seats, never an average of states. Misreading kill: the state's QE is printed as the reference line, and the page says what the figure is not ("não é o custo de uma cadeira nem o valor de um voto"), in the catalog. Order of rows: alphabetical, never by the figure.

**Visual decisions.**
- Chart family: a table; on interaction, one horizontal bar per list for votos por cadeira on a zero-based scale with a vertical reference mark at the state QE (a common axis makes lists comparable; no pie, no ranking).
- Palette: neutral tokens from `web/src/shared/tokens.ts`; party identity by abbreviation, never hue alone; the reference mark is a dashed line plus its label.
- Scale: linear from zero to the largest figure in the state; the maximum is stated in words in the legend, computed by the build.
- Legend copy: "N cadeiras, M votos válidos, quociente eleitoral Q" and the 2018 coalition composition, all from the data, catalog labels in both registers.
- Annotations: the QE mark; lists with leftover seats are tagged "sobra" (text, not color).
- Fallback: the prerendered table is the full content; failed island keeps it with the catalog line; `noscript` line.
- Neutrality sweep: no "vencedor", no "desperdiçado", no "eficiente"; groups of lists count lists, not people; only the elected are named; the elected are listed alphabetically.
- Every figure has a fact record (`web/docs/facts.md`): source files, the sum, the rule article, "ver cálculo".
- Weight: absorption first, as the lens asks: the state page (`/<uf>/`) and the party page of 03 can carry it; a new route is justified only if neither does. Budget line: the "table-only" or "with island" line of 01. Measured baseline fixed by the ticket.
- Granularity: state-year. No view implies a municipality-level election result (the election is state-wide; municipal votes appear only in the shard).

## Testing Decisions

Visual testing rules (verbatim from `docs/checklists/dataviz-lens.md`):
- Assert structure and interaction only; never canvas or SVG pixels.
- Generated artifacts (geometry, shards) are pinned byte-for-byte on a synthetic fixture (determinism) and checked against the real dataset by a `check:` script at build time.
- Join invariants fail the build loud: every entity the visual claims to cover appears exactly once.
- e2e runs over the committed fixture dataset; suites are serialised (shared E2E port, never parallel agents).
- Exit criteria include the screenshot-review protocol and a ux-review pass on the phone frame, not just green tests.

Specific: `tests/unit` for `seats.py` with hand-built tiny states whose answer is computed by hand (one with a leftover round, one with a candidate under 10% of QE, one with no list reaching QE, one federation, one coalition, one tie); the real-data reproduction of every state-year of 2018, 2022 and 2026 as a build check (the oracle is the TSE flag); an e2e that every elected of the fixture appears once and the seat sum equals the table; a test that a state-year with a failed verification prints no seat figure.

## Out of Scope

The suplentes and the substitutions after election; changes of party after election; the clause de barreira as a printed fact; votes per seat across years (07); the 2026 second-round effects (none for these cargos); a calculator where the visitor changes the rule ("e se..." with other rules); municipality-level winners; state deputies and the Presidency.

## Further Notes (flagged decisions)

1. **2022 variant.** Recommended: verify against whichever variant the TSE file matches, print the TSE flag as the fact, and when the file is pre-ruling add a catalog notice naming the STF decision and the affected state-years. Owner decides whether the page follows the STF-corrected result.
2. **2026 rules.** The same as 2022 (federations, 80/20 or STF variant) until a source says otherwise; UNVERIFIED for any later change in law.
3. **Seats table.** Recommended: a committed `data/legislative-seats.csv` with the source of each row; owner confirms the 2026 distribution (sources diverge on a 14-seat redistribution).
4. **Rules not verified.** Planalto text of arts. 106 to 111 and EC 97 read; Lei 14.211/2021 read in part; Lei 13.165/2015 art. 108, Lei 13.488/2017 art. 3, Lei 14.208/2021, CF arts. 45 and 46, Lei 9.504 art. 5 and the STF decision were read only in secondary sources or from memory: the ticket must read each primary text before the rule set is frozen.
