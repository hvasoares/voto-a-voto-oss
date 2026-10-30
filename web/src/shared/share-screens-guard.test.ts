/**
 * Guard (ticket #137, the contract step): the three QR routes and the three share routes draw two screens, and nothing else keeps a copy.
 *
 *  - markup:  the QR screen's and the share sheet's marker attributes (`data-qr-screen`, `data-poster`, `data-qr-link`, `data-share-sheet`,
 *             `data-share-picture`, `data-share-backdrop`, `data-share-dim`) are written only in `components/QrScreen.astro` and
 *             `components/ShareSheetFrame.astro` (the sheet drawn inside `ShareScreen`), plus the named exceptions below;
 *  - pages:   each of the six routes imports and draws its component (`<QrScreen`, `<ShareScreen`) and writes none of that markup;
 *  - scope:   the screen components never look at which scope they draw (no `scope` in their code): what differs is the data
 *             `lib/screen-scopes.ts` builds, one builder per scope in a record typed over the scope names.
 *
 * Token based, comments removed. Named exceptions carry their reason and are asserted live (an exemption that stops being needed fails).
 * `findScreenCopies` and `findScopeBranches` are pure; the seeded fixtures prove each rule can fail before the same scan runs over the
 * real tree. The message names the page and the component to use.
 */
import { readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { walkFiles } from '../../scripts/walk'

const MARKERS = /\bdata-(?:qr-screen|poster|qr-link|share-sheet|share-picture|share-backdrop|share-dim)\b/

/** Where the markers may live, with the reason. Asserted live below. */
const ALLOWED: Record<string, string> = {
  'lib/qr-screen.ts': 'the one QR screen (and its poster) as a string: QrScreen.astro prints it for the demo and Brasil, the city stub draws it from its data file (private#208)',
  'components/ShareSheetFrame.astro': 'the one share sheet',
  'components/ShareSheet.tsx': 'the city sheet island: it draws the picture inside the sheet and reads the sheet element',
  'pages/imprensa/cartaz/[uf]/index.astro': 'the press poster is a different page that happens to name its section data-poster',
}

/** The six routes and the component each one draws. */
const ROUTES: Record<string, 'QrScreen' | 'ShareScreen' | 'PageStub'> = {
  'pages/qr.astro': 'QrScreen',
  // The city's QR route is a stub whose script draws the same string (private#208).
  'pages/[uf]/[slug]/qr/index.astro': 'PageStub',
  'pages/brasil/qr/index.astro': 'QrScreen',
  'pages/compartilhar.astro': 'ShareScreen',
  'pages/[uf]/[slug]/compartilhar/index.astro': 'ShareScreen',
  'pages/brasil/compartilhar/index.astro': 'ShareScreen',
}
const SCREEN_COMPONENTS = ['components/QrScreen.astro', 'components/ShareScreen.astro', 'components/ShareSheetFrame.astro', 'components/ShareDemoBackdrop.astro']

/** The source with comments blanked (same length, newlines kept), so doc comments never classify. */
const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->|(?<![:\w"'`/])\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, ' '))

const lineOf = (code: string, index: number) => code.slice(0, index).split('\n').length

/** The screen markup a source writes itself, as messages. Pure. */
export function findScreenCopies(source: string): string[] {
  const code = stripComments(source)
  const hit = MARKERS.exec(code)
  return hit ? [`own screen markup (${hit[0]}) at line ${lineOf(code, hit.index)}: the QR screens are <QrScreen> (components/QrScreen.astro), the share sheets <ShareScreen> (components/ShareScreen.astro)`] : []
}

/** Where a screen component looks at the scope. Pure. */
export function findScopeBranches(source: string): string[] {
  const code = stripComments(source)
  const hit = /\bscope\b/.exec(code)
  return hit ? [`looks at the scope at line ${lineOf(code, hit.index)}: a screen component draws its config; what differs per scope is data built in lib/screen-scopes.ts`] : []
}

const SRC = join(import.meta.dirname, '..')
const files = walkFiles(SRC).filter((p) => /\.(ts|tsx|astro)$/.test(p) && !/\.test\.(ts|tsx)$/.test(p))
const text = new Map(files.map((p) => [relative(SRC, p).split(sep).join('/'), readFileSync(p, 'utf8')]))

describe('the QR and share screens have no copy (#137), source layer', () => {
  it('has a real tree to scan', () => {
    expect(files.length, `found ${files.length} source files, expected at least 300`).toBeGreaterThanOrEqual(300)
  })

  it('no file writes the screen markup outside the two components and the named exceptions', () => {
    const offenders = [...text].filter(([p]) => !(p in ALLOWED)).flatMap(([p, src]) => findScreenCopies(src).map((m) => `${p}: ${m}`))
    expect(offenders).toEqual([])
  })

  it.each(Object.keys(ALLOWED))('the exemption for %s is still needed', (path) => {
    expect(text.has(path), `${path} missing`).toBe(true)
    expect(findScreenCopies(text.get(path)!), `${path} no longer writes the markup — drop the exemption`).not.toEqual([])
  })

  it.each(Object.entries(ROUTES))('%s imports and draws <%s>', (page, component) => {
    const code = stripComments(text.get(page) ?? '')
    expect(text.has(page), `${page} missing`).toBe(true)
    expect(code, `${page} does not import ${component}`).toMatch(new RegExp(`import ${component} from '@/components/${component}\\.astro'`))
    expect(code, `${page} does not draw <${component}`).toContain(`<${component} `)
    expect(findScreenCopies(code), page).toEqual([])
  })

  it.each(SCREEN_COMPONENTS)('%s never looks at the scope', (path) => {
    expect(text.has(path), `${path} missing`).toBe(true)
    expect(findScopeBranches(text.get(path)!).map((m) => `${path} ${m}`)).toEqual([])
  })

  it('the scopes are one record of builders per screen, typed over the scope names', () => {
    const code = stripComments(text.get('lib/screen-scopes.ts')!)
    expect(code).toMatch(/type Builders<Config> = \{ \[K in ScreenScope\['scope'\]\]/)
    expect(code).toMatch(/const QR_SCOPES: Builders<QrScreenConfig> =/)
    expect(code).toMatch(/const SHARE_SCOPES: Builders<ShareScreenConfig> =/)
  })

  it.each([
    ['a page with its own QR screen', '<main id="main"><section data-qr-screen aria-label="Mostrar QR">', 'data-qr-screen'],
    ['a page with its own share sheet', '<section data-share-sheet id="main" class="fixed">', 'data-share-sheet'],
    ['a page with its own share picture', '<div data-share-picture set:html={svg} />', 'data-share-picture'],
    ['a page with its own Mostrar QR link', '<a href={href("/qr/")} data-qr-link>Mostrar QR</a>', 'data-qr-link'],
    ['a page with its own poster', '<section data-poster class="hidden print:block">', 'data-poster'],
    ['the marker moved after other attributes', '<div class="x" aria-hidden="true" inert data-share-backdrop>', 'data-share-backdrop'],
  ])('flags %s', (_label, source, marker) => {
    const [message, ...rest] = findScreenCopies(source)
    expect(rest).toEqual([])
    expect(message).toContain(`own screen markup (${marker}) at line 1`)
    expect(message).toContain('<QrScreen>')
    expect(message).toContain('<ShareScreen>')
  })

  it('flags a screen component that branches on the scope', () => {
    expect(findScopeBranches("---\nconst { scope } = Astro.props\n---\n{scope.scope === 'city' && <a />}")[0]).toMatch(/looks at the scope at line 2/)
  })

  it.each([
    ['the components drawn', '<QrScreen config={config} /><ShareScreen config={config}><CityCard slot="backdrop" /></ShareScreen>'],
    ['the markers named in a comment', '// data-qr-screen is QrScreen\n/* data-share-sheet is ShareScreen */'],
    ['a config handed in', 'const { cityName, url } = Astro.props.config'],
  ])('lets %s pass', (_label, source) => {
    expect(findScreenCopies(source)).toEqual([])
    expect(findScopeBranches(source)).toEqual([])
  })
})
