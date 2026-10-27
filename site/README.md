# Voto a Voto: site (walking skeleton)

Static, mobile-first site: pre-rendered real-path pages (`/rj/cidade-exemplo/`), no hash routes, no server, no
API, no tile service. Hosted on GitHub Pages. Today every screen is a blank, clearly marked **slot**; hydration tickets
(#3 to #18, #20) fill them in parallel without touching each other.

## Commands (run inside `site/`)

| Command | What |
|---|---|
| `npm ci` then `npx playwright install chromium` | one-time setup |
| `npm run build` | static build into `dist/` (pages, 404.html, assets, data) |
| `npm run serve` | serve `dist/` like GitHub Pages (http://localhost:4173/) |
| `npm run dev` | rebuild on change + serve |
| `npm test` | unit/logic tests (vitest) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test:real` | same kind of checks against the real dataset in `../data` (builds with `DATA_DIR=../data`; skipped when missing) |
| `npm run test:e2e` | Playwright at 390x844: route smoke over every page, frontend-only check, 390 px layout |
| `npm run test:all` | typecheck + unit + e2e |
| `npm run slots` | list slots, owning ticket, hydrated or "not yet hydrated" |
| `npm run check-slot -- <slot>` | the gates for ONE slot, in order: behaviour tests, then fixture-state screenshot capture |
| `npm run approve-baseline -- <slot> --yes` | store the current render as regression baseline (only after the review passed) |
| `npm run test:baseline` | compare against approved baselines (skips slots with none) |

`site/Makefile` wraps these (`make -C site help`).

## Toolchain decision

> **Superseded for new work:** the user decided to rebuild the site on Astro + React islands + shadcn/ui (ticket #48). The new app is in `../web/`
> (see `web/README.md`); this vanilla site stays until ticket #50 removes it. The text below describes the old decision.

**TypeScript + esbuild + a ~100-line build script; vitest; Playwright. No UI framework.**

Why: the product is a handful of read-only screens over static CSVs. Needed: static build, pre-rendered real paths,
client-side hydration of slots, TypeScript. A framework (Next/Astro/SvelteKit) would add a build convention every
hydrating agent must learn and fight, and would couple slots through its routing. Instead:

- A slot is a module exporting `render(ctx) -> HTML string` (pure, runs in Node at build time and in the browser)
  and an optional `mount(root, ctx)` for interactivity. Pre-rendering is simply calling `render` per route.
- Navigation is plain `<a href>` between pre-rendered pages (multi-page site). No client router, no hash.
- Cost accepted: no virtual DOM. A hydrating agent may add a small library inside its own slot if it needs one
  (e.g. a QR or map library), but must keep to the frontend-only rule.

## Real paths and the 404 fallback

- Every route is a directory with `index.html` (`dist/rj/cidade-exemplo/index.html`), so GitHub Pages serves
  `/rj/cidade-exemplo/` directly and a **refresh never 404s** for any pre-rendered path (all fixture cities; ticket #8 pre-renders all 5,570).
- `dist/404.html` is the fallback for paths with no file. It loads the same client script, which resolves
  `location.pathname` against the routes and the dataset: a valid route that was not pre-rendered renders client
  side; anything else shows "Página não encontrada". (GitHub Pages keeps the 404 status code, which is right for real misses.)
- `SITE_BASE` sets the base path: `/` (default) or `/voto-a-voto/` for a project Pages site. Every link and data fetch
  goes through `withBase`. `.nojekyll` is emitted.
- `npm run serve` mimics Pages (301 from `/x` to `/x/`, 404.html for misses).

## Routes

`/` home · `/{uf}/` state · `/{uf}/{slug}/` city · `.../compartilhar/` · `.../qr/` · `.../tres-ciclos/` ·
`/brasil/` · `/brasil/{regiao}/` (not designed) · `/mapa/` · `/mapa/virada/` (`?vista=mapa` for the map view) ·
`/comparar/2022/` · `/comparar/2018/` · `/relatorios/` · `/relatorios/cidades-que-viraram/` ·
`/relatorios/como-cada-grupo-votou/` · `/relatorios/{slug}/` (4 not designed) · `/tres-ciclos/{uf}/` · `/sobre-os-dados/`.
Overseas posts live at `/zz/{slug}/` and are never offered as a state.

## Slots

One directory per slot in `src/slots/<id>/`: `slot.ts` (blank render + `meta`), `CONTRACT.md` (route, data read,
what it must show, Sketch frame, owning ticket, navigation), `fixture.ts` (fixture state), `slot.test.ts`.
`npm run slots` lists them. Rules (enforced by `src/slots/slots.test.ts`): a slot imports only its own files,
`src/shared/*`, `src/data` and `src/analytics`; never another slot; no hard-coded colours.

**Not-yet-hydrated test.** Each `slot.test.ts` has `it.fails('is hydrated (not yet hydrated)', ...)`. The suite is green
and vitest lists it as "expected fail". **To hydrate:** replace `render` in `slot.ts`, set `hydrated: true`, and change
`it.fails` to `it`. (If you forget the flip, vitest fails because the test now passes.) Then run
`npm run check-slot -- <slot>`.

| Slot | Route | Sketch frame | Ticket |
|---|---|---|---|
| home | `/` | 1 Home | #3 |
| city | `/:uf/:slug/` | 2 Cartão da cidade | #5 |
| share | `/:uf/:slug/compartilhar/` | 3 Folha de compartilhamento | #7 |
| qr | `/:uf/:slug/qr/` | 4 Mostrar QR | #9 |
| state | `/:uf/` | 5 Estado (opcional); map area for #16/#17 | #4 |
| reports | `/relatorios/` | 6 Relatórios | #12 |
| flipped-cities | `/relatorios/cidades-que-viraram/` | 7 Relatório: cidades que viraram | #12 |
| brasil | `/brasil/` | 8 Brasil e regiões | #10 |
| city-cycles | `/:uf/:slug/tres-ciclos/` | 9 Três ciclos (cidade) | #6 |
| state-map | `/mapa/` | 10 Mapa por estado (+ "(mapa)" view) | #11 |
| state-map-flip | `/mapa/virada/` | 10b Mapa por estado: virada (+ "(mapa)") | #11 |
| compare-2022 | `/comparar/2022/` | 11 Comparar com 2022 | #14 |
| compare-2018 | `/comparar/2018/` | 11b Comparar com 2018 | #14 |
| cohorts | `/relatorios/como-cada-grupo-votou/` | 12 Como cada grupo votou | #15 |
| state-cycles | `/tres-ciclos/:uf/` | 13 Três ciclos por estado | #14 |
| about | `/sobre-os-dados/` | 14 Sobre os dados | #18 |
| report-undesigned | `/relatorios/:report/` | none (4 reports not drawn) | #13 |
| region-detail | `/brasil/:regiao/` | none (box in "Fluxo") | #10 |

Consent banner (#20): mount point `#consent-slot` in the page frame and `consentBanner()` in `src/shared/components.ts` (hidden).

## Data

Typed interface `DataStore` in `src/data/types.ts`: `cities()`, `city(uf, slug)`, `citiesByUf(uf)`, `states()`,
`turnout(query)`, `votes(query)`, `candidates(query)`, `manifest()`. It reads the five files of ticket #1 (`cities.csv`,
`turnout.csv`, `votes.csv`, `candidates.csv`, `manifest.json`); the CSV header is validated and a missing column or a
non-integer count fails loudly naming file and column. Slots receive it as `ctx.data` and never touch files or `fetch`.

- **UF is lowercase everywhere** (`rj`, `zz` for overseas), as in the dataset and in routes. Parsers lowercase it, lookups are case-insensitive, display uppercases it only where the design shows it ("RJ").
- **Real data numbers** (5,760 cities): 23,113 pages, build about 4 s, `dist/` 63 MB (56 MB without `data/`, which is 7.3 MB), average page 2.3 KB (city 3.7 KB, share/qr/ciclos 1.5 to 3 KB, largest = state pages 47 KB).
- **Build time (Node):** reads the directory in `DATA_DIR` (default `fixtures/data`). Real data: `DATA_DIR=../data npm run build`.
- **Browser:** fetches `<base>data/<file>` from the site's own origin; the build copies the chosen directory to `dist/data/`.
- Swapping fixtures for real data therefore changes no screen. The fixture manifest has `"fixture": true`, which makes
  pages show the "EXEMPLO · DADOS FICTÍCIOS" banner.
- Fixtures (`fixtures/data`, regenerate with `npx tsx fixtures/generate.ts`): 9 cities (6 in RJ incl. "Cidade Exemplo" with
  the exact figures of the Sketch city card, one in SP, one 2026-only in MT, one overseas post `ZZ`), cycles 2018/2022/2026,
  both rounds. All numbers are fictitious.
- Heads-up for the real dataset: the browser loads whole CSVs (about 15 MB expected for the full set). Ticket #8/#19 may shard by UF; the `DataStore`
  interface is async for that reason and screens would not change.

## Analytics

`src/analytics`: `pageView(path, title)` and `event(name, props)`, a no-op. Screens call `ctx.analytics`. Ticket #20
calls `setAnalytics(...)` with a consent-gated provider. No Google code exists in this repo yet.

## Frontend only

Published output is static files and browser code. `e2e/frontend-only.spec.ts` fails if any page requests anything
that is not a GET to the site's own origin (it has a canary test proving the check can fail). Ticket #20 adds its one
allow-listed exception in `e2e/helpers.ts`.

## Design tokens and shared placeholders

`src/shared/tokens.ts` (colours = Sketch `v2/*` swatches, type sizes, spacing, radius) is the single source; the build
emits them as CSS custom properties. `src/shared/components.ts` holds placeholders with documented props
(`turnoutBar`, `cycleTabs`, `roundTabs`, `candidateRow`, `reportListItem`, `consentBanner`) and `page-frame.ts` the
page frame with the "Fonte: TSE" footer. Who owns which: `src/shared/README.md`.

## Screenshots and review

`site/reference/*.png` are the Sketch frames exported at 390x844 (`14-sobre-os-dados.png` is 390x1123: that frame is a long page).
`site/reference/*.texts.json` are all texts of each frame, verbatim. Protocol: `docs/screenshot-review-protocol.md`.

## Deploy and CI

`.github/workflows/ci.yml` (typecheck, unit, build, e2e on every push and PR) and `deploy.yml` (GitHub Pages on push to
`main`, `SITE_BASE=/voto-a-voto/`). Written but never run: the deploy cannot be verified until pushed and Pages is set to
"GitHub Actions" in the repository settings.
