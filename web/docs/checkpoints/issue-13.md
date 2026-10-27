# Issue #13 (remaining reports): checkpoints

Each checkpoint: behaviour tests first, implement, green, commit. Screenshot review protocol:
`../../../site/docs/screenshot-review-protocol.md`. No Sketch frame exists for the four pages of
this ticket (frames 1–5 and 8–12 cover the other screens); the review gate below compares against
`site/reference/07-cidades-que-viraram.png` — the closest finished screen (ticket #12, the first
ranked report with rate+volume rows, ⓘ note and Compartilhar), as the ticket names it. All compute
lives in the existing pure module `src/lib/reports/compute.ts` (no cohort-style second module),
reusing `margins`, `netVotes`, `closestRaces`, `turnoutExtremes`, `biggestSwing` and the shared
loader `loadReportsData` (`DATA_DIR`); no election number is hard-coded outside the fixtures, the
tests and the prose constants (the minimum-size filters, already constants in compute.ts).

Definitions, stated on the pages themselves:
- Virada (maiores viradas) = the margin (first-share minus second-share, in pp of valid votes)
  changes sign between turnos; the ranking sorts by swing under the 100 mil+ valid-vote filter
  (`MIN_BIG_SWING_VALIDOS`), every rate paired with its volume (votos válidos).
- Votos ganhos e perdidos = net of 2026 votes minus the city's 2022 votes for one candidate's
  ballot number (each of the two ran in both runoff rounds under the same number), under the
  5 mil+ filter (`MIN_FLIP_VALIDOS`); cities without a 2022 round and the overseas posts take no
  part; net totals and per-city lists derive from the same rows (sum identity pinned in tests).
- Disputa apertada (disputas mais apertadas) = smallest absolute vote difference; no minimum-size
  filter — the tiny cities are the point — stated in prose; ties and each side's lead labelled.
- Comparecimento = who voted divided by the electorate apto, in %; ranked highest/lowest under the
  5 mil+ aptos filter (`MIN_TURNOUT_APTOS`), every rate paired with its volume in the same row.

1. **Compute + tests (commit de98fcd).** In `src/lib/reports/compute.ts`: `VoteDeltaRow` +
   `voteDeltas` on `ComputedReports` (per-candidate 2026-vs-2022 rows, `before` from the 2022
   votes by ballot number, `zz` and cities without a 2022 round skipped); `netVotes` derived from
   the same rows (`gainOf`) so the headline totals and the lists can never disagree (identity
   pinned); `rankedBigSwings` (toward = swing > 0 ranked desc, `awayCount` for the other sign);
   `rankedVoteDeltas` (gains desc, losses asc, deterministic tie-breaks validos2/nome/uf);
   `rankedTurnout` (highest desc, lowest asc, aptos tie-break) with `turnoutExtremes` refactored
   onto it; `closestRaces` rows now carry `votos {primeiro, segundo}`. 10 + 9 tests, fixture
   (sum identity, ranked deltas, empty big-swing, turnout extremes) and real (Lula +3.862.039 with
   São Paulo +186.433; Flavio +1.591.101 with Maricá +14.831; 173 cities of 100 mil+ all toward
   Lula, Campos dos Goytacazes +9,8 pp; turnout 4.139 compared, Santa Maria do Herval 90,46 /
   Itaubal 58,99; the five one-vote races and the Marquinho/PR tie), all reading `../../data`.

