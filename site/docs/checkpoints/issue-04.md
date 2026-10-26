# Issue #4 (state) : checkpoints

Each checkpoint: failing behaviour tests first, implement, flip/keep green, `npm run check-slot -- state`,
fresh-context screenshot review (docs/screenshot-review-protocol.md), one commit.

1. **Extract the shared city search.** Move the pure search/normalisation logic of the home slot
   (`fold`, `displayName`, `ufLabel`, index, `searchCities`) to `src/shared/city-search.ts`; home imports it; its
   tests move with it unchanged. Gate: all home tests green, `npm run check-slot -- home` passes.
2. **Static state page.** Hydrate the slot: "Estado selecionado: UF", municipality count from the dataset, reserved
   map area (`data-placeholder="state-map"`), search box shell, the full municipality list as plain anchors (sorted,
   Title Case, link to the city page), links to `/mapa/` and `/tres-ciclos/:uf/`, "‹ Início". `?fixture=sketch`
   renders the frame's own illustrative content from `frameTexts`. Flip `it.fails` to `it`. Tests: pure row/count/
   sort logic, render test (anchors, texts, no marker, no-JS).
3. **Scoped search UI and analytics.** `mount()` enhances the box: same matching as home, restricted to the state's
   rows (read from the page, no extra request), empty state, events through `ctx.analytics` with no typed text.
   Tests: vitest for controller and markup, Playwright for typing at 390 px, no JS fallback, no foreign requests.
4. **Real data and base path.** `DATA_DIR=../data npm run build`; real-data Playwright checks (27 states with the
   counts of cities.csv, RJ 92, SP 645, scoped search, link sample, `/zz/` absent, no foreign requests, no
   horizontal scroll at 390 px); `SITE_BASE=/voto-a-voto/` run; fix skeleton tests that assert the old placeholder.
