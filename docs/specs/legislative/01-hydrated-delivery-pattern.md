# 01. Hydrated delivery pattern

Ticket: none. Depends on: the legislative data task (`src/voto_a_voto/legislative.py`). Used by every other spec in this folder; read [the index](README.md) for the shared decisions.

## Problem Statement

- **Claim.** Every legislative view (parties per state, elected, city card cargo switch, brancos e nulos) can reach the reader inside the existing budgets, because the page ships only what a reader without scripts can use and the rest arrives on demand.
- **Misreading to kill.** "The page is slow or empty without JavaScript", and its twin, "a number in the browser is not the number in the data". The pattern makes the table the truth and the interaction a projection of it: a share the browser shows is always `count / total` of integers that sit in the table or the shard, never a separate figure.
- **Who asks.** Every view in specs 02 to 07; the budgets leave no room otherwise (City card HTML has about 120 B of headroom on the fixture, shared CSS about 13.1 KB of 16 KB, see `web/docs/perf-budgets.md`).

## Solution

A legislative view has three layers, in this order of loading:

1. **Prerendered table** (HTML, in the build): an accessible `<table>` of the latest data of the view (latest year, elected only where the spec names people). It is the complete answer without scripts.
2. **Island** (`client:interaction`, hydrated on the first touch or focus, like `CitySearch` and the map islands): a control (year, cargo, state, party) that fetches one **shard** and redraws bars.
3. **Shard** (`public/data/v<fingerprint>/leg/...json`, integers only): the votes per party per municipality of one cargo, year and state. Shares and counts are computed in the browser by **one pure function** (`web/src/lib/leg-shares.ts`, new) that the build also calls to print the table, so table and island cannot differ.

States: island not yet ready (`data-ready="no"`, the table is the content), ready (`yes`), shard failed (`data-ready="failed"`, `data-error`, the table stays, one line says the chart could not load, in the catalog), no JavaScript (the table, and a `noscript` line naming the table as the full answer).

## User Stories

- As a visitor with no JavaScript, I read the full table of the latest election, in HTML, without a request after the page.
- As a visitor on keyboard or screen reader, I reach the control with Tab, the table has a caption, header cells with `scope`, and the redrawn view announces itself in an `aria-live` region; the chart is never the only carrier (the table is).
- As a suspicious reader, I follow "De onde vem este número?" to a fact record that states the source files, the sum and the rounding, and I can download the shard the bars were drawn from.
- As a visitor on a phone over 4G at first paint, I download no React and no shard: the island and the shard load on my first touch, and the first paint is the table.
- As the maintainer, I add a new legislative view by naming its table, its shard slice and its budget line, not by writing a new loader.

## Implementation Decisions

**Reuse (build once).**
- Ready gate: `web/src/lib/island-ready.ts` (pure reducer `gateReduce`, attributes) and `web/src/components/use-island-ready.ts` (`useIslandReady(name, { host, storage })`: `markReady`, `markFailed(reason)` writes one `console.error` line naming the island). Page script `web/src/scripts/island-pending.ts` keeps taps that land before hydration; the island replays them once. Islands name themselves `leg-<view>`.
- Selection state: `web/src/components/use-map-view.ts` for any view that selects an area; non-map views (party picker, cargo switch) use `useIslandReady` directly and a small `useLegShard(cargo, year, uf)` hook beside `use-city-shards.ts` (same fetch-once, `loading | failed` states, `linkHref` for the base path). No second copy of the fetch preamble.
- Shard plumbing: `web/integrations/shards.ts` (`buildShards`, `loadDatasetShards`, `generateShards`, deterministic JSON), `web/integrations/shards-fingerprint.ts` (`datasetFingerprint`, `shardsModule` and `virtual:data-shards`). `web/scripts/shard-plumbing-guard.test.ts` forbids re-reading the fingerprint files in loaders and checks, so the legislative loader is added inside these two files, not beside them.
- Budget: `web/scripts/perf-budgets.ts` (`ROUTES`, `BUDGETS`) and the pure `perf-judge.ts`; the record is `web/perf-record.json`.

**Where the data reaches the web build.** `data/legislative/` is git-ignored (`.gitignore`), several hundred MB and rebuilt by `make data`; the Pages build runs from a clean checkout and cannot read it. Recommendation: the Python data task also writes **committed derived tables** `data/legislative-web/` (the model is `data/nerds/`, built by `src/voto_a_voto/nerds.py`, with a `manifest.json` of size and SHA-256, rebuilt and compared byte for byte by `make data-check`), already reduced to the shard shape below, with fixtures in `web/fixtures/data/legislative-web/`. The web build reads only that folder. A separate **legislative fingerprint** (sha256 of the manifest) names `leg/v<legfp>/`, exported by `virtual:data-shards` beside `SHARD_VERSION`; it is not added to `FINGERPRINT_FILES`, so a legislative refresh never invalidates the city shards.

**Shard: where it lives and schema (proposal).** One file per cargo, year and state: `public/data/v<legfp>/leg/<cargo>/<ano>/<uf>.json`, `cargo` in `senador | deputado-federal`. Integers only, fixed key order, no rounding, no trailing newline (the rules of `web/docs/shards.md`):

```
{ "partidos": ["PL","PT",...], "agrupados": 14, "municipios": [cd,...],
  "votos": [[...per municipality], ...one row per partido...],
  "outros": [...per municipality], "validos": [...], "brancos": [...], "nulos": [...] }
```

