/**
 * The lint half of #132: `findRawLiterals` (a pure scan, imported from presets.ts) walks every
 * web/e2e file except presets.ts and fails when a raw viewport/no-JavaScript/data-guard/notice literal is
 * (re)introduced — even in a spec that also imports the helpers, since this reads text, not imports.
 *
 * The fixture keywords are assembled from fragments so this test file itself passes the scan it asserts
 * (the completeness probe at the bottom greps every file, this one included).
 */
import { globSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { findRawLiterals } from './presets'

const here = fileURLToPath(new URL('.', import.meta.url))

const JS = 'javaScript' + 'Enabled'
const NOTICE = 'voto-a-voto' + ':notice'
const SVS = 'page.setViewport' + 'Size'
const SET_ITEM = 'localStorage.set' + 'Item'
const SKIP = 'test.' + 'skip'
const EXISTS = 'exists' + 'Sync'

const cases: { name: string; source: string; rule: string }[] = [
  { name: 'setViewportSize with an object literal', source: `${SVS}({ width: 390, height: 844 })`, rule: 'viewport-size' },
  { name: 'setViewportSize with the shorthand pair', source: `await ${SVS}({ width, height: 600 })`, rule: 'viewport-size' },
  { name: 'viewport literal in test.use', source: `test.use({ ${'viewport'}: { width: 1440, height: 900 } })`, rule: 'viewport-option' },
  { name: 'viewport literal in newContext', source: `browser.newContext({ locale: 'pt-BR', ${'viewport'}: { width: 390, height: 844 } })`, rule: 'viewport-option' },
  { name: 'no-JavaScript false, tight', source: `test.use({ ${JS}: false })`, rule: 'no-js' },
  { name: 'no-JavaScript false, spaced', source: `test.use({ ${JS} :   false })`, rule: 'no-js' },
  { name: 'no-JavaScript through a variable', source: `test.use({ ${JS}: scriptsOff })`, rule: 'no-js' },
  { name: 'a data guard built by hand', source: `${SKIP}(!${EXISTS}(resolve('../data/cities.csv')), 'no data')`, rule: 'data-guard' },
  { name: 'the notice written in a bare init script', source: `await page.addInitScript(() => ${SET_ITEM}('${NOTICE}', 'acknowledged'))`, rule: 'notice-ack' },
  { name: 'the notice written inside a larger init script', source: `await page.addInitScript(() => {\n  ${SET_ITEM}('${NOTICE}', 'acknowledged')\n  Object.defineProperty(navigator, 'share', { value: undefined })\n})`, rule: 'notice-ack' },
]

const clean = [
  "import { acknowledgeNotice, dataGuard, noJs, useNoJs, viewport, DESKTOP, PHONE } from './presets'",
  'await page.setViewportSize(DESKTOP)',
  'await page.setViewportSize(viewport(w, h))',
  'await page.setViewportSize(size)',
  'const ctx = await browser.newContext({ ...noJs(), viewport: PHONE, locale: "pt-BR" })',
  'useNoJs()',
  `${SKIP}(...dataGuard())`,
  'await acknowledgeNotice(page)',
].join('\n')

describe('no raw presets (#132)', () => {
  it.each(cases)('catches $name', ({ source, rule }) => {
    const findings = findRawLiterals(source, 'fixture.spec.ts')
    expect(findings.map((f) => f.rule), `${source}`).toEqual([rule])
    const [f] = findings
    expect(f!.line).toBeGreaterThanOrEqual(1)
    expect(`${f!.file}:${f!.line} — ${f!.literal} — ${f!.preset}`).toContain('presets.ts')
  })

  it('the preset spellings themselves pass', () => {
    expect(findRawLiterals(clean, 'fixture.spec.ts')).toEqual([])
  })

  it('no e2e file carries a raw preset literal', () => {
    const files = globSync('**/*.ts', { cwd: here }).filter((f) => f !== 'presets.ts')
    const failures: string[] = []
    for (const file of files)
      for (const f of findRawLiterals(readFileSync(`${here}/${file}`, 'utf8'), file)) failures.push(`${f.file}:${f.line} ${f.rule}: "${f.literal}" — use ${f.preset}`)
    expect(failures).toEqual([])
  })

  it('completeness probe: the no-JavaScript option name appears nowhere outside presets.ts', () => {
    const name = JS
    const files = globSync('**/*.ts', { cwd: here }).filter((f) => f !== 'presets.ts')
    const dirty = files.filter((file) => readFileSync(`${here}/${file}`, 'utf8').includes(name))
    expect(dirty).toEqual([])
  })
})
