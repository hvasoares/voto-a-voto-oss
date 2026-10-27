# Issue #50 (state, city and three-cycle pages) : checkpoints

Each checkpoint: behaviour tests ported from the old `site/` specs first or alongside, implement, keep green,
vitest + typecheck, screenshot review and one commit. Review protocol: `web/docs/screenshot-review-protocol.md`.

1. **Pure shared modules, screen styles.** Ported unchanged (imported through `@/`): `shared/city-search`,
   `shared/city-model`, `shared/components` (cycle/round tabs emit `data-ciclo`/`data-turno`), `shared/tokens`
   (into `src/theme.ts`), `data/*`, `analytics`, `paths`, `routes`; the screens' CSS from `site/src/shared/base.css`
   into `src/styles/screens.css`. Progressive enhancement is plain Astro `<script>` imports from `src/scripts/*`
   (each sets `document.documentElement.dataset.ready = '<feature>'`); e2e `waitReady` waits for that attribute.
   Commit `18d5108`.
2. **State page `/:uf/` pre-rendered from the shards** (Sketch frame "5"), scoped city search with no `/data/`
   request before interaction, fixture states rj/sp/mt; screenshot review of the fixture state vs frame 5 at 390x844.
   Commit `af60785`.
3. **City card `/:uf/:slug/` and three-cycle page `/:uf/:slug/tres-ciclos/` pre-rendered from the shards**
   (frames "2" and "9"); no `/data/` request at all for the default views (frames' ?turno=1 states covered by
   hidden panels pre-rendered too); ported `city.spec.ts` and `city-cycles.spec.ts` plus the #49 shard contract
   (no CSV fetch, overseas pre-rendered, unknown path 404). Screenshot review vs frames 2 and 9.
   Commit `4cc47d6`.
4. **Real share route.** `ShareSheet.tsx` island + `/:uf/:slug/compartilhar/` pre-rendered with the default view's
   content server-rendered (picture + text work without JS); the dimmed city card behind; `?ciclo=&turno=` views
   are re-derived client-side from the city's OWN shard only (at most one `/data/` request, only when the URL
   asks for another view). The demo route `/compartilhar/` stays as the #7 demo shell. Commit `ce69d8c`.
5. **Old site removed; CI and deploy are web-only.** `scripts/serve.ts` is self-hosted (Pages-like static server,
   no import from the old site) and `scripts/measure.ts` measures any dist directory. `DATA_DIR` defaults to
   the committed fixture dataset (`fixtures/data`, relative to `web/`, the package root; `DATA_DIR=../data` for
   the real dataset). `@site` aliases removed from `astro.config.ts`/`vitest.config.ts`/`tsconfig.json`;
   `site/` deleted (`site/reference/` → `web/reference/`, `site/fixtures/` → `web/fixtures/`, the screenshot-review
   protocol → `web/docs/screenshot-review-protocol.md`). GitHub workflows `ci.yml` (typecheck, vitest, Playwright
   phone project, e2e once plain and once under `SITE_BASE=/voto-a-voto/`) and `deploy.yml` (build with
   `SITE_BASE=/voto-a-voto/`, Pages artifact `web/dist`). README rewritten for the web layout. This commit.
   Also cleared the typecheck backlog: `tsc --noEmit` is at 0 errors (was 9).

## Screenshot review (the gate of checkpoints 2 and 3)

Frame fidelity, 390x844, reviewer fresh-context per `web/docs/screenshot-review-protocol.md`:

- **Frame "5 Estado" vs `/rj/` (fixture)** — PASS; accepted differences: the frame shows the UF placeholder
  text where the render shows the fixture state letter ("RJ"), and system-font fallback (accepted-platform).
- **Frame "2 Cartão da cidade" vs `/rj/cidade-exemplo/` (?turno=1)** — PASS; accepted differences: the frame's
  subtitle placeholder ("· UF") is the fixture city ("· RJ"); the frame's legend/footer wording is older than the
  copy approved in the slots (`slot.ts` wording is the source of truth); the map placeholder stays (the municipality
  map is tickets #16/#17).
- **Frame "9 Três ciclos" vs `.../tres-ciclos/` (?turno=1)** — PASS; same accepted placeholder/font differences.

## Conflict note with tickets in flight

Only the routes this ticket lists were built: `/:uf/`, `/:uf/:slug/`, `/:uf/:slug/tres-ciclos/` and
`/:uf/:slug/compartilhar/` (the #4/#7 share route wired to the city card). The state-level three-cycle page
`/tres-ciclos/:uf/` and `/brasil/` belong to tickets #14/#10/#15; `src/lib/fallback.ts` still lists those routes
so their links hold until their tickets land. Shared navigation wiring and the Google-Analytics plumbing were
not touched.

## Build time and output size per route (fixture dataset, this commit)

Clean production build (`SITE_BASE=/voto-a-voto/`): **34 pages in ~0.5 s** (`npx astro build`, wall ~1.3 s).
`dist/` total **1.04 MB raw / ~0.2 MB gzipped**: HTML 627 kB, JS+CSS (`_astro/`) 395 kB, data shards 18 kB.
Per route (raw HTML; gzip in parentheses):

| Route | HTML | Route | HTML |
|---|---|---|---|
| `/` (home) | 39 kB (5 kB) | `/:uf/` (rj, sp, mt) | 2 kB (1 kB) each |
| `/:uf/:slug/` city card | 16–17 kB (2 kB) | same, no-data (Boa Esperança do Norte) | 7 kB |
| `.../tres-ciclos/` | 9 kB (1 kB) | same, single cycle (Boa) | 5 kB |
| `.../compartilhar/` real | 35 kB (6 kB) | same, no-data (Boa) | 26 kB |
| `/compartilhar/` demo | 20 kB (5 kB) | `/sobre-os-dados/` | 13 kB |
| `/404.html` | <1 kB | | |

The 9 fixture cities are pre-rendered in shards `v3d920bd147a5df4d` (17 kB of JSON total, ~2 kB per city). The
share page is the largest pre-render because the default-view SVG picture is inlined twice (server-rendered island
+ the initial client props); the gzip number is what the browser sees.

Real dataset (`DATA_DIR=../data`, 5,760 cities): the shard fingerprint changes with the dataset
(`v2cc25d2e8eb691bf`, 23.6 MB of JSON); the same build produces **17,311 pages in ~2 min 5 s, dist 383 MB** (HTML ~359 MB, shards 23.6 MB);
per-route HTML sizes are the same as the fixture build (`/sp/sao-paulo/` card 17 kB/2 kB gzip, tres-ciclos 9 kB,
share 35 kB/6 kB) because the page code, not the dataset, sizes them. The real-data e2e suite (`npm run test:real`,
7 specs, search latency ~10 ms per keystroke over 5,760 cities) runs against this build; the Playwright web-server
boot budget was raised to 5 min to cover its slowest variant. The demo route `/compartilhar/` is fixture-only by
design (the demo shell draws the fixture city whichever `DATA_DIR` builds — a real build has no cidade-exemplo),
and `fixtureCityShards` reads the committed fixture dataset from memory, never the configured one; its version-path
filter was fixed in this checkpoint (the `city-model.test.ts` coverage loop was running over 0 shards and passing
vacuously).