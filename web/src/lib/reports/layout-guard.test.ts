/**
 * Guard (ticket #118): every report page draws through the shared layout. A page under `src/pages/relatorios/` (and the
 * outlier component the `cidades-fora-da-curva` routes render) holds no `<main>`, no `<footer`/`SiteFooter`, no `Base`
 * layout, no copy of the notice box, of the share button or of the rank badge, and no `report-analytics` script of its own.
 * The seeded fixtures prove each rule can fail before the same scan runs over the real files.
 */
import { readFileSync } from 'node:fs'
import { relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { walkFiles } from '../../../scripts/walk'

const RULES: { name: string; pattern: RegExp }[] = [
  { name: 'its own <main> shell', pattern: /<main[\s>]/ },
  { name: 'its own footer', pattern: /<footer|<SiteFooter/ },
  { name: 'the Base layout instead of ReportLayout', pattern: /<Base[\s>]|layouts\/Base\.astro/ },
  { name: 'its own notice box (data-notice)', pattern: /data-notice/ },
  { name: 'its own share block (data-share)', pattern: /data-share[\s>=-]|data-share-report/ },
  { name: 'its own rank badge', pattern: /rounded-full bg-primary pb-px/ },
  { name: 'its own report analytics script', pattern: /report-analytics/ },
  { name: 'its own fact-link wiring (use reportFacts)', pattern: /factLinks\(|sealOf\(/ },
]

/** The rules a source breaks, by name. Comments are not blanked: a page that mentions a rule in prose rewords it. */
export function brokenRules(source: string): string[] {
  return RULES.filter((r) => r.pattern.test(source)).map((r) => r.name)
}

const SRC = new URL('../../', import.meta.url).pathname
const pages = walkFiles(`${SRC}pages/relatorios`).filter((p) => p.endsWith('.astro'))
const reportFiles = [...pages, `${SRC}components/OutlierPage.astro`]

describe('the report pages share one layout', () => {
  it('finds the seven report pages, the hub and the outlier component', () => {
    const names = pages.map((p) => relative(`${SRC}pages/relatorios`, p).split(sep).join('/')).sort()
    expect(names).toContain('index.astro')
    expect(names.filter((n) => n !== 'index.astro' && !n.includes('['))).toHaveLength(7)
  })

  it.each([
    ['a shell', '<main class="x">', 'its own <main> shell'],
    ['a footer', '<SiteFooter source="x" />', 'its own footer'],
    ['the Base layout', "import Base from '@/layouts/Base.astro'", 'the Base layout instead of ReportLayout'],
    ['a notice', '<p data-notice>x</p>', 'its own notice box (data-notice)'],
    ['a share block', '<div data-share>', 'its own share block (data-share)'],
    ['a badge', 'class="flex rounded-full bg-primary pb-px"', 'its own rank badge'],
    ['a script', "import '@/scripts/report-analytics'", 'its own report analytics script'],
    ['fact wiring', 'const links = factLinks(a, b)', 'its own fact-link wiring (use reportFacts)'],
  ])('flags %s', (_label, source, rule) => {
    expect(brokenRules(source)).toContain(rule)
  })

  it.each(reportFiles.map((p) => [relative(SRC, p).split(sep).join('/'), p]))('%s draws through ReportLayout', (_name, path) => {
    const source = readFileSync(path, 'utf8')
    expect(brokenRules(source)).toEqual([])
    // The outlier routes render the one component that itself draws through ReportLayout.
    expect(/<ReportLayout|<OutlierPage/.test(source)).toBe(true)
  })
})
