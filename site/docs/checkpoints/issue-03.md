# Issue #3 (home) : checkpoints

Each checkpoint: failing behaviour tests first, implement, flip/keep green, `npm run check-slot -- home`,
fresh-context screenshot review (docs/screenshot-review-protocol.md), one commit.

1. **Static page and UF grid.** Hydrate the slot: title, tagline, "Compare com 2018 e 2022.", search field shell,
   the 27 UF tiles in the Sketch cartogram layout (plain anchors to `/{uf}/`, never `zz`), "Para explorar" (4 entries),
   footer "Dados oficiais do TSE · Sobre os dados". Flip `it.fails` to `it`. Tests: tile table (27, unique, no `zz`,
   no cell collisions, covers every UF of the real dataset), render test (anchors, texts, no marker).
2. **Search logic (pure).** Accent/case-insensitive folding, multi-word and UF tokens, ranking (exact, prefix,
   word prefix, substring), duplicates across states keep their UF, overseas posts labelled "Exterior" and findable,
   display names (TSE upper case to Title Case), result cap. Tests: vitest only.
3. **Search UI and analytics.** `mount()` enhances the box: results list (name + UF, >= 44 px tap targets), empty
   state, events `search` (result count, query length, no text), `search_result_tap`, `state_tile_tap`. Data only from
   `ctx.data`. Tests: vitest for the event payloads, Playwright for typing at 390 px and no foreign requests.
4. **Real data and base path.** `DATA_DIR=../data npm run build`; real-data Playwright checks (sao paulo, brasilia,
   Belem, duplicated names, 27 tiles link to existing state pages, no foreign requests); SITE_BASE=/voto-a-voto/ run;
   latency measurement on 5,760 cities; fix the skeleton smoke test that clicked the old placeholder link.
