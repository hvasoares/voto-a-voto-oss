# Issue #49 (pre-rendered JSON data shards) : checkpoints

Each checkpoint: behaviour tests first, implement, keep green, vitest + typecheck, screenshot review
(do it when the render changes) and one commit. Convention as in `web/docs/checkpoints/issue-06.md`.

1. **Pure shard builder, fingerprint, layout note.** `integrations/shards.ts`: builds every shard of the dataset
   deterministically (`v<fingerprint>/search.json`, `v<fingerprint>/city/<uf>/<slug>.json`,
   `v<fingerprint>/state/<uf>.json`, `v<fingerprint>/totals.json`); missing cycle or round is an absent key (never
   zeros; Boa Esperança do Norte), overseas posts get their own shard and enter the national totals. The fingerprint
   is a sha256 over the five committed dataset files, so the paths change whenever the dataset changes and a stale
   copy is never served. Layout and fields in `web/docs/shards.md`. Tests: fixture dataset — every city has a shard,
   per (cycle, round) sums equal the CSV sums (overseas included), `validos + brancos + nulos + anuladosApuSep =
   comparecimento`, two builds are byte-identical, the fingerprint is stable.
2. **Wired into the build; the search stops fetching CSV.** `integrations/dataset.ts` writes the shards to
   `public/data` (wiping the old versions and the copied CSVs) and no longer copies any CSV; the fingerprint reaches
   client code through `virtual:data-shards`; `src/lib/search-data.ts#loadSearchCities` fetches
   `data/v<fingerprint>/search.json` (same callers, same shape). Vitest and typecheck.
3. **Pages and Playwright.** Minimal pre-rendered city route `src/pages/[uf]/[slug]/`: the shard-contract page — it
   carries the city in its HTML and therefore requests no shard at all (the real card is #50 and will load only its
   own shard). Playwright: the home makes no `/data/` request before the search is used and exactly one, ending in
   `/search.json`, after; the city page makes no `/data/` request; nothing fetches a `.csv`; the fixture city shard is
   served under the build's fingerprint; fallback spec updated (city routes are pre-rendered since this ticket).
   Screenshot of the city page in `.captures/city/`.
4. **Real-data check, sizes and budgets.** `scripts/shard-check.ts` + `npm run check:shards`: every city
   (overseas included) has a shard, per (cycle, round) shard totals equal the CSV totals for the chosen `DATA_DIR`
   (real data for the recording), and sizes printed. Numbers and proposed budgets into `web/docs/shards.md`;
   README updated. Final commits.