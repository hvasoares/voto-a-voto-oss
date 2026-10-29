/**
 * The route inventory of the site (#110), the single owner of three things:
 *
 *  1. What a page IS: `pagesFromFs(paths)` maps every file of src/pages to `{ file, route, kind }` — pure,
 *     so the guard (integrations/routes-inventory.test.ts) passes arrays it built itself and never touches
 *     the disk twice. `kind` is "page" for `*.astro` (`x/index.astro` and `x.astro` are both the route
 *     `/x/`; `[param]` becomes `:param`, `[...rest]` becomes `:rest*`), "endpoint" for `*.ts`
 *     (`dados.json.ts`, `feed.atom.ts`: files, not browsable pages, so never required in a page list), and
 *     "fallback" for `404.astro`.
 *  2. EXAMPLE_URLS: one concrete URL per page template, from the fixture data every e2e spec already uses
 *     (`[uf]` is `rj/`, `[uf]/[slug]` is `rj/cidade-exemplo/`). A list that needs a URL to open resolves its
 *     templates through this map.
 *  3. The exclusion maps. A page kept out of a list on purpose is an entry here with the reason — never a
 *     gap in a spec. The guard fails on an empty reason, on an entry that matches no page (renamed or
 *     deleted: an orphan), and on an exclusion that grew stale (a page appeared behind a KNOWN_ROUTES
 *     extra, a screen started covering a type-scale exclusion).
 *
 * The policies, per list (the file that holds the list is named in each violation):
 *
 *  - KNOWN_ROUTES (src/lib/fallback.ts): complete — every page template once, plus the declared-but-unported
 *    KNOWN_ROUTES_EXTRA. The runtime list stays a static array in fallback.ts because the 404 classifier
 *    ships to the browser and cannot walk the filesystem; the guard enforces the completeness.
 *  - ALL_SCREENS (e2e/type-scale-probe.ts): one or more screens per template (extra entries are states of
 *    the same template, like the map views and the second round of the city card).
 *  - FOOTER_PAGES (tap-targets): DERIVED — every template that shows the visible "Sobre os dados ›" footer
 *    link, i.e. every template minus FOOTER_EXCLUSIONS, opened at its EXAMPLE_URLS URL.
 *  - a11y ROUTES and perf ROUTES: sampled on purpose (axe is slow; four audited routes with budgets) —
 *    no completeness rule, only staleness: a listed route that no longer exists fails.
 *  - footer-finality PAGES: the chip'd global footer lives in a layout; one listed page per layout whose
 *    source carries `data-finality-chip`.
 */
import { relative, sep } from 'node:path'
import { walkFiles } from '../scripts/walk'

export type PageKind = 'page' | 'endpoint' | 'fallback'

export interface PageFile {
  /** Posix path relative to src/pages, e.g. 'mapa/[uf]/index.astro'. */
  file: string
  /** The route the file answers (a pattern for dynamic pages): '/mapa/:uf/', or '/fato/:path*' for a rest route. */
  route: string
  kind: PageKind
}

/** A moved pages folder cannot make every list "complete" by finding nothing: the guard counts on disk. */
export const MIN_ASTRO_FILES = 58

const toRoute = (stem: string, trailingSlash: boolean): string => {
  const segs = stem.split('/').filter(Boolean)
  if (segs.length > 0 && segs[segs.length - 1] === 'index') segs.pop()
  const mapped = segs.map((s) => s.replace(/^\[\.\.\.([^\]]+)\]$/, ':$1*').replace(/^\[([^\]]+)\]$/, ':$1'))
  if (mapped.length === 0) return '/'
  return '/' + mapped.join('/') + (trailingSlash ? '/' : '')
}

/**
 * Pure (input: relative file paths under src/pages): the inventory of a pages tree, sorted by route and
 * file. A file that is neither an Astro page nor a TS endpoint has no route — it fails loudly here.
 */
export function pagesFromFs(paths: readonly string[]): PageFile[] {
  return paths
    .map((file): PageFile => {
      if (file === '404.astro') return { file, route: '/404/', kind: 'fallback' }
      if (file.endsWith('.astro')) return { file, route: toRoute(file.slice(0, -'.astro'.length), true), kind: 'page' }
      if (file.endsWith('.ts')) return { file, route: toRoute(file.slice(0, -'.ts'.length), false), kind: 'endpoint' }
      throw new Error(`pagesFromFs: ${file} is neither an .astro page nor a .ts endpoint`)
    })
    .sort((a, b) => a.route.localeCompare(b.route) || a.file.localeCompare(b.file))
}

