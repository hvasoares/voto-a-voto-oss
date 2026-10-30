/**
 * Guard (ticket #117, the contract step of #113-#116): no page, layout or component keeps its own copy of the
 * site footer, of the base-path helper or of the nav-link class strings. The shared pieces are the only place:
 *
 *  - footers:  `<SiteFooter>` (components/SiteFooter.astro) over the builders of shared/footer.ts;
 *  - base:     `siteHref(href)` / `siteBase()` of paths.ts (the ONE reader of `import.meta.env.BASE_URL`) in
 *              pages, and the pure `linkHref(href, base)` in islands that receive the base as a prop;
 *  - links:    FOOTER_LINK / NAV_CHIP / NAV_CHIP_QUIET / NAV_CHIP_QUIET_PRIMARY of shared/link-classes.ts.
 *
 * Two layers:
 *  1. SOURCE (token based, never a long literal, so a reordered class is still caught): every non-test source
 *     file of web/src, comments removed, is scanned for a `<footer` element or the `consent-footer` marker, any
 *     `BASE_URL` read, a `withBase` helper (imported or defined), a `base.replace(/\/$/, '') +` prefixer, and a
 *     class list holding the FOOTER_LINK tokens exactly or all NAV_CHIP tokens.
 *  2. BUILT OUTPUT (the fixture build, run for both base values): every page has exactly one page footer
 *     (`<footer>` that is not an aria-hidden backdrop copy nor a nerds panel footer), except the listed
 *     documents, and every root-relative `href`/`src` carries the base prefix.
 *
 * Named exceptions carry their reason below and are asserted live (an exemption that stops being needed fails).
 * `findOwnCopies` and `checkBuiltPage` are pure; the seeded fixtures prove each rule can fail before the same
 * scans run over the real tree and the real build.
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, sep } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { withBuildLock } from '../../scripts/build-lock'
import { walkFiles } from '../../scripts/walk'
import { FOOTER_LINK, NAV_CHIP } from './link-classes'
import { classifyPath, type PageFamily } from './page-family'

const SITE_FOOTER = 'components/SiteFooter.astro'

/** Where each pattern may live, with the reason. Asserted live below. */
const FOOTER_ALLOWED: Record<string, string> = {
  'shared/footer.ts': 'the builders: the one place the footer markup is written',
  'components/nerds/PanelFrame.astro': 'a panel footer (<footer data-panel-footer>) holding a definition list, not the page source line',
  'lib/qr-screen.ts': 'the print line of the QR sheet: paper sizing in millimetres the shared footer does not carry',
}
const BASE_ALLOWED: Record<string, string> = {
  'paths.ts': 'the one reader of import.meta.env.BASE_URL, and the helpers built on it',
}
const CLASS_ALLOWED: Record<string, string> = {
  'shared/link-classes.ts': 'the constants themselves',
}

/** Built documents that carry no page footer, by path prefix, with the reason. */
const NO_FOOTER: Record<string, string> = {
  '404.html': 'the not-found document is a bare message',
  'embed/': 'embed documents live inside other sites and carry no site chrome (#116)',
  'fragmentos/': 'fragments are markup pieces for other pages to include (#116)',
  'imprensa/': 'press pages and print posters carry their own source line (poster__source / sheet__source, <p>)',
  'dados-para-nerds/geometria/': 'the geometry viewer is a full-bleed tool page',
  'overlay/tela/': 'the stream overlay is a transparent full-screen document',
}
/** The families that are a stub plus a data file (the lighter-site milestone): the document carries no `<footer>` element until the script draws the screen (the QR's source line is part of its poster, the share sheet's is drawn with the sheet). Each family ticket adds its name. */
const STUB_FAMILIES: readonly PageFamily[] = ['qr', 'compartilhar']

/** The source with comments blanked (same length, newlines kept), so doc comments never classify. */
const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->|(?<![:\w"'`/])\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, ' '))

const FOOTER_TAG = /<footer\b|\bconsent-footer\b/
const BASE_READ = /\bBASE_URL\b/
const WITH_BASE = /\bwithBase\b/
const PREFIXER = /\bbase\s*\.replace\(\s*\/\\\/\$\/\s*,\s*(?:''|"")\s*\)\s*\+/
const QUOTED = /"([^"\n]*)"|'([^'\n]*)'|`([^`]*)`/g

