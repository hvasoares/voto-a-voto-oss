/**
 * Guard (ticket #136, the contract step of the page-shell checkpoints): no page, layout or component keeps its own copy of
 * the page shell. The shared pieces are the only place:
 *
 *  - the column:   `max-w-[430px]` is written in `shared/page-shell.ts` (`mainClass`, `footerClass`) and drawn by `components/PageMain.astro`;
 *  - the head:     `<meta charset>`, the viewport, the robots and `<base target>` tags, only in `components/DocHead.astro`;
 *  - the banner:   the fixture banner's words are the catalog's (`shell.fixtureBanner`), drawn by `components/FixtureBanner.astro`;
 *  - the header:   `<header class="app-header">` only in `components/AppHeader.astro`;
 *  - the seal:     the "conferido" aside (`class="seal"`, `seal__title|lines|note`) only in `components/Seal.astro`.
 *
 * Token based (the pattern is the token, never a long class literal, so a reordered class is still caught). Every non-test source
 * file of web/src, comments removed, is scanned. Named exceptions carry their reason below and are asserted live (an exemption that
 * stops being needed fails). `findShellCopies` is pure; the seeded fixtures prove each rule can fail before the same scan runs over
 * the real tree. The message names the offending rule and the piece to use.
 */
import { readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { walkFiles } from '../../scripts/walk'

type Rule = 'column' | 'head' | 'banner' | 'app-header' | 'seal'

const RULES: { rule: Rule; pattern: RegExp; use: string }[] = [
  { rule: 'column', pattern: /max-w-\[430px\]/, use: 'a page draws <PageMain> (components/PageMain.astro) and a page footer takes footerClass() — both built from shared/page-shell.ts' },
  { rule: 'head', pattern: /<meta\s+charset|name="viewport"|<base\s+target|name="robots"/, use: 'a layout draws <DocHead> (components/DocHead.astro) inside its document' },
  { rule: 'banner', pattern: /EXEMPLO\s*·\s*DADOS FICT[ÍI]CIOS/, use: 'the fixture banner is <FixtureBanner> (components/FixtureBanner.astro); its words are the catalog key shell.fixtureBanner' },
  { rule: 'app-header', pattern: /<header[^>]*class="app-header"|\bapp-header__sep\b/, use: 'the screen pages draw <AppHeader> (components/AppHeader.astro)' },
  { rule: 'seal', pattern: /class="seal\b|\bseal__(?:title|lines|note)\b/, use: 'a page draws <Seal lines={...}> (components/Seal.astro)' },
]

/** Where each pattern may live, with the reason. Asserted live below. */
const ALLOWED: Record<Rule, Record<string, string>> = {
  column: {
    'shared/page-shell.ts': 'the builders: the one place the column class is written',
    'shared/footer.ts': 'the default class of the global footer lines (SiteFooter), a different element from the page footer',
    'components/PhoneHeader.astro': 'the phone header is one component, the only element of its class',
    'components/ConsentBanner.astro': 'the metrics notice is one component; its inner column is its own element',
  },
  head: { 'components/DocHead.astro': 'the one document head' },
  banner: {
    'lib/sentences/catalog-shell.ts': 'the catalog holds the sentence',
  },
  'app-header': { 'components/AppHeader.astro': 'the one app header' },
  seal: { 'components/Seal.astro': 'the one seal block' },
}

/** The source with comments blanked (same length, newlines kept), so doc comments never classify. */
const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->|(?<![:\w"'`/])\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, ' '))

/** The shell copies in one source, as `{rule, message}`. Pure. */
export function findShellCopies(source: string): { rule: Rule; message: string }[] {
  const code = stripComments(source)
  const line = (index: number) => code.slice(0, index).split('\n').length
  return RULES.flatMap(({ rule, pattern, use }) => {
    const hit = pattern.exec(code)
    return hit ? [{ rule, message: `own page shell (${rule}) at line ${line(hit.index)}: ${use}` }] : []
  })
}

const SRC = join(import.meta.dirname, '..')
const files = walkFiles(SRC).filter((p) => /\.(ts|tsx|astro)$/.test(p) && !/\.test\.(ts|tsx)$/.test(p))
const text = new Map(files.map((p) => [relative(SRC, p).split(sep).join('/'), readFileSync(p, 'utf8')]))

const offenders = (rule: Rule) =>
  [...text].filter(([p]) => !(p in ALLOWED[rule])).flatMap(([p, src]) => findShellCopies(src).filter((c) => c.rule === rule).map((c) => `${p}: ${c.message}`))

describe('no page keeps its own shell (#136), source layer', () => {
  it('has a real tree to scan', () => {
    expect(files.length, `found ${files.length} source files, expected at least 300`).toBeGreaterThanOrEqual(300)
  })

  it.each(RULES.map((r) => r.rule))('no own %s outside the shared piece and the named exceptions', (rule) => {
    expect(offenders(rule)).toEqual([])
  })

  it.each(Object.entries(ALLOWED).flatMap(([rule, paths]) => Object.keys(paths).map((p) => [p, rule as Rule] as const)))('the exemption for %s is still needed (%s)', (path, rule) => {
    expect(text.has(path), `${path} missing`).toBe(true)
    expect(findShellCopies(text.get(path)!).filter((c) => c.rule === rule), `${path} no longer trips ${rule} — drop the exemption`).not.toEqual([])
  })

  it('the shared pieces exist', () => {
    for (const piece of ['shared/page-shell.ts', 'components/PageMain.astro', 'components/DocHead.astro', 'components/FixtureBanner.astro', 'components/AppHeader.astro', 'components/Seal.astro'])
      expect(text.has(piece), piece).toBe(true)
  })

  it.each([
    ['a page with its own column class', '<main class="mx-auto min-w-0 w-full max-w-[430px] flex-1 px-5 pt-3 md:max-w-[480px]" id="main">', 'column'],
    ['the column token reordered', '<main class="px-5 max-w-[430px] mx-auto">', 'column'],
    ['a layout with its own charset', '<head><meta charset="utf-8" /></head>', 'head'],
    ['a layout with its own viewport', '<meta name="viewport" content="width=device-width" />', 'head'],
    ['an embed with its own robots tag', '<meta name="robots" content="noindex" />', 'head'],
    ['a page with its own base target', '<base target="_blank" />', 'head'],
    ['a page with the banner words', "const banner = 'EXEMPLO · DADOS FICTÍCIOS, NÃO SÃO RESULTADOS REAIS'", 'banner'],
    ['a banner written in a paragraph', '<p class="x">EXEMPLO · DADOS FICTÍCIOS, NÃO SÃO RESULTADOS REAIS</p>', 'banner'],
    ['a page with its own app header', '<header class="app-header"><a class="brand">Voto a Voto</a></header>', 'app-header'],
    ['a page with its own seal', '<aside class="seal" data-seal><h2 class="seal__title">x</h2></aside>', 'seal'],
  ])('flags %s', (_label, source, rule) => {
    expect(findShellCopies(source).map((c) => c.rule)).toContain(rule)
  })

  it('the failure message names the page piece to use', () => {
    const messages = findShellCopies('<main class="max-w-[430px]">\n<meta charset="utf-8">').map((c) => c.message).join(' | ')
    expect(messages).toMatch(/own page shell \(column\) at line 1: a page draws <PageMain>/)
    expect(messages).toMatch(/own page shell \(head\) at line 2: a layout draws <DocHead>/)
  })

  it.each([
    ['the shell components', '<PageMain md="480" data-page="x" /><FixtureBanner show={fixture} /><AppHeader /><Seal lines={seal} />'],
    ['a column named in a comment', '// the max-w-[430px] column is PageMain\n/* <meta charset> is DocHead */'],
    ['the 1240 px top bar', '<div class="mx-auto flex h-full w-full max-w-[1240px] items-center px-5">'],
    ['a seal component import', "import Seal from '@/components/Seal.astro'"],
    ['the catalog key', "message(voice, 'shell.fixtureBanner')"],
  ])('lets %s pass', (_label, source) => {
    expect(findShellCopies(source)).toEqual([])
  })
})