/** Every page template once, sorted. */
export function pageTemplates(pages: readonly PageFile[]): string[] {
  return [...new Set(pages.filter((p) => p.kind === 'page').map((p) => p.route))].sort()
}

/** The pages tree of a checkout, as `pagesFromFs` input paths (posix, relative to src/pages). */
export function pageFilesOnDisk(webRoot: string): string[] {
  const pages = resolvePosix(webRoot, 'src/pages')
  return walkFiles(pages).map((p) => relative(pages, p).split(sep).join('/'))
}

const resolvePosix = (webRoot: string, sub: string) => `${webRoot.replace(/\/+$/, '')}/${sub}`

/**
 * One fixture URL per page template — the concrete page every e2e spec already opens. A template with no
 * example here fails the guard naming it. Values have no leading slash and keep the trailing one; the home
 * is ''.
 */
export const EXAMPLE_URLS: Readonly<Record<string, string>> = {
  '/': '',
  '/:uf/': 'rj/',
  '/:uf/:slug/': 'rj/cidade-exemplo/',
  '/:uf/:slug/compartilhar/': 'rj/cidade-exemplo/compartilhar/',
  '/:uf/:slug/qr/': 'rj/cidade-exemplo/qr/',
  '/:uf/:slug/tres-ciclos/': 'rj/cidade-exemplo/tres-ciclos/',
  '/:uf/historia/': 'rj/historia/',
  '/:uf/resumo/': 'rj/resumo/',
  '/abrir-cartao/': 'abrir-cartao/',
  '/adivinhe/': 'adivinhe/',
  '/api/': 'api/',
  '/brasil/': 'brasil/',
  '/brasil/compartilhar/': 'brasil/compartilhar/',
  '/brasil/qr/': 'brasil/qr/',
  '/cara-a-cara/': 'cara-a-cara/',
  '/comparar/:ciclo/': 'comparar/2022/',
  '/compartilhar/': 'compartilhar/',
  '/dados-para-nerds/': 'dados-para-nerds/',
  '/dados-para-nerds/estado/:uf/': 'dados-para-nerds/estado/rj/',
  '/dados-para-nerds/geometria/': 'dados-para-nerds/geometria/',
  '/dados-para-nerds/regiao/:regiao/': 'dados-para-nerds/regiao/sudeste/',
  '/edicoes/': 'edicoes/',
  '/edicoes/:id/': 'edicoes/2026-10-26/',
  '/embed/:uf/:slug/': 'embed/rj/cidade-exemplo/',
  '/fale-sem-errar/': 'fale-sem-errar/',
  '/fato/:path*/': 'fato/brasil/2026-2/',
  '/fragmentos/mapa-por-estado/ficaram-em-casa/:ciclo/': 'fragmentos/mapa-por-estado/ficaram-em-casa/2026-1/',
  '/fragmentos/mapa-por-estado/margem/': 'fragmentos/mapa-por-estado/margem/',
  '/fragmentos/mapa-por-estado/virada/': 'fragmentos/mapa-por-estado/virada/',
  '/fragmentos/mapa-uf/': 'fragmentos/mapa-uf/',
  '/gerador/': 'gerador/',
  '/imprensa/': 'imprensa/',
  '/imprensa/cartaz/:uf/': 'imprensa/cartaz/rj/',
  '/imprensa/folha/': 'imprensa/folha/',
  '/mapa/': 'mapa/',
  '/mapa/:uf/': 'mapa/rj/',
  '/mapa/ficaram-em-casa/': 'mapa/ficaram-em-casa/',
  '/mapa/ficaram-em-casa/:ciclo/': 'mapa/ficaram-em-casa/2026-2/',
  '/mapa/virada/': 'mapa/virada/',
  '/meu-brasil/': 'meu-brasil/',
  '/meu-brasil/adesivo/': 'meu-brasil/adesivo/',
  '/meu-brasil/historia/': 'meu-brasil/historia/',
  '/overlay/': 'overlay/',
  '/overlay/tela/': 'overlay/tela/',
  '/qr/': 'qr/',
  '/relatorios/': 'relatorios/',
  '/relatorios/cidades-fora-da-curva/': 'relatorios/cidades-fora-da-curva/',
  '/relatorios/cidades-fora-da-curva/:uf/:min/': 'relatorios/cidades-fora-da-curva/rj/5000/',
  '/relatorios/cidades-que-viraram/': 'relatorios/cidades-que-viraram/',
  '/relatorios/como-cada-grupo-votou/': 'relatorios/como-cada-grupo-votou/',
  '/relatorios/comparecimento/': 'relatorios/comparecimento/',
  '/relatorios/disputas-mais-apertadas/': 'relatorios/disputas-mais-apertadas/',
  '/relatorios/maiores-viradas/': 'relatorios/maiores-viradas/',
  '/relatorios/votos-ganhos-e-perdidos/': 'relatorios/votos-ganhos-e-perdidos/',
  '/sobre-os-dados/': 'sobre-os-dados/',
  '/tres-ciclos/:uf/': 'tres-ciclos/rj/',
  '/widget/': 'widget/',
}

