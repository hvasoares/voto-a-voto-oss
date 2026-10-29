/**
 * The guard of ticket #110: the route lists no longer drift from the pages of the site. The checks are
 * pure functions of e2e/routes-inventory.ts (the single owner of the inventory, the fixture examples and
 * the reasoned exclusions); this file only walks the disk once and wires the real lists:
 *
 *  - KNOWN_ROUTES (src/lib/fallback.ts): complete — every page template once, plus KNOWN_ROUTES_EXTRA.
 *  - ALL_SCREENS (e2e/type-scale-probe.ts): at least one screen per template (extras are states of one).
 *  - FOOTER_PAGES (e2e/tap-targets.spec.ts): derived — templates minus FOOTER_EXCLUSIONS, at their
 *    EXAMPLE_URLS URL; the exclusion map is what a hand can get wrong, so it is what is checked.
 *  - A11Y_ROUTES and the perf budgets' routes: sampled on purpose; a listed URL that no page answers is
 *    stale and fails.
 *  - FINALITY_PAGES (e2e/footer-finality.spec.ts): one listed page per layout rendering the finality chip.
 *
 * The last describe block is guards of the guard: synthetic trees and synthetic lists prove the failure
 * messages name the page and the list, that an empty discovery trips the floor, and that orphans, empty
 * reasons and stale exemptions all fail.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve, sep, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { KNOWN_ROUTES } from '../src/lib/fallback'
import { SCREENS } from '../e2e/type-scale-probe'
import {
  A11Y_ROUTES,
  EXAMPLE_URLS,
  FINALITY_PAGES,
  KNOWN_ROUTES_EXTRA,
  checkCalcEntryPages,
  checkDiscovery,
  checkExclusions,
  checkFinalityPages,
  checkFooterExclusions,
  checkKnownRoutes,
  checkPerfRoutes,
  checkSampledRoutes,
  checkTypeScaleScreens,
  footerLinkPages,
  layoutHasFinalityChip,
  layoutsImported,
  pageFilesOnDisk,
  pageTemplates,
  pagesFromFs,
} from '../e2e/routes-inventory'
import { BUDGETS, ROUTES as PERF_ROUTES } from '../scripts/perf-budgets'
import { walkFiles } from '../scripts/walk'

const webRoot = fileURLToPath(new URL('..', import.meta.url))
const srcRoot = resolve(webRoot, 'src')
const pages = pagesFromFs(pageFilesOnDisk(webRoot))
const templates = pageTemplates(pages)

/*
 * The finality check needs to know which layout each listed page renders. Layouts are imported by pages
 * directly or by a screen component of the page (QrScreen, NerdsPage…), one level deep. The maps below
 * read the sources once: component file -> layouts it imports, then page example URL -> its layouts.
 */
const layoutDir = resolve(srcRoot, 'layouts')
const chipLayouts = readdirSync(layoutDir)
  .filter((f) => f.endsWith('.astro') && layoutHasFinalityChip(readFileSync(join(layoutDir, f), 'utf8')))
  .sort()

const astroSources = new Map(
  walkFiles(srcRoot)
    .filter((p) => p.endsWith('.astro'))
    .map((p) => [relative(srcRoot, p).split(sep).join('/'), readFileSync(p, 'utf8')] as const),
)