const FOOTER_LINK_TOKENS = new Set(FOOTER_LINK.split(' '))
const NAV_CHIP_TOKENS = NAV_CHIP.split(' ')

/** Does a class list hold exactly the FOOTER_LINK tokens, or every NAV_CHIP token? */
function isNavLinkClass(list: string): string | undefined {
  const tokens = list.split(/\s+/).filter(Boolean)
  const set = new Set(tokens)
  if (set.size === FOOTER_LINK_TOKENS.size && [...FOOTER_LINK_TOKENS].every((t) => set.has(t))) return 'FOOTER_LINK'
  if (NAV_CHIP_TOKENS.every((t) => set.has(t))) return 'NAV_CHIP / NAV_CHIP_QUIET / NAV_CHIP_QUIET_PRIMARY'
  return undefined
}

type Rule = 'footer' | 'base-read' | 'base-helper' | 'nav-class'

/** The own copies in one source, as `{rule, message}`. Pure. */
export function findOwnCopies(source: string): { rule: Rule; message: string }[] {
  const code = stripComments(source)
  const line = (index: number) => code.slice(0, index).split('\n').length
  const found: { rule: Rule; message: string }[] = []

  const footer = FOOTER_TAG.exec(code)
  if (footer) found.push({ rule: 'footer', message: `own footer at line ${line(footer.index)}: render <SiteFooter> (${SITE_FOOTER}) — the markup lives in shared/footer.ts` })

  const base = BASE_READ.exec(code)
  if (base) found.push({ rule: 'base-read', message: `BASE_URL read at line ${line(base.index)}: pages call siteHref()/siteBase() of paths.ts, the one reader` })

  const helper = WITH_BASE.exec(code) ?? PREFIXER.exec(code)
  if (helper) found.push({ rule: 'base-helper', message: `own base-path helper at line ${line(helper.index)}: use siteHref(href) in pages, linkHref(href, base) in islands (paths.ts)` })

  for (const m of code.matchAll(QUOTED)) {
    const which = isNavLinkClass(m[1] ?? m[2] ?? m[3] ?? '')
    if (which) {
      found.push({ rule: 'nav-class', message: `nav-link class string at line ${line(m.index)}: use ${which} from shared/link-classes.ts, never the literal tokens` })
      break
    }
  }
  return found
}

const SRC = join(import.meta.dirname, '..')
const files = walkFiles(SRC).filter((p) => /\.(ts|tsx|astro)$/.test(p) && !/\.test\.(ts|tsx)$/.test(p))
const text = new Map(files.map((p) => [relative(SRC, p).split(sep).join('/'), readFileSync(p, 'utf8')]))

const offenders = (rule: Rule, allowed: Record<string, string>) =>
  [...text].filter(([p]) => !(p in allowed)).flatMap(([p, src]) => findOwnCopies(src).filter((c) => c.rule === rule).map((c) => `${p}: ${c.message}`))