/**
 * KNOWN_ROUTES holds these patterns although no page file answers them today (#50 ports pages one at a
 * time; the 404 classifier rejects param values no page declares, so both classify "not-found" until the
 * page lands). When the page is ported the pattern moves into the derived set and its entry here goes
 * stale — the guard fails, naming it.
 */
export const KNOWN_ROUTES_EXTRA: Readonly<Record<string, string>> = {
  '/brasil/:regiao/': 'the region detail page has no file yet: declared so the 404 classifier can answer "valid" the day it is ported (fallback.spec.ts opens /brasil/norte/)',
  '/relatorios/:report/': 'declared param route with no page file: reports are concrete pages today; the classifier rejects unknown :report values until a page declares them',
}

/**
 * Page templates the structural type probe (e2e/type-scale-probe.ts) does not walk, each with the reason.
 * A template kept out must stay out by rule: the moment a screen covers it the entry is stale and the
 * guard fails.
 */
export const TYPE_SCALE_EXCLUSIONS: Readonly<Record<string, string>> = {
  '/qr/': 'demo shell of the QR screen on the placeholder route (#9): it renders the same QrScreen the real routes /:uf/:slug/qr/ and /brasil/qr/ render, and those are in ALL_SCREENS',
  '/embed/:uf/:slug/': 'an EmbedDoc document: noindex, no script, served to a host page\'s iframe — a part of other pages, not a page read on its own',
  '/overlay/tela/': 'the broadcast overlay is sized in viewport units by design (the probe header documents it as out of the scale)',
  '/fragmentos/mapa-por-estado/ficaram-em-casa/:ciclo/': 'a FragmentDoc fragment: noindex, drawn inside a lazy iframe; its map is an SVG the embedding page scales',
  '/fragmentos/mapa-por-estado/margem/': 'a FragmentDoc fragment: noindex, drawn inside a lazy iframe; its map is an SVG the embedding page scales',
  '/fragmentos/mapa-por-estado/virada/': 'a FragmentDoc fragment: noindex, drawn inside a lazy iframe; its map is an SVG the embedding page scales',
  '/fragmentos/mapa-uf/': 'a FragmentDoc fragment: noindex, drawn inside a lazy iframe; its map is an SVG the embedding page scales',
  '/imprensa/cartaz/:uf/': 'a print poster (@page A3): the sheet is sized for paper and its source line is plain text',
  '/imprensa/folha/': 'the A3 city sheet (#66): a print surface drawn in the browser from the city shard, sized by its own sheet styles',
}

/**
 * Page templates that carry no VISIBLE shared "Sobre os dados ›" footer link (tap-targets.spec.ts checks
 * the ones that do, at 44 px). The list itself is derived: every template minus these exclusions, opened
 * at its EXAMPLE_URLS URL.
 */
