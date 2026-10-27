# Issue #17 (municipality map for every state) : checkpoints

The same municipality map of #16 (`/mapa/rj/`) is now the dynamic route `/mapa/:uf/`, one pre-rendered
page per state — 27 pages, all driven by the same state-agnostic island `CityMapMap` and the
state-agnostic data half #16 built (`city-map-data.ts` keyed by `uf`+`cd-municipio`, mesh keyed by the
7-digit IBGE code). `/mapa/rj/` keeps working (same URL as #16, now served by the dynamic route).

1. **Mesh data task for the 27 UFs.** `scripts/generate-municipality-polygons.ts` — the same script and
   parameters as #16, in a loop over all 27 state codes (IBGE malhas estatóides v3, codes 11–53). Every
   file `public/geo/municipios-<uf>.json` carries the provenance header (API URL, download date,
   tolerance); downloads were RJ 2026-10-26 (RJ is byte-identical to the #16 file — same date, same
   parameters) and the other 26 on 2026-10-27. Geometry: largest ring per municipality, Douglas-Peucker
   0.008° for every state EXCEPT MG, sampled at **0.012°** (853 municipalities — the largest mesh — was
   the only one above the budget at 0.008°). Equirectangular (x scaled by cos of the mean latitude),
   90 px/degree, keys = 7-digit IBGE codes. Two artifacts of the real world, both handled where they
   appear: the few-point minimum ring (PB's 2510105 keeps 5 vertices) and no-mesh municipalities (see
   checkpoint 2's MT note). Measured (all 27; budget from #16 is the largest file ≤ 400 kB raw /
   120 kB gzip):

   | file | raw | gzip |
   |---|---|---|
   | municipios-mg.json (largest) | 304,400 B | 113,061 B |
   | municipios-sp.json | 237,482 B | 85,223 B |
   | municipios-rs.json | 227,595 B | 81,487 B |
   | TOTAL (27 files) | 2,832,948 B | 1,007,911 B |

   Budget check: MG, the largest, is 113 kB gzip ≤ 120 kB (headroom ~1.3x as required); SP and RS come
   next, everything else far below. Provenance/regeneration determinism: regenerating RJ with the #16
   inputs is byte-identical (`cmp`-verified before commit). Unit tests: validating parser + a per-state
   join suite asserting every dataset municipality matches the mesh by 7-digit code for all 27 UFs on
   the REAL dataset, a budget assert (largest gzip ≤ 120 kB), and a determinism pin.

   Status: DONE — commit 4c6edc1 (stale e2e reconcile, below), 7040ca3 (generator + parser/tests + 27
   geo JSONs).

2. **Route + state-page placeholder + e2e.** `src/pages/mapa/[uf]/index.astro` (dynamic; getStaticPaths
   from the shards' 27 UFs) replaced `mapa/rj/index.astro` verbatim + subtitle: DF's single row gets the
   singular sentence "no 1 município do estado." (others "nos N municípios"). The #50 state page
   `src/pages/[uf]/index.astro` fills `data-placeholder="state-map"` with the same island
   (`loadCityMapData(uf)`, `semContornoOf`, defensive: the placeholder only renders when the state has
   municipality rows) instead of the 220 px dashed stand-in; CSS addition `.state-map--island` (only the
   stand-in keeps the dashed box). `src/lib/uf-names.ts` is the pages' name source. Item 6 of the
   ticket: the `/mapa/` paragraph `data-mapa-municipio` reads "a página do estado traz o mapa dos
   municípios." — the /mapa/ mosaic already links every tile to `/:uf/`, so no other wiring was needed.
   `src/lib/fallback.ts` gained `'/mapa/:uf/'` in KNOWN_ROUTES (spec + classifyPath test pinned).
   Mismatches with real data, handled exactly as #16 (muted without-fill + legend note + row without
   map match): on the REAL dataset the only mismatch is MT — **Boa Esperança do Norte** (TSE code
   73709, IBGE 5101837, created after the 2022 boundaries IBGE publishes) has dataset rows but no mesh
   shape: its list row shows its REAL figures (-42,7 pp on 3.298 valid votes in the 2º turno) with no
   shape on the map, and the legend's `escala-sem-contorno` note counts it (MT only: 1 sem contorno;
   the other 26 UFs render "0" and the note never appears — verified per state by the new `semContornoOf`
   unit test plus the real spot e2e). No municipality in the 26 other states is unmatched.

   Status: DONE — commit c2e5c38.