describe('no page keeps its own footer, base-path helper or nav-link class (#117), source layer', () => {
  it('has a real tree to scan', () => {
    expect(files.length, `found ${files.length} source files, expected at least 300`).toBeGreaterThanOrEqual(300)
  })

  it('no <footer> or consent-footer outside the shared builders and the named exceptions', () => {
    expect(offenders('footer', FOOTER_ALLOWED)).toEqual([])
  })

  it('no BASE_URL read outside paths.ts', () => {
    expect(offenders('base-read', BASE_ALLOWED)).toEqual([])
  })

  it('no withBase helper and no local base prefixer outside paths.ts', () => {
    expect(offenders('base-helper', BASE_ALLOWED)).toEqual([])
  })

  it('no literal nav-link class string outside link-classes.ts', () => {
    expect(offenders('nav-class', CLASS_ALLOWED)).toEqual([])
  })

  it.each([
    ...Object.keys(FOOTER_ALLOWED).map((p) => [p, 'footer'] as const),
    ...Object.keys(BASE_ALLOWED).map((p) => [p, 'base-read'] as const),
    ...Object.keys(CLASS_ALLOWED).map((p) => [p, 'nav-class'] as const),
  ])('the exemption for %s is still needed (%s)', (path, rule) => {
    expect(text.has(path), `${path} missing`).toBe(true)
    expect(findOwnCopies(text.get(path)!).filter((c) => c.rule === rule), `${path} no longer trips ${rule} — drop the exemption`).not.toEqual([])
  })

  it('the shared pieces exist', () => {
    expect(text.has(SITE_FOOTER)).toBe(true)
  })

  it.each([
    ['a page with its own footer element', '<footer class="x">Fonte</footer>', 'footer'],
    ['a page with its own global footer line', '<div data-component="consent-footer"></div>', 'footer'],
    ['a page reading the base itself', 'const base = normalizeBase(import.meta.env.BASE_URL)', 'base-read'],
    ['an imported withBase', "import { withBase } from '@/paths'", 'base-helper'],
    ['a local base prefixer', "const href = (p: string) => base.replace(/\\/$/, '') + p", 'base-helper'],
    ['the footer-link tokens reordered', '<a class="items-center inline-flex min-h-11" href="/">x</a>', 'nav-class'],
    ['the chip tokens with extras', '<a class="inline-flex min-h-11 items-center rounded-md border border-border px-3 text-step-2 font-bold lg:text-primary">x</a>', 'nav-class'],
    ['a className string', 'const c = "inline-flex min-h-11 items-center"', 'nav-class'],
  ])('flags %s', (_label, source, rule) => {
    expect(findOwnCopies(source).map((c) => c.rule)).toContain(rule)
  })

  it('the failure message names the shared piece to use', () => {
    const messages = findOwnCopies('<footer>x</footer>\nconst b = import.meta.env.BASE_URL\nimport { withBase } from "@/paths"').map((c) => c.message).join(' | ')
    expect(messages).toMatch(/own footer at line 1: render <SiteFooter>/)
    expect(messages).toMatch(/BASE_URL read at line 2: pages call siteHref\(\)\/siteBase\(\)/)
    expect(messages).toMatch(/own base-path helper at line 3: use siteHref\(href\)/)
  })

  it.each([
    ['the shared footer component', '<SiteFooter source="Fonte: TSE" />'],
    ['siteHref and siteBase', "const base = siteBase()\nconst href = siteHref('relatorios/')"],
    ['constants for the link classes', "<a class={NAV_CHIP_QUIET} href={siteHref('/')}>‹ Início</a>"],
    ['a footer named in a comment', '// the <footer> is rendered by SiteFooter, not read from BASE_URL\n/* withBase is gone */'],
    ['a link with more tokens than the footer link', '<a class="inline-flex min-h-11 items-center text-step-2 font-bold text-primary">x</a>'],
    ['a chip without the border', '<a class="inline-flex min-h-11 items-center rounded-md px-3">x</a>'],
    ['a url with slashes', "const u = 'https://example.com/x'"],
  ])('lets %s pass', (_label, source) => {
    expect(findOwnCopies(source)).toEqual([])
  })
})

/** The problems of one built page. Pure. `rel` is the path under the build root, `base` the site base. */
export function checkBuiltPage(html: string, rel: string, base: string): string[] {
  const problems: string[] = []
  const footers = (html.match(/<footer\b[^>]*>/g) ?? []).filter((t) => !/aria-hidden|data-panel-footer/.test(t))
  const exempt = Object.keys(NO_FOOTER).some((prefix) => rel === prefix || rel.startsWith(prefix)) || STUB_FAMILIES.includes(classifyPath(rel))
  const expected = exempt ? 0 : 1
  if (footers.length !== expected)
    problems.push(`${rel}: ${footers.length} page footers, expected ${expected} — render <SiteFooter> (${SITE_FOOTER}) once, or list the document in NO_FOOTER with a reason`)
  if (base !== '/') {
    const bare = [...html.matchAll(/\b(?:href|src)="(\/(?:[^"/][^"]*)?)"/g)].map((m) => m[1]!).filter((u) => !u.startsWith(base))
    if (bare.length > 0) problems.push(`${rel}: internal link without the base ${base}: ${bare.slice(0, 3).join(', ')} — use siteHref()/linkHref() from paths.ts`)
  }
  return problems
}

