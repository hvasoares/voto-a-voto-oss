/**
 * The lint half of #133: `findRawCaptureSteps` (a pure scan, imported from capture.ts) walks every capture
 * spec — the glob picks up any future `capture*.spec.ts`, never a hardcoded count — and fails when one of
 * the four raw steps (the .captures mkdir, the fonts wait, the screenshot to .captures, the JSON sidecar
 * write) is (re)introduced outside the helper.
 */
import { globSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { findRawCaptureSteps, type RawCaptureStep } from './capture'

const here = fileURLToPath(new URL('.', import.meta.url))

const cases: { name: string; source: string; step: RawCaptureStep }[] = [
  { name: 'the .captures mkdir', source: "mkdirSync(resolve('.captures', 'home'), { recursive: true })", step: 'mkdir-captures' },
  { name: 'the JSON sidecar write', source: "writeFileSync(resolve(dir, 'default.json'), JSON.stringify({ route }, null, 2) + '\\n')", step: 'sidecar-write' },
  { name: 'the fonts-ready wait', source: 'await page.evaluate(() => document.fonts.ready)', step: 'fonts-ready' },
  { name: 'the screenshot into .captures', source: "await page.screenshot({ path: resolve('.captures', 'home', 'default.png'), animations: 'disabled' })", step: 'screenshot-to-captures' },
]

const clean = [
  "import { capture, captureDir, waitFonts } from './capture'",
  "await capture(page, { dir: 'home', name: 'default', route: base, scrollY: 'page', fullPage: false })",
  "await capture(page, { dir: 'followup-links', name: 'gerador-390', sidecar: false })",
  "const dir = captureDir('cards')",
  'await waitFonts(page)',
  "await page.screenshot({ path: 'test-results/diff.png' }) // a comparison screenshot, not a capture",
].join('\n')

describe('no raw capture steps (#133)', () => {
  it.each(cases)('catches $name', ({ source, step }) => {
    const findings = findRawCaptureSteps(source, 'fixture.spec.ts')
    expect(findings.map((f) => f.step), source).toEqual([step])
    expect(findings[0]!.line).toBeGreaterThanOrEqual(1)
  })

  it('the helper spellings pass', () => {
    expect(findRawCaptureSteps(clean, 'fixture.spec.ts')).toEqual([])
  })

  it('no capture spec repeats a raw step', () => {
    const files = globSync('capture*.spec.ts', { cwd: here })
    const failures: string[] = []
    for (const file of files)
      for (const f of findRawCaptureSteps(readFileSync(`${here}/${file}`, 'utf8'), file))
        failures.push(`${f.file}:${f.line} ${f.step}: "${f.literal}" — use capture(...) from capture.ts`)
    expect(failures).toEqual([])
  })
})
