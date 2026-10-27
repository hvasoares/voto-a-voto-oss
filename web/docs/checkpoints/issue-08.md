# Issue #8 (pre-rendered pages and link previews for every city) : checkpoints

Each checkpoint: tests first, implement, keep green, vitest + typecheck, commit — convention as in
`web/docs/checkpoints/issue-50.md`. The page head of `/:uf/:slug/` is the only route change; the images
are built by a new integration. The strings and the picture all come from the city's own CityResult of
the card's default view — no figure is hard-coded anywhere (data-figure rule), fixture cities say their
data is fictitious in the description, as the pages do.

1. **Pure head contract + the image build.** `src/lib/link-preview.ts` (PURE): `previewHead` (document
   title, og:title, meta description, og:url, og:image url/type/width/height/alt, all derived from
   `buildCityResult`'s numbers; a city without a result tags no og:image), `previewFile`/`previewPath`/
   `previewUrl`, `previewSvg` = THE share picture (`shareCardSvg` through `shareContent`, ticket #7's
   function) at the og display size. `shareCardAlt` extracted in `share-card.ts` (the svg `<title>` =
   the og:image alt). `integrations/preview-images.ts`: build plan per city (default view = latest
   cycle/round with data), rasterised with sharp (480px-wide **palette PNG, quality 100**) into
   `public/preview/<uf>/<slug>.png` (writes via a `.part` temp + atomic rename), cached resumably in
   `.cache/previews/v<shard-fingerprint>/…` (gitignored, per-file resume, one rasterisation per cache
   miss, stale/foreign-contract cache version dirs rebuilt, older version dirs pruned — mechanics in the
   module's doc comment). Registered in `astro.config.ts` right after `dataset()` (it reads the shards
   that one writes). `integrations/preview-images.test.ts`: cache/copies/resume/sentinel mechanics with
   stub rasters, plus the real rasteriser (PNG metadata and the fixture picture's size class). Also:
   the `sharp` devDependency; one-line fix in `src/lib/brasil.test.ts` — the fixture dataset path left
   cwd-dependent by the #50 move to `web/fixtures/data` (that suite failed on `main` too). Commit `6a1e322`.
2. **The page head on `/:uf/:slug/`.** `Base.astro` grows optional `description`/`preview` props (meta
   description; og/twitter tags; pages that pass neither render exactly as before). The city page loads
   its own shard and prints `previewHead`'s tags — pre-rendered static strings, no JS; title and
   description also for cities with no result (og:image absent then). `city-preview.spec.ts` (fixture):
   the tags of the default view, og:image resolution (200, `image/png`, >5 KB, right file per page —
   three UFs checked), no `/data/` request, tags independent of scripts. Commit `ab005f7`.
3. **Real-data spot-check + capture.** `real-data-preview.spec.ts` (real project): ten routes
   (`sp/sao-paulo`, `df/brasilia`, `al|pa|pb/belem` — one name in three UFs, accented names
   `go/abadiania`, `ce/acarau`, `zz/abidja`, two overseas posts `zz/freetown`, `zz/lethem` whose latest
   cycle is 2018) each opens the right page (its own h1 and head) and fetches its own og:image
   (200, `image/png`, >5 KB), whose file also exists in `dist` as a real PNG. `capture-preview.spec.ts`
   (capture project): the og:image raster next to the same share svg drawn by Chromium at 480x476,
   both with the protocol's JSON sidecars (`.captures/city-preview/`). Commit `f773e86`, fixed up once
   after (`Acaraú`, not `Acaráú`, in one expected h1; the tsc-narrowing of the spec helper).

## The image: format, size, budget (measured on the real dataset, 5,760 cities)

- **Format chosen: PNG, palette-quantised, quality 100, 480x476** (the card's 1080x1070 viewBox scaled;
  the drawing is flat colours and coarse text, so the 8-bit palette keeps it crisp). Lossless-ish,
  universally supported by og consumers; already served as `image/png` by `scripts/serve.ts`.
- Measured alternatives: JPEG q72 ≈ 38 KB/city (>2x bytes, lossy text edges); WebP q70 ≈ 16–22 KB (smaller
  but not universally honoured as og:image); palette q90 (~30% smaller) visibly degrades anti-aliased text.
- **Per image: 17–23 KB (mean ≈ 19 KB). Total published: `previews: 5760 imagens … 109.9 MB`** — the
  integration's own report of one cold real build (copied unchanged into the output).
- **Budget context (recorded honestly):** the published-size target quoted by the ticket (200–300 MB
  total) was already far past the images at the baseline of main — the #50 dataset shards + 17,311 pages
  measured ≈ 383 MB of `dist/` before any preview image. The images add ≈ 110 MB; the HTML tags add
  ≈ 1.5 KB/page (the og/twitter block on `/rj/cidade-exemplo/`), ≈ 8.6 MB over 5,760 city pages. Format
  and density above are the lever actually available to this ticket, and the PNG palette choice is the
  smallest of the measured candidates that stays sharp.

## Build times and memory (real dataset, full build)

- **Cold** (empty cache): previews 53.6 s for 5,760 images (~109.9 MB); whole build ≈ 3 m 33 s; peak RSS
  ≈ 1.96 GB (measured with `/usr/bin/time -l`; the baseline #50 build was ≈ 2 min / ~1.7 GB, so the
  rasterisation phase adds ≈ 1 min and ≈ 0.2 GB).
- **Warm** (cache from the cold run): previews **0 rasterizadas, 5.760 do cache**, 28.7 s (the copies into
  `public/preview/` dominate); whole build ≈ 3 m; peak RSS ≈ 1.73 GB. The cache makes interrupted builds
  resumable per city (`.part` + atomic rename everywhere) and no-op for an unchanged dataset.
- Pages: 17,351 pre-rendered pages on the real build (baseline was 17,311 at the #49-era count —
  the city card routes of #50 are the same here; the delta is fixture/real dataset bookkeeping, not #8).

## Per-route page sizes (real dataset, with the preview tags)

- City card `index.html` (e.g. `/rj/cidade-exemplo/` fixture page): ≈ 18.8 KB, of which ≈ 1.5 KB is the
  og/twitter head block; the overseas/no-image variants tag no og:image (≈ 1.0 KB of head). State pages
  and the other routes are unchanged (they pass no description/preview).
- `dist/preview/` = 109.9 MB over 5,760 PNGs (+ one `.generator` sentinel per directory).

## Spot-check procedure (the 10 slugs of the real e2e)

`rtk proxy npm run test:real` builds the real dataset and runs `e2e/real-data-preview.spec.ts`:
São Paulo/SP (biggest), Brasília/DF (accented capital), Belém in AL, PA and PB (one name in several
states — each page head must be its own), Abadiânia/GO, Acaráú→`Acaraú`/CE (accents in the name, ASCII
slugs), Abidjã on `zz` (overseas), Freetown and Lethem on `zz` (only the 2018 cycle exists — the head
says 2018 while most say 2026). Every route: 200, its own h1, its own title/description, og:image ===
`…/preview/<uf>/<slug>.png`, fetch 200 + `image/png` + >5 KB, and the file exists in `dist`.
(`acarau` was corrected once in the spec — `displayName('ACARAÚ')` is `Acaraú`, not `Acaráú`.)

## Screenshot review (the gate of checkpoint 3)

The protocol's frames cover the site's screens; ticket #8's only new picture is the og raster, so the
review compares — per the protocol's freshness/fresh-context rules, adapted (documented amendment: both
sides 480x476, not the 390x844 screen compare):
- `web/.captures/city-preview/og-image.png` — the build's og:image raster (the fixture city, default
  view, with the EXEMPLO tag), and
- `web/.captures/city-preview/svg-rendered.png` — the IDENTICAL svg (`viewBox 0 0 1080 1070`, the
  island's pre-printed share picture) rendered by Chromium at 480x476.
Sidecars per the protocol. **Rounds: 0 — pending.** The fresh-context reviewer pass was not started:
the session was directed to wrap up without opening new review cycles. The author's own eyeball check of
the pair sees no differences beyond font rasterisation/antialiasing (libvips/pango vs Chromium system
fonts), the accepted-platform class of the protocol — but that judgement is the reviewer's, not this
document's, and the pass is still owed to the protocol.

## Gates (as of the final commit)

- `rtk proxy npx vitest run` — 431 tests, 43 files, all green (includes the 22 new preview tests).
- `rtk proxy npx tsc --noEmit` — 0 errors.
- `rtk proxy npm run test:e2e` (phone, fixture) — 145 passed for the suite incl. the 6 new
  `city-preview` ones; **2 pre-existing failures reproduced on `main` in this environment**:
  `fallback.spec.ts` "a valid route that is not pre-rendered" (`/tres-ciclos/rj/` became pre-rendered in
  #14 without updating that spec) and `qr.spec.ts` "the share sheet links to this screen" — no file of
  this ticket touched in either.
- `rtk proxy npm run test:real` (real dataset build) — the new `real-data-preview.spec.ts` **11/11 green**;
  the full real project run was 52/55, the 3 failures (`real-data-mapa.spec.ts:38`, `reports-real-data.spec.ts:89`
  and `:119`) are **pre-existing at HEAD `c0f88c8`**, which changed the reports copy
  (`… mantiveram o mesmo número de votos em 2022`) without updating `reports-real-data.spec.ts`, and
  `real-data-mapa.spec.ts:38` asserts on the map island without waiting for `client:interaction`
  hydration (an empty `a[data-uf]` set is the race; this ticket touches no island or map code —
  verification: the same built `dist/mapa/` hydrates fine in a probe, 27+ anchors in ~0.5 s, no island
  failure and no page errors).
- capture project — 40 passed including the new `capture-preview`.

## Shared-file changes flagged

- `src/layouts/Base.astro` (optional `description`/`preview` head props) — pages passing neither render
  byte-equal to before; covered by the city-preview e2e and the unchanged other e2e.
- The `brasil.test.ts` one-liner above (blocking fix, its own commit is folded into checkpoint 1 and
  called out in the message).