describe('the built output has one footer per page and every internal link carries the base (#117), built layer', () => {
  it.each([
    ['a second page footer', '<footer>a</footer><footer>b</footer>', 'x/index.html', '/', /2 page footers, expected 1/],
    ['no page footer', '<p>nothing</p>', 'x/index.html', '/', /0 page footers, expected 1/],
    ['an unprefixed href', '<footer>a</footer><a href="/relatorios/">r</a>', 'x/index.html', '/voto-a-voto-oss/', /without the base \/voto-a-voto-oss\/: \/relatorios\//],
    ['an unprefixed src', '<footer>a</footer><img src="/logo.svg">', 'x/index.html', '/voto-a-voto-oss/', /without the base/],
  ])('flags %s', (_label, html, rel, base, message) => {
    expect(checkBuiltPage(html, rel, base).join(' | ')).toMatch(message)
  })

  it.each([
    ['one footer, prefixed links', '<footer>a</footer><a href="/voto-a-voto-oss/x/">x</a><a href="https://e.com/">e</a><a href="#top">t</a>', 'x/index.html', '/voto-a-voto-oss/'],
    ['an inert backdrop copy beside the real footer', '<footer aria-hidden="true">a</footer><footer>b</footer>', 'x/index.html', '/'],
    ['a nerds panel footer beside the page footer', '<footer data-panel-footer>p</footer><footer>b</footer>', 'x/index.html', '/'],
    ['a listed document with no footer', '<p>embed</p>', 'embed/rj/x/index.html', '/'],
    ['a city share stub with no footer until its script draws the sheet', '<p>stub</p>', 'rj/cidade-exemplo/compartilhar/index.html', '/'],
  ])('lets %s pass', (_label, html, rel, base) => {
    expect(checkBuiltPage(html, rel, base)).toEqual([])
  })

  const WEB = join(import.meta.dirname, '..', '..')
  const out = mkdtempSync(join(tmpdir(), 'own-copies-'))
  const builds = [
    { base: '/', donation: '' },
    { base: '/voto-a-voto-oss/', donation: 'https://donate.example/x' },
  ].map((b, i) => ({ ...b, dir: join(out, `build-${i}`) }))

  beforeAll(() => {
    for (const b of builds) {
      const env: NodeJS.ProcessEnv = { ...process.env, SITE_BASE: b.base, OUT_DIR: b.dir, PUBLIC_DONATION_URL: b.donation }
      delete env.DATA_DIR // the committed fixtures: the same pages in every checkout
      // vitest's own Vite env (BASE_URL='/', MODE='test', NODE_ENV…) would leak into the child build and override its base
      for (const key of ['BASE_URL', 'MODE', 'DEV', 'PROD', 'SSR', 'NODE_ENV', 'VITEST', 'VITEST_MODE', 'VITEST_POOL_ID', 'VITEST_WORKER_ID']) delete env[key]
      withBuildLock(WEB, () => execFileSync('npx', ['astro', 'build'], { cwd: WEB, env, stdio: 'pipe' }))
    }
  }, 240_000)

  afterAll(() => rmSync(out, { recursive: true, force: true }))

  it.each([0, 1])('every page of the fixture build %i has one footer and the base prefix', (i) => {
    const { base, dir } = builds[i]!
    const pages = walkFiles(dir).filter((p) => p.endsWith('.html'))
    expect(pages.length, 'the build produced pages').toBeGreaterThan(100)
    const problems = pages.flatMap((p) => checkBuiltPage(readFileSync(p, 'utf8'), relative(dir, p).split(sep).join('/'), base))
    expect(problems.slice(0, 10).join('\n'), `${problems.length} problems`).toBe('')
  })
})
