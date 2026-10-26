# Issue #5 (city card) : checkpoints

Each checkpoint: failing behaviour tests first, implement, flip/keep green, `npm run check-slot -- city`,
fresh-context screenshot review (docs/screenshot-review-protocol.md) where the render changed, one commit.

1. **Pure number model and rounding.** `src/shared/city-model.ts`: pt-BR formatting (`36.400`, `33,6%`),
   largest-remainder rounding (displayed parts of a bar add to exactly 100), `buildCityResult` (voted = valid votes over
   the electorate, not voted = the rest = abstention + blank + null + anulados em apuracao separada, candidate shares of
   valid votes, two leaders plus "Outros candidatos (N)", names keyed by ano+turno+numero) and the loader over the
   data layer. Tests: vitest only (large city, tiny city, tie, zero turnout, zero valid votes, round 1 and 2).
   The slot is still blank here, so there is nothing to review; `check-slot` runs.
2. **Takeaway sentence (pure).** `src/shared/takeaway.ts`: one neutral sentence with explicit templates (non-voters
   above / near / below the leaders, ties, single candidate, tiny electorate in counts, zero turnout, zero valid
   votes). Tests: vitest only. Still no visible change.
3. **Bars, legend and the static card.** Replace the shared `turnoutBar`, `roundTabs`, `candidateRow` placeholders,
   hydrate the slot for the default view (name and UF, tabs, bars, legend, takeaway, share button, links, source line,
   banner only for fixture data). Flip `it.fails` to `it`. Screenshot review 1 against the frame.
4. **Round and cycle switching, no-data notice, analytics.** All (cycle, round) views are pre-rendered into the page;
   `mount()` shows the one asked for by `?ciclo=&turno=` without any request; "sem dados nesse ciclo" notice; events
   `city_view`, `round_switch`, `cycle_switch` through `ctx.analytics`; fixture route `/rj/cidade-exemplo/?turno=1`.
   Screenshot review 2.
5. **Real data and base path.** `DATA_DIR=../data npm run build`; real-data Playwright checks (Sao Paulo, tiny city,
   near-tie, overseas post without turnout, Boa Esperanca do Norte, non-ASCII name) against values computed from the
   CSVs; `SITE_BASE=/voto-a-voto/` run; no foreign requests, no horizontal scroll at 390 px; fix skeleton tests that
   asserted the old placeholder city page. Final screenshot review.
