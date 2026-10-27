# Voto a Voto: web (Astro + React islands + shadcn/ui)

The web app of the site, on Astro (static output) + React islands + shadcn/ui on Tailwind CSS 4 (decided by the user
for ticket #48; it supersedes the old plain-TypeScript build removed by ticket #50). Tickets: #48 home (tracer),
#49 JSON data shards, #50 port state / city / three-cycle pages + real share route and removal of the old build.

## Toolchain decision

**Astro (static output) + React islands + shadcn/ui on Tailwind CSS 4. Decided by the user**.

Versions installed (exact, from `package-lock.json`): astro 7.4.2, @astrojs/react 7.1.1, react / react-dom 19.3.1,
tailwindcss and @tailwindcss/vite 4.3.3, shadcn CLI 4.22.1 (style `radix-nova`, `radix-ui` 1.8.1, `cmdk` 1.1.1,
`lucide-react`, `class-variance-authority`, `cn`, `tw-animate-css`), typescript 7.0.2, vitest 5.0.5, @playwright/test 1.64.1,
jsdom + @testing-library/react for the island test. Node 24 was used (engines: >=22.12). Setup followed the current
docs: ui.shadcn.com/docs/installation/astro (existing project path), docs.astro.build React and Tailwind guides.
Two differences from those docs: TypeScript 7 removed `baseUrl`, so `tsconfig.json` has only `paths`; and the
Geist font that `shadcn init` adds was removed (the Sketch fonts are system fonts).

### Trade-offs measured (home page, fixture dataset, gzip)

| | old vanilla `site/` | `web/` (Astro) |
|---|---|---|
| HTML | 1.5 KB | 5.6 KB (pre-rendered search box and Tailwind classes) |
| CSS | 3.9 KB | 8.1 KB (Tailwind + shadcn base + tw-animate) |
| JS on load, before any interaction | 18.5 KB (`app.js` holds every slot: not home-only) | 0.3 KB (tile analytics) |
| JS after the search is used | 18.5 KB | 102 KB (React + react-dom 69 KB, island with cmdk and Radix 32 KB, glue 1 KB) |
| data fetched by the search (fixtures / real dataset) | 0.3 KB / about 0.4 MB raw (`cities.csv`) | search shard only: 0.2 KB / 60 KB gzip (`search.json`, once the field gains focus) |
| build time for this page | 0.5 s | 0.7 to 1.0 s |

Reading: the page itself is lighter at load than before (no JS until used) but searching costs about 5.5x more JS than
the vanilla site, mostly React itself (the CDN candidate, see below). The 100 KB is paid only by visitors who search.
Measure again with `npx tsx scripts/measure.ts <dist dir> [--search]` (serves the directory, loads the page in Chromium at 390x844, prints every response gzipped).

## Layout

```
web/
  astro.config.ts          base (SITE_BASE), integrations, Vite aliases
  components.json          shadcn config (aliases @/components, @/lib/utils)
  cdn.config.json         approved CDN origins + pinned libraries (EMPTY by default)
  integrations/           dataset (writes the shards to public/data), theme (virtual:theme.css), interaction (client:interaction), cdn
  integrations/shards.ts  the shard builder (issue #49; layout and budgets: docs/shards.md)
  src/components/CityCard.astro  the city card page body (and the dimmed backdrop of the share route)
  src/pages/              one file per route (see "Routes" below), 404.astro (client fallback)
  src/layouts/Base.astro  html shell + #consent-slot
  src/components/         CitySearch.tsx, ShareSheet.tsx (islands) + ui/ (shadcn, copied code)
  src/lib/                data-dir, search-data (fetches the search shard), shard-files (Node shard readers), city-shard
                          (shard -> pure CityResult), share-model/share-text/share-card/share-url, city-routes, fallback, about
  src/scripts/            screen scripts (state-search, city-card, city-cycles), tile-analytics, fallback
  src/slots/              the pure models and view builders ported from the old slot code (city, city-cycles, state, home)
  src/theme.ts            Sketch tokens -> shadcn/Tailwind variables (single place)
  fixtures/               the committed fixture dataset (generator: npx tsx fixtures/generate.ts)
  reference/              the approved Sketch frame PNGs (plus the OCR'd texts) of the reviewed screens
  e2e/                    Playwright specs;  scripts/  serve.ts, measure.ts, shard-check.ts
```

### Pure modules moved from the old `site/src/` (ticket #50)

`shared/city-search`, `shared/city-model`, `shared/components`, `shared/html`, `shared/tokens`, `data/*` (CSV parser and
store), `analytics`, `paths`, `routes`, `slots/home/uf-grid` + `search-ui`, `slots/{state,city,city-cycles}/*` live under
`src/` now (imported through `@/`). The old `site/` build was deleted once everything was ported.

## Commands (inside `web/`)

| Command | What |
|---|---|
| `npm ci` then `npx playwright install chromium` | one-time setup |
| `npm run dev` | Astro dev server (everything bundled locally) |
| `npm run build` | static build into `dist/` (local bundle, no CDN) |
| `npm run build:production` | production build into `dist-production/` (CDN only if `cdn.config.json` lists libraries) |
| `npm run test:e2e:production` | the phone suite against the production build (approved CDN origins allowed; none today) |
| `npm run test:cdn` | CDN mechanism tests against a fake CDN (test double) and a production build that uses it |
| `PORT=4175 npm run serve` | serve `dist/` like GitHub Pages (301 to trailing slash, 404.html for misses, honours SITE_BASE) |
| `npm test` | vitest: shards (builder + data check), pure logic, theme mapping, island behaviour in jsdom |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run check:shards` | shard data check + sizes (fixture dataset); `check:shards:real` for the real `../data` |
| `npm run test:e2e` | builds, serves on E2E_PORT (default 4176) and runs Playwright: project `phone` (390x844) and project `desktop` (1440x900, each spec resizes for its 390/768 checks) |
| `npm run test:real` | same against the real dataset (`DATA_DIR=../data`); skipped when missing |
| `npm run capture` | writes `.captures/home/default.png` (fixture state, 390x844) for the screenshot review |

Environment: `SITE_BASE=/voto-a-voto/` for a project Pages site; `DATA_DIR` (relative to `web/`) picks the dataset:
default `fixtures/data` (committed fixtures), real data `DATA_DIR=../data`. `OUT_DIR` changes the output directory.

## How things work (read before #49, #50 and new pages)

- **Add a page**: a file in `src/pages/` (`rj/index.astro` or a dynamic `[uf]/index.astro` with `getStaticPaths`). Wrap it in
  `layouts/Base.astro`. Links go through `withBase(base, '/path/')` from `@/paths` (`base = normalizeBase(import.meta.env.BASE_URL)`).
  `trailingSlash: 'always'` and `format: 'directory'` give real paths `/rj/cidade-exemplo/index.html`.
- **Add a shadcn component**: `npx shadcn@latest add <name>` (needs `npm_config_ignore_scripts=true` for safety; it installs dependencies).
  Installed now: button, card, command, input, input-group, textarea, dialog (the last three are dependencies of command). Components
  are copied code under `src/components/ui/`; style through classes at the use site (see `FIELD` in `CitySearch.tsx`)
  instead of editing them. The shadcn `CommandItem` always appends a check icon, so it cannot be used with `asChild`; put the anchor inside.
- **Plain HTML first**: anything that must work without JavaScript (state grid, links, footer) is Astro markup, not React.
  shadcn styles without React: `buttonVariants()` from `ui/button` gives the class string (used for the UF tiles).
- **Islands** are hydrated by `client:interaction` (`integrations/interaction-directive.js`): on first focus, pointer, touch or key
  inside the island. Nothing of the island is downloaded before that; text typed meanwhile is kept (`data-pending`) and picked up by the component.
  Use Astro's `client:visible` / `client:idle` only where eager enough is wanted. Tests wait for `astro-island` to lose its `ssr` attribute (`activateSearch` in `e2e/helpers.ts`).
- **Theme**: Sketch tokens live in `src/shared/tokens.ts`; `src/theme.ts` maps them to the shadcn variables
  (`--background`, `--primary`, ...) and `--sketch-*`; `src/styles/global.css` only wires variables to Tailwind utilities (`text-title`, `font-serif`, `bg-muted`...). No custom CSS beyond that. No dark mode.
- **Donation link (#36)**: `PUBLIC_DONATION_URL` (an https address, build time; the deploy reads the repository variable of the same name)
  draws "Apoie o projeto" in the footer line of every page and as a button in the data page's section; unset or not https, nothing is drawn
  and the build passes. `npm run test:e2e:donation` runs `e2e/donation.spec.ts` with a placeholder address. There is no ad network anywhere (`src/lib/donation.test.ts`).
- **What stays on the visitor's device (#35)**: `src/lib/storage-keys.ts` lists every localStorage key the site writes; "esquecer meus dados" on Home clears
  them and the privacy text of the data page is drawn from the same list (`stored-items.ts`). A new key must be added there.
- **Data (shards since #49)**: the build turns `DATA_DIR` into versioned JSON shards under `public/data/v<fingerprint>/`
  (`integrations/dataset.ts` calls `integrations/shards.ts`; the directory holds no CSV). The fingerprint is a sha256 over the
  five dataset files, so paths change with the data and a stale copy is never served. Client code learns the version through
  `virtual:data-shards` (`SHARD_VERSION`); `src/lib/search-data.ts#loadSearchCities` fetches `search.json` when the search is used.
  Every city is pre-rendered at `src/pages/[uf]/[slug]/` etc. (the city itself is already in the HTML, so the pages request
  no shard; the share route's island fetches only its city's own shard when ?ciclo/?turno needs another view).
  Layout, fields, sizes and budgets: `docs/shards.md`. Verify any dataset with `npm run check:shards[:real]`.
- **404 fallback**: `src/pages/404.astro` + `src/scripts/fallback.ts` + `src/lib/fallback.ts` (route table of the whole site). A valid route (state or city exists in
  the data) that is not pre-rendered shows "Página em construção"; anything else "Página não encontrada".
- **Analytics**: through `@/analytics` (no-op). Events: `search {results, query_length}` after typing pauses 600 ms, `search_result_tap {position, uf}`, `state_tile_tap {uf}`. `#consent-slot` is kept in `Base.astro`.
- **Tests**: vitest for logic and the island (jsdom); Playwright projects `phone` (fixture, includes `network.spec.ts` allow-list, `fallback.spec.ts`, no-JS case), `real`
  (real data, shard paths), `capture` (screenshot for review). Baselines are not stored. Screenshot review: `docs/screenshot-review-protocol.md`, reviewer in a fresh context.
- **Network rule**: every request must be a GET to the site origin; allowed extra origins are in `e2e/helpers.ts` (`ANALYTICS_ORIGINS`, and the approved CDN origins in production mode only).

## Desktop (G10, tickets #51 to #57)

One responsive layout from 390 px to a 720 px content column (1200 px on Home), centered above 1440 px: breakpoints at 768 and 1024 px. Same pages and URLs as on the phone.

- **Shell** (`components/TopBar.astro`, in `layouts/Base.astro`): from 1024 px a slim top bar (wordmark, city search, three links) replaces each page's own header. The search field is plain
  pre-rendered HTML; `scripts/desktop-shell.ts` (loaded by a 100-byte inline stub behind `matchMedia('(min-width: 1024px)')`, emitted as `_astro/desktop-shell.js` by
  `integrations/desktop-shell.ts`) mounts the existing `CitySearch` into it on first focus and binds "/" to the city search. A phone never requests either file.
- **Phone first load stays unchanged** (the rule of the whole milestone): desktop-only things are hidden by CSS and, when they would weigh the HTML, delivered as a **fragment document in a
  lazy `<iframe>`** (`layouts/FragmentDoc.astro`, `pages/fragmentos/*`): a lazy iframe that is not drawn is never requested. Used by the Home SVG map (`mapa-uf`) and the desktop Mapa por estado
  (`mapa-por-estado/margem`, `virada`); their hover/keyboard script is inline in the fragment. They are `noindex` and linked from nowhere.
- **UF outlines**: `data/geo/uf-outlines.json` (`make data` / `make data-outlines`, checked by `make data-check`), projected by `src/lib/uf-map.ts`, drawn by `components/UfMap.astro`.
- `client:slot` (`integrations/slot-directive.js`): lazy island for a map slot, in view from 1024 px up, on first interaction below it (Estado municipality map).
- Measure: `npx tsx scripts/measure.ts <dist> --path /brasil/ --size 1440x900` (exits when done). Tests: Playwright project `desktop` (`e2e/desktop-*.spec.ts`, 1440x900, each spec resizes for 390/768); screenshot
  review notes in `docs/checkpoints/issue-51.md` to `issue-57.md` (capture: `CAPTURE=home npx playwright test --project=capture capture-desktop`).

## CDN (production build only)

**Status: mechanism built and tested; no provider chosen, so nothing is served from a CDN today.** The provider is the user's decision.

How it works (`integrations/cdn.ts`, config `cdn.config.json`):

- `cdn.config.json` = `approvedOrigins` (list, EMPTY) and `libraries` (empty): per import specifier a pinned `version`, the exact `url` and an `integrity` hash.
- With the empty default, the production build bundles everything locally (same output as the local build, tested with `npm run test:e2e:production`).
- Development, test and screenshot builds (`BUILD_TARGET` not `production`) ignore the file and bundle from `node_modules`. The build itself never contacts a CDN: it only marks the specifiers external and writes an import map.
- With libraries configured and `BUILD_TARGET=production` (`npm run build:production`): the browser build treats the specifiers as external and every page gets
  `<script type="importmap">` with `imports` and `integrity` (browsers verify the hash; import-map integrity needs a current browser, older ones load without verification). Because
  the map is per document, the island and the CDN files all resolve `react` to one URL: one copy of React.
- The config is validated at build time (unit tests): origin in `approvedOrigins`, https (http only for loopback test doubles), integrity present, `version` equal to the installed one (server render and browser must match) and present in the URL (pinned), `react` and `react-dom` only together.
- If the CDN is unreachable or a hash does not match, the island's code does not load: the pre-rendered page stays (title, state grid, links, footer, the search box as HTML) and a note "A busca não está disponível agora. Escolha um estado abaixo." appears (`client:interaction` directive). Tested with the origin blocked and with a tampered file (`e2e/cdn.spec.ts`).
- One copy of React: the import map plus tests: each CDN library fetched once, no ReactDOM in local files, exactly one script on the page contains ReactDOM (also asserted for the local build in `home.spec.ts`), and the island's hooks work (two Reacts throw "invalid hook call").
- Network allow-list (`e2e/network.spec.ts`, helpers): `E2E_MODE=local` allows the site origin and analytics origins only; `E2E_MODE=production` also allows `approvedOrigins` of the config in use. Both fail on anything else (canary tests).
- `scripts/fake-cdn.ts` is a test double (ES builds of React served on localhost:4179 with its own hashes). It is not a provider.

Candidates for the CDN: `react`, `react-dom`, `react-dom/client`, `react/jsx-runtime` (only together). Everything else stays bundled: shadcn components are copied code, Tailwind is CSS at build, `cmdk`, `radix-ui` and `lucide-react` are small, tree-shaken and tied to the components.

Measured (gzip, home page after the search is used, fixture data): local bundle 102 KB of JS (`client.js` 65.0 including react-dom, `react-dom.js` 4.3, `CitySearch.js` 32.0, glue 1.1);
with React from the CDN 34 KB served by the site (`client.js` 0.9, `CitySearch.js` 31.8, glue 1.1). About 69 KB gzip moves to the CDN (the test double's ES builds weigh 80 KB gzip for the same four modules, so a real provider's figure will differ).
Gain only exists for visitors with a warm CDN cache; cost: one more origin (DNS, TLS), a failure mode (handled above) and a pinned-version maintenance task.

To switch it on, the user decides the provider; then fill `cdn.config.json` and verify (`npm run build:production`, `npm run test:e2e:production`). To compute integrity hashes we need, per specifier, the exact pinned URL of an ES module build served with CORS
(`curl -sL <url> | openssl dgst -sha384 -binary | openssl base64 -A`, prefixed `sha384-`). The provider's `react-dom` files must import `react` as the bare specifier or exactly our `react` URL; if they import their own copy, two Reacts would run and the one-copy test fails.
