# Issue #15 (cohorts: como cada grupo votou) : checkpoints

Each checkpoint: behaviour tests first, implement, green, commit. Screenshot review protocol:
`../../../site/docs/screenshot-review-protocol.md`; reference frame
`site/reference/12-como-cada-grupo-votou.png`. The aggregation (pure) lives in `src/lib/cohorts.ts`,
the build-time loader in `src/lib/cohorts-load.ts` (shared store, `DATA_DIR`); the reference figure
table is pinned by `src/lib/cohorts.test.ts` reading `../../data` raw — no cohort number is
hard-coded outside the tests.

Definitions (from the ticket, replicated in the reference table centraleleicao2026/thoughts/team/
data-engineering/2026-10-26-swing-compare-cohort-figures.md section (c)):
- A cohort = (winner of the 2º turno of 2018, winner of the 2º turno of 2022) of one city; cities
  join on the integer TSE municipality code across the three cycles. Overseas voting posts (uf
  `zz`, and any 2026 code without a registry row for another reason) never form a cohort.
- Venceu = more votes in the 2º turno than the other candidate; equal votes = "empate".
- Bar shares are one-decimal percents of the group's DECIDED cities (largest remainder), summing
  exactly 100.0; a 2026 tie stays in the group's totals and outside the bars, as a note on the card;
  the totals close: 5.571 = groups (5.568) + 2022 ties (2) + the city without earlier data (1).

1. **Model (`src/lib/cohorts.ts`, pure) + loader + tests.** `outcomeOf` (win/tie/no-data per city),
   `buildCohorts` (groups keyed "2018|2022", 2026 outcome per group with city counts, valid votes =
   sum of the two 2026 candidates, tie counter; tie cases and no-data cases reported, never dropped;
   deterministic ordering: largest first, then 2018 winner, then 2022 winner), `sharesOneDecimal`
   (largest remainder, one decimal), `candidateLabels` (card words from `DISPLAY`:
   2018|13 "PT"/Haddad, 2018|17 "Bolsonaro", 2022|13 "Lula", 2022|22 "Bolsonaro",
   2026|13 "Lula", 2026|22 "Flavio"; campaign `camp` fields collapse "PT→Lula" as the frame does;
   anything outside the map falls back to partido/ballot name, which the fixture dataset renders),
   `segmentColor` (Sketch swatches lula/bolsonaro for 13/22, neutral cand-a/cand-b otherwise —
   every segment is named and counted in text, no colour-alone encoding). Tests (16): pure-synthetic
   suites (groups, ties, no-data, overseas skipped, registry throws, ordering, rounding —
   [2613, 141] → 94.9/5.1, labels, winner semantics, colours), the real-data suite pinning the
   reference table (2.755/40.955.646 · 2.391/64.886.493 · 368/17.479.900 · 54/372.409; split-by-cities
   2.613/141, 27/2.364, 231/137, 4/50; the two 2022-empate cities Irati/SC and Guará/SP, both won by
   Flavio in 2026; Boa Esperança do Norte/MT as the only no-data city; totals identity
   5.571 = 5.568 + 2 + 1 and valid votes of 2026 == the committed turnout.csv) and the fixture suite
   (what the default build renders: 3 groups, 8 cities, Boa line).

2. **The page `/relatorios/como-cada-grupo-votou/` (static Astro, no island) + e2e + captures.**
   Back link "‹ Relatórios", lead, one card per cohort (title, cities · valid votes, caption,
   stacked bar with `role="img"`, text legend "Lula 94,9% (2.613)", per-card tie note with the
   closing equation), "Fora dos grupos" (totals line, per-city notes, "Venceu = mais votos …"
   definition), footer "Fonte: TSE, dados finais · Sobre os dados". The fixture build shows the
   EXEMPLO banner (manifest `fixture === true`). Playwright phone spec (`e2e/cohorts.spec.ts`,
   6 checks: structure, banner, cards, totals + no-JS render + no-sideways-scroll/no-JS-shipped),
   real-data spec (`e2e/cohorts-real-data.spec.ts`, 6 checks pinned to the reference table),
   captures (`e2e/capture-cohorts.spec.ts` → `.captures/cohorts/phone-full.png` +
   `phone-nojs.png` 390x844 fullPage; `e2e/capture-cohorts-real-data.spec.ts` via `npm run test:real`
   → `phone-real-data.png`, JSON sidecars).

## Screenshot review vs the Sketch frame (2026-10-26)

- Reviewed: `.captures/cohorts/phone-real-data.png` (real data) and `phone-full.png` (fixture)
  against `site/reference/12-como-cada-grupo-votou.png`, 390x844.
- Matches: page title, lead, back link, four cards with the frame's titles ("Venceu em 2018 e 2022:
  PT", "Venceu em 2018 e 2022: Bolsonaro", "Venceu em 2018: Bolsonaro. Em 2022: Lula",
  "Venceu em 2018: PT. Em 2022: Bolsonaro"), cities + valid votes per card, caption, red/blue bars of
  the Sketch swatches ("Lula" red, "Flavio" blue), legend format "Nome p,c% (contagem)", the tie note
  "1 cidade empatou … não está nas barras: 2.755 = 2.613 + 141 + 1", the totals-closing note, bottom
  "Venceu = mais votos …", footer "Fonte: TSE, dados finais · Sobre os dados".
- Deliberate deviations (documented, not regressions):
  1. First card reads 94,9%/5,1% instead of the frame's 94,8%/5,1%: the frame was drawn with plain
     rounding and its own numbers sum to 99.9; the site convention (largest remainder on tenths, as
     documented on /sobre-os-dados/) keeps the parts summing exactly 100.0.
  2. The bottom note names the cities outside the groups (Irati/SC, Guará/SP, Boa Esperança do
     Norte/MT, one line each) instead of the frame's aggregate "Não mostrado: 2 cidades …": the same
     facts plus the names, so the "sem dados" city of the ticket is explicit. The aggregate counts
     stay in the totals line.
  3. No "‹ Relatórios" target exists yet (the reports hub is ticket #12/#50, not ported): the link
     renders, the target page is the fallback "Página em construção". Wiring of the navigation entry
     and of a hub card is those tickets' job.