export const FOOTER_EXCLUSIONS: Readonly<Record<string, string>> = {
  '/': "the Home's footer lines have their own tests in tap-targets.spec.ts (line heights, hit gaps, notice open and acknowledged)",
  '/sobre-os-dados/': 'its footer lines are measured by the dedicated #98 test in tap-targets.spec.ts',
  '/:uf/:slug/': "the city card's footer link is the keyboard-only `.source-footer__about`",
  '/:uf/:slug/tres-ciclos/': "keyboard-only `.source-footer__about`, like the city card's",
  '/fato/:path*/': "the fact pages' footer link is the keyboard-only `.source-footer__about`",
  '/:uf/:slug/compartilhar/': 'a share sheet: the page behind it is inert, so its footer is not a finger target',
  '/brasil/compartilhar/': 'a share sheet: the Brasil page behind it is inert, so its footer is not a finger target',
  '/:uf/:slug/qr/': "the QR screen carries no 'Sobre os dados' link on screen; the only source line is the print poster's plain text",
  '/brasil/qr/': "the QR screen carries no 'Sobre os dados' link on screen; the only source line is the print poster's plain text",
  '/qr/': "demo shell of the QR screen: no 'Sobre os dados' link on screen",
  '/embed/:uf/:slug/': 'an EmbedDoc document: noindex, no footer at all',
  '/overlay/tela/': 'an EmbedDoc broadcast overlay: noindex, no footer at all',
  '/fragmentos/mapa-por-estado/ficaram-em-casa/:ciclo/': 'a FragmentDoc fragment: noindex, no footer at all',
  '/fragmentos/mapa-por-estado/margem/': 'a FragmentDoc fragment: noindex, no footer at all',
  '/fragmentos/mapa-por-estado/virada/': 'a FragmentDoc fragment: noindex, no footer at all',
  '/fragmentos/mapa-uf/': 'a FragmentDoc fragment: noindex, no footer at all',
  '/imprensa/': "the press landing carries no 'Sobre os dados' footer link",
  '/imprensa/cartaz/:uf/': "the press poster's source line is plain text sized for paper — no footer link",
  '/imprensa/folha/': "the A3 press sheet carries no 'Sobre os dados' footer link",
  '/edicoes/': "its source footer carries only the source note; the page already links back (‹ Sobre os dados) from the top",
  '/edicoes/:id/': "its source footer carries only the source note, like the editions index's",
  '/api/': "its source footer carries only the source note; the page already links back (‹ Sobre os dados) from the top",
  '/dados-para-nerds/geometria/': "the geometry notes page carries no 'Sobre os dados' footer link",
}

/**
 * Page templates that do NOT carry the app header (#153; e2e/app-header.spec.ts checks every other template at the phone and at the desktop
 * frame, at its EXAMPLE_URLS URL). Every public page carries it, so each entry here is a page that is not a plain public page.
 */
export const APP_HEADER_EXCLUSIONS: Readonly<Record<string, string>> = {
  '/': "Home: its own city search stands where the header's would (Base `header=\"none\"`); the desktop top bar still carries the wordmark and the search",
  '/:uf/:slug/compartilhar/': 'a full-screen share sheet over an inert backdrop (the approved frame); the backdrop card keeps its own inert header',
  '/brasil/compartilhar/': 'a full-screen share sheet over an inert backdrop (the approved frame)',
  '/compartilhar/': 'the demo of the share sheet: noindex, linked from nowhere, a full-screen sheet',
  '/:uf/:slug/qr/': 'a full-screen QR screen (the approved frame)',
  '/brasil/qr/': 'a full-screen QR screen (the approved frame)',
  '/qr/': 'the demo of the QR screen: noindex, linked from nowhere, a full-screen sheet',
  '/embed/:uf/:slug/': 'an EmbedDoc document made to be framed by another site: noindex, no shell at all',
  '/overlay/tela/': 'an EmbedDoc broadcast overlay: noindex, no shell at all',
  '/fragmentos/mapa-por-estado/ficaram-em-casa/:ciclo/': 'a FragmentDoc fragment framed by a page: no shell at all',
  '/fragmentos/mapa-por-estado/margem/': 'a FragmentDoc fragment framed by a page: no shell at all',
  '/fragmentos/mapa-por-estado/virada/': 'a FragmentDoc fragment framed by a page: no shell at all',
  '/fragmentos/mapa-uf/': 'a FragmentDoc fragment framed by a page: no shell at all',
}

