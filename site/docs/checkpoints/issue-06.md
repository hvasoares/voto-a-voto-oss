# Issue #6 (three cycles of a city) : checkpoints

Each checkpoint: failing behaviour tests first, implement, flip/keep green, `npm run check-slot -- city-cycles`,
screenshot review by a fresh-context reviewer (docs/screenshot-review-protocol.md) where the render changed, one commit.

1. **Pure multi-cycle model.** `src/slots/city-cycles/cycles-model.ts`: round from `?turno` (default 2), ballot-number
   side order per cycle (lower number on the left; round 1 = the two leaders by number + "Outros" on the right),
   no-data detection and the one-sentence reason from the dataset's `ciclos`, the per-cycle block built on the shared
   `buildCityResult` (no second rounding), segment text that fits its width. Tests: vitest only (stable order across
   cycles although the winner changes, number 13 / 22 named per year, rounding adds to 100, no-data, zero turnout).
   The slot is still blank; `check-slot` runs.
2. **The three-cycle blocks.** Replace the blank render: title, per-cycle "Votaram X% do eleitorado" bar and "Não votaram
   Y%" bar, "Br = brancos . Nu = nulos" legend plus the ordering sentence, no-data block of the same height, both
   rounds in the HTML, links, "Fonte: TSE" line. Flip `it.fails` to `it`. Screenshot review 1 against the frame.
3. **Round switch, no-JS, analytics, shared `cycleTabs`.** `?turno=` link and `mount()` switch (no request), both rounds
   shown stacked when scripting is off, `ctx.analytics` events, `cycleTabs()` implemented (city card switched to it only
   if its tests and screenshot stay green). Playwright for switch, back button, no-JS, 390 px. Screenshot review 2.
4. **Real data and base path.** `DATA_DIR=../data npm run build`; real-data Playwright checks (Sao Paulo both rounds,
   Boa Esperanca do Norte, an overseas post, a tiny city, a non-ASCII name) against values read from the CSVs inside
   the test; `SITE_BASE=/voto-a-voto/` run; page and dist sizes; fix skeleton tests that assert the old placeholder.
   Final screenshot review.
