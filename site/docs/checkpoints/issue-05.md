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
3. **Bars, legend, the card and view switching.** Replace the shared `turnoutBar`, `roundTabs`, `candidateRow`
   placeholders and hydrate the slot: name and UF, cycle and round tabs, bars, legend, takeaway, share button, links,
   source line, fixture banner only for fixture data, the neutral "Sem dados nesse ciclo." notice. All six views
   (cycle x round) are pre-rendered into the page (five hidden), `?ciclo=&turno=` picks the visible one and `mount()`
   switches without any request. Flip `it.fails` to `it`. Screenshot review 1 against the frame.
4. **Analytics, links and robustness.** Events `city_view`, `round_switch`, `cycle_switch` through `ctx.analytics`
   (pure tracker, tested); share link carries the view; no-JS note; Playwright for switching, back button, no
   foreign request, 44 px targets, 390 px; CONTRACT.md and shared README. Screenshot review 2 (fixture route).
5. **Real data and base path.** `DATA_DIR=../data npm run build`; real-data Playwright checks (Sao Paulo, tiny city,
   near-tie, overseas post without turnout, Boa Esperanca do Norte, non-ASCII name) against values computed from the
   CSVs; `SITE_BASE=/voto-a-voto/` run; no foreign requests, no horizontal scroll at 390 px; fix skeleton tests that
   asserted the old placeholder city page. Final screenshot review.