/** The pages that must carry the app header: every template not excluded above, at its fixture URL. */
export function appHeaderPages(pages: readonly PageFile[]): string[] {
  return pageTemplates(pages)
    .filter((t) => !(t in APP_HEADER_EXCLUSIONS))
    .map((t) => EXAMPLE_URLS[t]!)
    .sort()
}

/** The pages the app-header spec walks, from the tree on disk. */
export function appHeaderPagesOnDisk(webRoot: string): string[] {
  return appHeaderPages(pagesFromFs(pageFilesOnDisk(webRoot)))
}

/**
 * The sample of the a11y audit (e2e/a11y.spec.ts): axe is slow, so the audited routes are chosen by hand —
 * no completeness rule, only staleness (the guard fails when a listed route no longer exists).
 */
/**
 * Page templates that carry NO link preview, each with the reason (#151): every other template in EXAMPLE_URLS must carry the og/twitter tags
 * (e2e/city-preview.spec.ts walks the list). A page kept out must be noindex, so the spec checks both halves.
 */
export const NO_PREVIEW_EXCLUSIONS: Readonly<Record<string, string>> = {
  '/compartilhar/': 'the share-sheet demo (#137): noindex, linked from nowhere',
  '/qr/': 'the QR demo (#137): noindex, linked from nowhere',
  '/embed/:uf/:slug/': 'an EmbedDoc document: a part of other pages, not a page to be shared',
  '/overlay/tela/': 'an EmbedDoc broadcast overlay: a part of other pages, not a page to be shared',
  '/fragmentos/mapa-por-estado/ficaram-em-casa/:ciclo/': 'a FragmentDoc fragment: noindex, drawn inside a lazy iframe',
  '/fragmentos/mapa-por-estado/margem/': 'a FragmentDoc fragment: noindex, drawn inside a lazy iframe',
  '/fragmentos/mapa-por-estado/virada/': 'a FragmentDoc fragment: noindex, drawn inside a lazy iframe',
  '/fragmentos/mapa-uf/': 'a FragmentDoc fragment: noindex, drawn inside a lazy iframe',
}

export const A11Y_ROUTES: readonly { route: string; name: string }[] = [
  { route: '/', name: 'home' },
  { route: 'rj/cidade-exemplo/', name: 'city card' },
  { route: 'mapa/', name: 'state tile map' },
  { route: 'relatorios/cidades-que-viraram/', name: 'report' },
  { route: 'mapa/ficaram-em-casa/', name: 'stay-home map' },
  { route: 'tres-ciclos/rj/', name: 'state season (#42, #43)' },
  { route: 'rj/cidade-exemplo/tres-ciclos/', name: 'city three cycles with the replay (#46)' },
]

/**
 * The pages of the footer-finality spec (e2e/footer-finality.spec.ts): one page per layout that renders
 * the global footer line with the finality chip; the guard checks the chip layouts of src/layouts against
 * the pages listed here. `route` is an EXAMPLE_URLS URL ('' is the home).
 */
export const FINALITY_PAGES: readonly { name: string; route: string }[] = [
  { name: 'Home', route: '' },
  { name: 'City card', route: 'rj/cidade-exemplo/' },
  { name: 'Estado', route: 'rj/' },
  { name: 'Brasil', route: 'brasil/' },
  { name: 'Relatórios', route: 'relatorios/' },
  { name: 'Mapa', route: 'mapa/' },
  { name: 'Sobre os dados', route: 'sobre-os-dados/' },
  { name: 'Dados para nerds', route: 'dados-para-nerds/' },
]

/** A tap-targets footer page: every template not excluded above, at its fixture URL. */
export function footerLinkPages(pages: readonly PageFile[]): string[] {
  return pageTemplates(pages)
    .filter((t) => !(t in FOOTER_EXCLUSIONS))
    .map((t) => EXAMPLE_URLS[t]!)
    .sort()
}

/** The pages the tap-targets spec walks, from the tree on disk. */
export function footerLinkPagesOnDisk(webRoot: string): string[] {
  return footerLinkPages(pagesFromFs(pageFilesOnDisk(webRoot)))
}

/** Normalizes a listed URL to the EXAMPLE_URLS spelling ('/' of a11y.route and '' both mean the home). */
const normalizeUrl = (url: string): string => url.replace(/^\/+/, '')