- `partidos` are the top 12 parties or federations of the state-year by valid votes, ties by ballot number; `outros` is everyone else folded into one row per municipality; `agrupados` is how many parties it folds in, printed in the legend ("Outros (14 partidos)"), computed by the build.
- `municipios` follows the order of the state shard (`state/<uf>.json`), so the rows carry no repeated names.
- Reconciliation, checked at build and by the check script: for every municipality `sum(votos[*][i]) + outros[i] = validos[i]` (the party-level valid votes of the TSE totals, nominal plus legend); the sum over municipalities equals the state total in the prerendered table; `validos + brancos + nulos` equals the TSE counts of the municipality.
- Elected people are not in the shard: they are in the prerendered table (spec 02), at most 70 names per state.
- Alternative considered: one shard per cargo-year for the whole country (about 5,700 municipalities times 13 rows: too large for a phone); and a shard per municipality (many requests). Recommended: per state, consistent with the existing state shards.

**Measuring weight.** `check:perf` sums gzip bytes (node:zlib over the built files) of html, css, eagerJs (every `<script src>`), islandJs (every `component-url` and `renderer-url` of `astro-island`; `client:interaction` islands do not load at page load, the number is the cost on first touch). Shard weight is measured by a new `check:legislative` (beside `shard-check.ts`) in raw and gzip bytes on disk; the first ticket records a measured baseline on the real data (`DATA_DIR=../data`, like `check:shards:real`).

**Budget lines (proposal, each fixed from a measured baseline by its ticket).**

| Route or island | html | css | eagerJs | islandJs | shard (raw / gzip) |
|---|---|---|---|---|---|
| Table-only legislative page (class of `region`: report shell, no island) | 6 KB | 16 | 3 | 3 | none |
| Legislative page with island (class of `mapa`) | 8 KB | 16 | 3 | 45 | per state 120 kB / 32 kB (the state shard budget); expected 25 to 45 kB raw (Fermi: 645 municipalities times 13 rows times about 5 characters for the largest state) |
| City card with the cargo switch (existing `city` route) | 6.4 KB, unchanged | 16 | 3 | 3 | none loaded at first paint; island shard on first touch |

New routes become `RouteId` entries; the city card keeps its line, so its switch must prerender nothing new beyond the control (spec 04 owns that line).

**Visual decisions.**
- Chart family: a table first; on interaction, horizontal bars of share per party (a share is one length, comparable across rows), never pies. Finest grain: municipality in the shard; the view shows the state or one municipality.
- Palette: tokens of `web/src/shared/tokens.ts`; party color never carries identity alone (the abbreviation is printed on each bar). One neutral token for "Outros".
- Scale: shares on a linear scale from zero, the maximum stated in words in the legend ("a barra mais longa é X%"), computed by the build.
- Legend copy: the folding line "Outros: N partidos, X%" computed from `agrupados`; labels from the sentence catalog (`web/src/lib/sentences/catalog.ts`), no typed sentences.
- Annotations: none on bars; the total (valid votes) above the table.
- Fallback: the table; failed-island line; `noscript` line. The failed-island text is "Não deu para carregar os dados deste cargo." then "A tabela acima continua valendo."; no internal state word (`data-ready`, "estado falhou") reaches user-facing text.
- Type scale: legislative views use only the site's four sizes (13, 16, 20, 26 px; weights 400 and 700) from the type tokens; any other size fails the existing type-scale guard.

## Testing Decisions

Visual testing rules (verbatim from `docs/checklists/dataviz-lens.md`):
- Assert structure and interaction only; never canvas or SVG pixels.
- Generated artifacts (geometry, shards) are pinned byte-for-byte on a synthetic fixture (determinism) and checked against the real dataset by a `check:` script at build time.
- Join invariants fail the build loud: every entity the visual claims to cover appears exactly once.
- e2e runs over the committed fixture dataset; suites are serialised (shared E2E port, never parallel agents).
- Exit criteria include the screenshot-review protocol and a ux-review pass on the phone frame, not just green tests.

Specific tests: unit tests of `leg-shares.ts` (rounding, zero total, `outros` row); a gate test per island with the pending-tap replay (model: `use-island-ready.test.tsx`); an e2e that waits on `data-ready` (presets in `web/e2e/presets.ts`, no sleeps), asserts that no shard is requested before the first touch, that the table is present with scripts disabled, and that a blocked shard request yields `data-ready="failed"` with the table intact; `perf-judge` tests for the new route entries; the shard byte-pin on the fixture.

## Out of Scope

Per-candidate shards (no view lists non-elected candidates); municipality-by-municipality party comparison; a time-series shard across 2018, 2022 and 2026 (spec 07 may need one: follow-up, judged against this schema); a service worker or prefetch on hover; a public API page for the legislative shards (the shards are served as files; documenting them in `/api/` is deferred).

## Further Notes (flagged decisions)

1. Committed `data/legislative-web/` versus building the shards in CI from the raw files. Recommended: committed derived tables (CI has no 600 MB cache).
2. Top parties per shard: 12. Recommended 12 for the Chamber; the Senate has few candidates per state, so its shard lists every candidate's party and no `outros`. To be confirmed on the measured shard weight.
3. Budget numbers above are proposals; the first ticket measures and fixes them.
4. Rounding of printed shares: one decimal, half up, in integer arithmetic. Recommended; owner confirms.