2. **The four pages + hub wiring + e2e (commit 9f2ed59).** Static Astro markup under
   `/relatorios/{maiores-viradas,votos-ganhos-e-perdidos,disputas-mais-apertadas,comparecimento}/`,
   each with: back link "‹ Relatórios", lead that defines its measure, `[data-sized]` line stating
   the minimum size, the compared total and the unit (pp / votos / %), named ranked rows linking to
   `/{uf}/{slug}/`, ⓘ notice, Compartilhar with copied-link feedback, source footer,
   `report-analytics` script. The hub (`src/lib/reports/hub.ts`) gained the four `to` fields and
   dropped the ticket comments of exactly those rows; `#14` ("Comparar") stays the only stub
   ("Em breve"). Tests: `hub.test.ts` stub count 5 → 1 with the four routes pinned;
   `e2e/reports.spec.ts` grew the four describes (fixture pins, hub reachability, back link, and
   the no-JS/share behaviour carried over from the #12 pattern on the pages that qualify);
   `e2e/reports-real-data.spec.ts` grew four describes with the real pins and their real-data
   captures; `e2e/capture-reports.spec.ts` gained the four `SHOTS` slots (reference
   `07-cidades-que-viraram.png`). Totals after this checkpoint: 159 unit (baseline 149), 70 phone
   e2e, 18 fixture captures.

3. **Polish + captures + this note.** Disputas `[data-sized]` wording fixed ("margem em pp dos
   votos válidos" — the previous line still said "% entre parênteses" from an earlier draft); the
   votos page's gain/loss rows gained the rank badge cell, matching the other three list pages and
   the reference screen; fixture dist rebuilt and all captures regenerated
   (`.captures/reports/fixture/*-{phone-full,phone-844}.png`, JSON sidecars). Tests re-run: 159
   unit, 70 phone e2e, 18 fixture captures green.

**Deviations / known notes.**
1. `npm run test:real` cannot run end-to-end on this branch because of a pre-existing, unrelated
   crash: with `DATA_DIR=../data`, the build's `/compartilhar/` demo page hard-codes the fixture
   city ('rj','cidade-exemplo') and prerender throws on `loadCityResult` reading `city.uf` of
   undefined. Verified against untouched `main` (stash + build + restore). Moving
   `web/src/pages/compartilhar.astro` aside to let the suite run was attempted and stopped at the
   permission gate — `/compartilhar/` is on this ticket's do-NOT-touch list, so the suite is left
   unrun rather than the boundary crossed. The real figures are pinned at unit level (both
   `compute.test.ts` and `hub.test.ts` read `../../data` and pass); the real-data e2e spec is
   committed and runs as soon as ticket #50 ports `/compartilhar/` (or #34-ish fixes the demo).
2. Because of (1) the real-data captures of this ticket's pages do not exist yet; the committed
   `reports-real-data.spec.ts` produces them on first successful `test:real`.
3. The "Comparar com 2022 e 2018" hub row (ticket #14) keeps its "Em breve" stub; its comment and
   test coverage were left exactly as the #14 owner needs them.
4. `npx tsc --noEmit` errors (share-flow.test.ts, src/scripts/fallback.ts) pre-exist on main and
   sit in files this ticket does not touch; none of the 11 are in #13 files.

## Screenshot review vs the reference screen (2026-10-26)

- Reviewed the four `.captures/reports/fixture/*-phone-full.png` and `*-phone-844.png` (390x844)
  against `site/reference/07-cidades-que-viraram.png` (closest finished screen; no Sketch frame
  exists for these routes).
- Matches (each new page): "‹ Relatórios" back link in the bordered box, serif page title under the
  header, lead + small print that states the filter and the unit, ranked rows with the round
  primary badge number, city name bold over the muted measure line, bordered ⓘ notice
  ("Compare por pontos percentuais, não por votos absolutos" on the pp pages), full-width
  Compartilhar, teal "Fonte: TSE, dados finais · Sobre os dados ›" footer. Spacings
  (pt-16 header, mt-2, py-2.5 rows) follow the reference; no sideways scroll at 390 px.
- Deliberate deviations (documented, not regressions):
  1. Each of the four pages leads with its own definition/mechanics in place of the reference's
     single "Margem = …" paragraph, because each report pairs a different rate with a different
     volume; the small-print line carries what the reference's small print carries (filter, total,
     unit).
  2. The votos page is two sections (one per candidate) instead of one list — the ticket's own
     layout — reusing the reference's row pattern inside each section, and its empty side shows a
     labelled empty state instead of an empty table.
  3. The comparecimento page is two tables (mais alto / mais baixo) with the measure line under the
     rate as "taxa · X de Y eleitores aptos"; the reference shows one measure line per row in the
     same position and type.
  4. Comparecimento's measures use % with one decimal against the ticket pins (90,5% / 59,0%),
     matching the frames' "Margem -4,5 pp" precision; disputas mixes a voto count with a pp margin
     per row (diferença + margem), which the one-line reference screen has no counterpart for.