const exampleValues = (pages: readonly PageFile[]): Set<string> => new Set(pageTemplates(pages).map((t) => EXAMPLE_URLS[t] ?? '?'))

const stripQuery = (path: string): string => path.split('?')[0]!

/** One reasoned-exclusion map of one list: no orphans, no empty reasons, every key a live template. */
export function checkExclusions(listName: string, exclusions: Readonly<Record<string, string>>, templates: readonly string[]): string[] {
  const live = new Set(templates)
  return Object.entries(exclusions).flatMap(([template, reason]) => {
    const out: string[] = []
    if (!reason.trim()) out.push(`${listName}: exclusion ${template} has no reason`)
    if (!live.has(template)) out.push(`${listName}: exclusion ${template} matches no page (renamed or deleted — an orphan)`)
    return out
  })
}

/** Guard of the guard: the discovery found the pages and every page template has its fixture example. */
export function checkDiscovery(pages: readonly PageFile[]): string[] {
  const out: string[] = []
  const astro = pages.filter((p) => p.kind !== 'endpoint')
  if (astro.length < MIN_ASTRO_FILES)
    out.push(`pagesFromFs: found ${astro.length} .astro files under src/pages, expected at least ${MIN_ASTRO_FILES} (a moved pages folder cannot make every list "complete" by finding nothing)`)
  const templates = pageTemplates(pages)
  for (const t of templates) if (!(t in EXAMPLE_URLS)) out.push(`EXAMPLE_URLS (web/e2e/routes-inventory.ts): page ${t} (${pages.find((p) => p.route === t)!.file}) has no fixture example URL`)
  const live = new Set(templates)
  for (const t of Object.keys(EXAMPLE_URLS)) if (!live.has(t)) out.push(`EXAMPLE_URLS (web/e2e/routes-inventory.ts): ${t} matches no page (renamed or deleted — an orphan)`)
  return out
}

/** KNOWN_ROUTES is complete: every page template once, plus the declared KNOWN_ROUTES_EXTRA. */
export function checkKnownRoutes(pages: readonly PageFile[], knownRoutes: readonly string[]): string[] {
  const templates = pageTemplates(pages)
  const live = new Set(templates)
  const out: string[] = []
  // The extras are declared routes with NO page behind them: a page appearing behind one is a stale
  // exemption (the pattern then belongs to the derived set); an unused declaration is an orphan of its own.
  for (const [pattern, reason] of Object.entries(KNOWN_ROUTES_EXTRA)) {
    if (!reason.trim()) out.push(`KNOWN_ROUTES (src/lib/fallback.ts): declared extra ${pattern} has no reason`)
    if (live.has(pattern)) out.push(`KNOWN_ROUTES (src/lib/fallback.ts): ${pattern} has a page now — the KNOWN_ROUTES_EXTRA entry is stale, remove it`)
    if (!knownRoutes.includes(pattern)) out.push(`KNOWN_ROUTES (src/lib/fallback.ts): the declared extra ${pattern} (web/e2e/routes-inventory.ts) is not in the list`)
  }
  const listed = new Set(knownRoutes)
  for (const t of templates) {
    if (!listed.has(t)) out.push(`KNOWN_ROUTES (src/lib/fallback.ts): ${t} (${pages.find((p) => p.route === t)!.file}) is missing from the list`)
  }
  for (const entry of knownRoutes) {
    if (!live.has(entry) && !(entry in KNOWN_ROUTES_EXTRA))
      out.push(`KNOWN_ROUTES (src/lib/fallback.ts): ${entry} matches no page and is not declared in KNOWN_ROUTES_EXTRA (web/e2e/routes-inventory.ts)`)
  }
  const dupes = knownRoutes.filter((r, i) => knownRoutes.indexOf(r) !== i)
  for (const d of [...new Set(dupes)]) out.push(`KNOWN_ROUTES (src/lib/fallback.ts): ${d} is listed twice`)
  return out
}