/** The local screen components of src/components a source imports directly ('@/components/x.astro'). */
const componentsImported = (source: string): string[] =>
  [...source.matchAll(/from\s+['"]@\/(components\/[\w/.-]+\.astro)['"]/g)].filter((m) => astroSources.has(m[1]!)).map((m) => m[1]!)

const pageLayouts = new Map<string, string[]>()
for (const p of pages.filter((p) => p.kind === 'page')) {
  const path = `pages/${p.file}`
  const source = astroSources.get(path)
  if (!source) throw new Error(`no source for ${path}`)
  const viaComponents = componentsImported(source).flatMap((c) => layoutsImported(astroSources.get(c)!))
  pageLayouts.set(EXAMPLE_URLS[p.route]!, [...new Set([...layoutsImported(source), ...viaComponents])].sort())
}

describe('the route inventory of the site (#110)', () => {
  it('discovers at least 58 page files and gives every page template its fixture example', () => {
    expect(checkDiscovery(pages)).toEqual([])
  })

  it('KNOWN_ROUTES holds every page template once and nothing without a page or a declared reason', () => {
    expect(checkKnownRoutes(pages, KNOWN_ROUTES)).toEqual([])
  })

  it('every page template has a type-scale screen or a reasoned exclusion, and no screen is stale', () => {
    expect(checkTypeScaleScreens(pages, SCREENS.map((s) => s.path))).toEqual([])
  })

  it('the pages with the calculation entry (#155) are live templates, each opened at an address of its own', () => {
    expect(checkCalcEntryPages(pages)).toEqual([])
  })

  it('the tap-target footer pages are derived: templates minus FOOTER_EXCLUSIONS, no dupes, every one a live URL', () => {
    expect(checkFooterExclusions(pages)).toEqual([])
    const list = footerLinkPages(pages)
    const urls = new Set(Object.values(EXAMPLE_URLS))
    expect(list.every((u) => urls.has(u)), 'a derived footer page URL that no EXAMPLE_URLS entry provides').toBe(true)
    expect(new Set(list).size, 'FOOTER_PAGES duplicates a URL').toBe(list.length)
  })

  it('the a11y sample still opens real pages (sampled on purpose; only staleness fails)', () => {
    expect(checkSampledRoutes(pages, 'a11y ROUTES (e2e/a11y.spec.ts)', A11Y_ROUTES.map((r) => r.route))).toEqual([])
  })

  it('every layout rendering the finality chip has a listed footer-finality page, and none is stale', () => {
    expect(chipLayouts.length, 'no layout carries the finality chip — the marker was renamed?').toBeGreaterThanOrEqual(1)
    expect(checkFinalityPages(pages, FINALITY_PAGES.map((p) => p.route), chipLayouts, pageLayouts)).toEqual([])
  })

  it('the perf audited routes still exist and every budget has a path (BUDGETS and ROUTES share one key set)', () => {
    expect(checkPerfRoutes(pages, Object.values(PERF_ROUTES))).toEqual([])
    expect(Object.keys(BUDGETS).sort(), 'a budget without a route or vice versa').toEqual(Object.keys(PERF_ROUTES).sort())
  })
})

describe('guards of the guard (synthetic inputs, no disk)', () => {
  it('a layout renders the chip through <SiteFooter /> unless it passes chip={false}', () => {
    expect(layoutHasFinalityChip('<div><SiteFooter /></div>')).toBe(true)
    expect(layoutHasFinalityChip('<SiteFooter class="x" linkClass="" chip={false} links={[]} />')).toBe(false)
    expect(layoutHasFinalityChip('<div>no footer at all</div>')).toBe(false)
  })

  const real = pagesFromFs(['index.astro', 'rj/index.astro', 'rj/[cidade]/index.astro', '404.astro', 'feed.atom.ts'])

  it('maps pages, endpoints and the fallback from file paths', () => {
    expect(real).toEqual([
      { file: 'index.astro', route: '/', kind: 'page' },
      { file: '404.astro', route: '/404/', kind: 'fallback' },
      { file: 'feed.atom.ts', route: '/feed.atom', kind: 'endpoint' },
      { file: 'rj/index.astro', route: '/rj/', kind: 'page' },
      { file: 'rj/[cidade]/index.astro', route: '/rj/:cidade/', kind: 'page' },
    ])
    expect(pagesFromFs(['x.astro', 'x/index.astro', '[...rest]/index.astro']).map((p) => p.route)).toEqual(['/:rest*/', '/x/', '/x/'])
  })

  it('an extra page in the tree fails naming the page and the list', () => {
    const tree = [...real, ...pagesFromFs(['nova-pagina/index.astro'])]
    const missing = checkKnownRoutes(tree, ['/'])
    expect(missing.some((m) => m.includes('nova-pagina/index.astro') && m.includes('KNOWN_ROUTES'))).toBe(true)
    const noScreen = checkTypeScaleScreens(tree, ['', 'rj/', 'rj/cidade-exemplo-paulista/'])
    expect(noScreen.some((m) => m.includes('/nova-pagina/') && m.includes('ALL_SCREENS'))).toBe(true)
    const noExample = checkDiscovery(tree)
    expect(noExample.some((m) => m.includes('/nova-pagina/') && m.includes('EXAMPLE_URLS'))).toBe(true)
  })

  it('an empty discovery fails with the minimum-count message', () => {
    const out = checkDiscovery([])
    expect(out[0]).toBe('pagesFromFs: found 0 .astro files under src/pages, expected at least 58 (a moved pages folder cannot make every list "complete" by finding nothing)')
    expect(out.length).toBeGreaterThan(1) // every EXAMPLE_URLS entry is then an orphan, named one by one
  })

  it('an orphan exclusion and an empty reason both fail', () => {
    const out = checkExclusions('LIST', { '/gone/': 'a real reason', '/rj/': '  ' }, pageTemplates(real))
    expect(out).toEqual(['LIST: exclusion /gone/ matches no page (renamed or deleted — an orphan)', 'LIST: exclusion /rj/ has no reason'])
  })

  it('the known routes: an entry with no page and no declaration fails, and a duplicated entry fails', () => {
    expect(checkKnownRoutes(real, ['/', '/rj/', '/rj/:cidade/', '/fantasma/'])).toEqual([
      expect.stringContaining('/brasil/:regiao/ (web/e2e/routes-inventory.ts) is not in the list'),
      expect.stringContaining('/relatorios/:report/ (web/e2e/routes-inventory.ts) is not in the list'),
      expect.stringContaining('/fantasma/ matches no page and is not declared in KNOWN_ROUTES_EXTRA'),
    ])
    expect(checkKnownRoutes(real, ['/', '/rj/', '/rj/', '/rj/:cidade/'])).toEqual([
      expect.stringContaining('/brasil/:regiao/ (web/e2e/routes-inventory.ts) is not in the list'),
      expect.stringContaining('/relatorios/:report/ (web/e2e/routes-inventory.ts) is not in the list'),
      'KNOWN_ROUTES (src/lib/fallback.ts): /rj/ is listed twice',
    ])
  })

  it('a declared KNOWN_ROUTES_EXTRA that grew a page is a stale exemption and fails', () => {
    const tree = pagesFromFs(['index.astro', 'brasil/[regiao]/index.astro'])
    const out = checkKnownRoutes(tree, ['/', '/brasil/:regiao/'])
    expect(out.some((m) => m.includes('/brasil/:regiao/') && m.includes('stale'))).toBe(true)
  })

  it('a type-scale screen that starts covering an excluded template is a stale exemption and fails', () => {
    const out = checkTypeScaleScreens(pages, [...SCREENS.map((s) => s.path), 'overlay/tela/'])
    expect(out).toEqual([expect.stringContaining('/overlay/tela/ is covered by a screen now')])
  })

  it('the footer derivation is the live templates minus the exclusions, at their fixture examples', () => {
    const list = footerLinkPages(pages)
    expect(list).toContain('rj/')
    expect(list).not.toContain('qr/') // excluded: the demo shell carries no footer link
    expect(list).not.toContain('embed/rj/cidade-exemplo/') // excluded: an EmbedDoc embed has no footer
  })

  it('the sampled lists fail on a stale URL and only there', () => {
    const tree = pagesFromFs(['index.astro', '[uf]/index.astro'])
    expect(checkSampledRoutes(tree, 'LIST', ['/', '', 'rj/'])).toEqual([])
    expect(checkSampledRoutes(tree, 'LIST', ['rj/nada/'])).toEqual(['LIST: rj/nada/ opens no page of src/pages (stale)'])
  })

  it('the finality check names a chip layout no listed page uses', () => {
    const tree = pagesFromFs(['index.astro', '[uf]/index.astro'])
    const out = checkFinalityPages(tree, ['rj/'], ['Base.astro', 'QuietDoc.astro'], new Map([['rj/', ['Base.astro']]]))
    expect(out).toEqual(['footer-finality PAGES (e2e/footer-finality.spec.ts): layout QuietDoc.astro renders the finality chip but no listed page uses it'])
  })
})