3. **Gates + fresh-context capture review.** Rounds and verdict recorded here:
   - Round 1 — captures `.captures/mapa-uf/{rj-lista,mt-lista,sp-lista,mt-mapa,estado-rj}.png` (390x844,
     scroll 0, plus estado-rj-full.png for below-the-fold inspection), JSON sidecars each pointing at
     the approved reference `.captures/mapa-uf/rj-lista.png`. Reviewed in FRESH context against the
     approved closest screen. VERDICT: PASS 4/4, ZERO blockers — no overlap, no cut text, no element
     outside the viewport, no font/weight/color/radius deviation on any shared component element; every
     listed difference (16 all told) is expected content (state names, data figures, DF/MT singular
     wording), flow-driven repositioning ( fewer rows ⇒ legend sits higher ), or a state-page/map-view
     element with no list-view counterpart. Two cosmetic notes recorded for someday, explicitly NOT
     code-fixable blockers per the review's scope: sp-lista's vote figure lands ~2-3 px right of the
     reference's (glyph-advance level at 390 px; the alignment column still reads right-aligned), and
     estado-rj's footer `.state-links` stacks its fixed-width columns tighter than the page's 20 px
     gutter (pre-#50 chrome, nothing clipped).
   - Full gate numbers on the final tip: vitest **457 passed (44 files)**; `tsc --noEmit` **0 errors**;
   phone fixture suite **157 passed**; `npm run test:real` **59 passed** (with the fixture dist too:
   df/rr/rs/sp/mg/mt spot e2e green — mt carries the 73709 row + note pins, mg asserts 853 shapes in
   < 25 s, df asserts the whole page makes exactly one GET, `/geo/municipios-df.json`, and the singular
   sentence). Determinism: fixture dist built twice → `diff -rq` clean; shards check OK.

   Deviations / honest notes, deliberate:
   - Commit 50de569's message says "two files" but its stat is 1 file: at commit time only the disputas
     page differed on disk; the real spec had already been reverted to main's content. Both files are
     content-identical to main@579b8f2 on this branch — the message overstates by one file.
   - The unit join/budget/determinism tests live in `municipality-geo.test.ts` (checked 27-file listing
     in the suite, like #16 did for RJ) — NOT as a `manifest.json` of the geo directory (nothing else in
     the repo has one; the suite's per-file loop is the audited listing).
   - Stale-pin reconciliations against the branch base 900f77b (commit 4c6edc1): the silently-SKIPPED
     `e2e/mapa-rj.spec.ts` (its skip predicate pointed at a pre-#50 fixtures path — 9 tests had not run
     since #50; predicate fixed, all 9 genuinely run and green now), `e2e/fallback.spec.ts` (the
     retargeted /qr/ 404 pin), `e2e/qr.spec.ts` (the retired Mostrar QR pin) and the pre-existing
     real-data `/mapa/` 27-shapes failure (fixed on eb90ff6: side value-boxes are also `a[data-uf]`
     anchors, and the harvest raced the on-demand mesh fetch).
   - **Merge-time reconcile needed with main's tip c014615** ("city QR route /:uf/:slug/qr/ + Mostrar
     QR links …", landed on main AFTER this branch's base): main re-adds the /qr/ route and the
     Mostrar QR links, which supersedes two of 4c6edc1's pins (`fallback.spec.ts` /qr/ 404 and
     `qr.spec.ts` sem-QR). Both commits are locally green on their own basis; reconcile those two
     specs when merging this branch (keep c014615's route behaviour, drop/retarget 4c6edc1's two pins).
     The branch is NOT rebased: main moved mid-flight and the rebase conflicts with c014615 by design.
   - Shared-file touches to flag (minimal diffs, per the constraint): `src/lib/fallback.ts` (+1 known
     route), `src/pages/mapa/index.astro` (the #11 pages: one paragraph `data-mapa-municipio` + its
     comment), `src/pages/[uf]/index.astro` (the #50 state page: placeholder fills now) and
     `src/styles/screens.css` (the `.state-map--island` override). No touch on navigation/home,
     relatorios, GA plumbing or share modules. Real data committed: none (meshes are IBGE-derived
     geometry, not TSE results; generated at dev time, builds need no network — the committed geo files
     are the shipped artifact).

## Neutrality and a11y notes

- #16's rules carry over untouched and remain regression-protected: the label-placement pass, the
  luminance-derived ink, labels above all shapes (both pinned by the island's unit tests), the numeric
  legend edges, the muted without-fill treatment plus the two legend notes. Colour is never alone: the
  signed pp is on every list row, labels, aria-labels and the panel; the state name and page sentences
  come from `uf-names.ts` (IBGE geography — no election figure is hard-coded).
- All interactive elements are ≥ 40–44 px; the pages never scroll sideways at 390 px; the fixture e2e
  asserts the /mapa/ paragraph says the state pages hold the maps (no dead drill-down text).