/** ALL_SCREENS: one or more screens per page template (extras are states of a template). */
export function checkTypeScaleScreens(pages: readonly PageFile[], screenPaths: readonly string[]): string[] {
  const templates = pageTemplates(pages)
  const covered = new Set(screenPaths.map(stripQuery))
  const out = checkExclusions('ALL_SCREENS (e2e/type-scale-probe.ts)', TYPE_SCALE_EXCLUSIONS, templates)
  for (const s of screenPaths) {
    if (!exampleValues(pages).has(stripQuery(s))) out.push(`ALL_SCREENS (e2e/type-scale-probe.ts): screen path ${s} opens no page of src/pages (stale)`)
  }
  for (const t of templates) {
    const example = EXAMPLE_URLS[t]!
    if (t in TYPE_SCALE_EXCLUSIONS) {
      if (covered.has(example)) out.push(`ALL_SCREENS (e2e/type-scale-probe.ts): ${t} is covered by a screen now — the exclusion is stale, remove it`)
      continue
    }
    if (!covered.has(example)) out.push(`ALL_SCREENS (e2e/type-scale-probe.ts): ${t} (${pages.find((p) => p.route === t)!.file}) has no screen — add one or exclude it in web/e2e/routes-inventory.ts`)
  }
  return out
}

/** FOOTER_PAGES is derived; the exclusion map is the hand-kept part, guarded as a list of reasons. */
export function checkFooterExclusions(pages: readonly PageFile[]): string[] {
  return checkExclusions('FOOTER_PAGES (e2e/tap-targets.spec.ts)', FOOTER_EXCLUSIONS, pageTemplates(pages))
}

/** The app-header list is derived; the exclusion map is the hand-kept part, guarded as a list of reasons. */
export function checkAppHeaderExclusions(pages: readonly PageFile[]): string[] {
  return checkExclusions('APP_HEADER_PAGES (e2e/app-header.spec.ts)', APP_HEADER_EXCLUSIONS, pageTemplates(pages))
}

/** The sampled lists fail only on staleness: a listed URL must open a page that still exists. */
export function checkSampledRoutes(pages: readonly PageFile[], listName: string, urls: readonly string[]): string[] {
  const known = new Set([...exampleValues(pages), ''])
  return urls.filter((u) => !known.has(normalizeUrl(u))).map((u) => `${listName}: ${u} opens no page of src/pages (stale)`)
}

/** The perf budgets' dist paths ('mapa/index.html') are the last sampled list. */
export function checkPerfRoutes(pages: readonly PageFile[], distPaths: readonly string[]): string[] {
  return checkSampledRoutes(pages, 'perf ROUTES (scripts/perf-budgets.ts)', distPaths.map((p) => p.replace(/(^|\/)index\.html$/, '$1')))
}

/**
 * A layout renders the global footer line with the finality chip when it renders the shared footer component
 * (#117: the chip's markup lives in shared/footer.ts) without turning the chip off (`chip={false}`, the QuietDoc
 * line), or when its own source still carries the marker.
 */
export function layoutHasFinalityChip(layoutSource: string): boolean {
  const footer = /<SiteFooter\b[^>]*>/.exec(layoutSource)
  return layoutSource.includes('data-finality-chip') || (footer !== null && !/\bchip=\{false\}/.test(footer[0]))
}

/** The layouts a source file imports: Base, QuietDoc, EmbedDoc, FragmentDoc (by file name). */
export function layoutsImported(source: string): string[] {
  return [...source.matchAll(/from\s+['"][^'"]*\/layouts\/([\w-]+)\.astro['"]/g)].map((m) => `${m[1]}.astro`)
}

/**
 * footer-finality: every layout whose source carries the chip must have one listed page that renders it.
 * `pageLayouts` maps an EXAMPLE_URLS URL to the layouts its page renders (directly or through a component
 * of src/components); building it needs the sources, so the guard test computes it.
 */
export function checkFinalityPages(
  pages: readonly PageFile[],
  finalityRoutes: readonly string[],
  chipLayouts: readonly string[],
  pageLayouts: ReadonlyMap<string, readonly string[]>,
): string[] {
  const out = checkSampledRoutes(pages, 'footer-finality PAGES (e2e/footer-finality.spec.ts)', finalityRoutes)
  for (const layout of chipLayouts) {
    const covered = finalityRoutes.some((url) => (pageLayouts.get(normalizeUrl(url)) ?? []).includes(layout))
    if (!covered) out.push(`footer-finality PAGES (e2e/footer-finality.spec.ts): layout ${layout} renders the finality chip but no listed page uses it`)
  }
  return out
}
