/**
 * `npm test` runs this: the fixed-wait / bare-read check of #123. The first five tests prove, on string
 * fixtures, that the checker can fail; the last one walks every file of web/e2e/ and must stay clean of
 * error findings — a new `waitForTimeout(` (or a sleep promise, or a setTimeout inside a page call) fails
 * the suite unless it is listed, with a reason, in `e2e/wait-allowlist.json`. Bare reads are warnings:
 * the walk prints the count so the backlog is visible without blocking.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { applyAllowlist, findViolations, type AllowEntry } from './e2e-waits'

const web = resolve(dirname(fileURLToPath(import.meta.url)), '..')

describe('findViolations fixtures', () => {
  it('(a) a spec with waitForTimeout(500) yields one fixed-wait violation naming file and line', () => {
    const src = ['test("x", async ({ page }) => {', '  await page.goto("/")', '  await page.waitForTimeout(500)', '})'].join('\n')
    const found = findViolations(src, 'e2e/fixture.spec.ts')
    expect(found).toHaveLength(1)
    expect(found[0]).toMatchObject({ file: 'e2e/fixture.spec.ts', line: 3, rule: 'fixed-wait', severity: 'error', text: 'await page.waitForTimeout(500)' })
  })

  it('flags the sleep promise and a setTimeout inside page.evaluate, and never test.setTimeout', () => {
    const src = [
      'test.setTimeout(120_000)',
      'await new Promise((resolve) => setTimeout(resolve, 250))',
      'await page.evaluate(() => {',
      '  return new Promise((done) => setTimeout(done, 100))',
      '})',
    ].join('\n')
    const errors = findViolations(src, 'e2e/fixture.spec.ts').filter((f) => f.rule === 'fixed-wait')
    expect(errors.map((f) => f.line)).toEqual([2, 4])
  })

  it('(b) a spec waiting on the ready attribute is clean', () => {
    const src = ['test("x", async ({ page }) => {', "  await expect(page.locator('[data-ready=yes]')).toBeVisible()", '})'].join('\n')
    expect(findViolations(src, 'e2e/fixture.spec.ts')).toEqual([])
  })

  it('a one-shot read without a web-first assertion is a bare-read warning, and never an error', () => {
    const src = ['test("x", async ({ page }) => {', '  const t = await page.locator("h1").textContent()', '  expect(t).toContain("oi")', '})'].join('\n')
    const found = findViolations(src, 'e2e/fixture.spec.ts')
    expect(found).toHaveLength(1)
    expect(found[0]).toMatchObject({ rule: 'bare-read', severity: 'warning', line: 2 })
  })

  it('a bare read covered by an awaited web-first assertion within 3 lines is exempt', () => {
    const src = [
      'test("x", async ({ page }) => {',
      '  const loc = page.locator("[data-card]")',
      '  await expect(loc).toHaveText(/oi/)',
      '  const t = await loc.textContent()',
      '  expect(t!.length).toBeGreaterThan(2)',
      '})',
    ].join('\n')
    expect(findViolations(src, 'e2e/fixture.spec.ts')).toEqual([])
  })

  it('a waitForFunction without a second argument is a msgless-wait warning', () => {
    const src = "await page.waitForFunction(() => document.documentElement.dataset.ready !== undefined)"
    const found = findViolations(src, 'e2e/fixture.spec.ts')
    expect(found).toHaveLength(1)
    expect(found[0]).toMatchObject({ rule: 'msgless-wait', severity: 'warning' })
  })
})

describe('the allowlist', () => {
  const src = ['test("x", async ({ page }) => {', '  await page.waitForTimeout(500)', '})'].join('\n')
  const sources = new Map([['e2e/fixture.spec.ts', src]])
  const entry: AllowEntry = { file: 'e2e/fixture.spec.ts', rule: 'fixed-wait', match: 'await page.waitForTimeout(500)', reason: 'a negative window: nothing must happen' }

  it('(c) a banned call with a matching allowlist entry is clean', () => {
    const { problems, remaining } = applyAllowlist(findViolations(src, 'e2e/fixture.spec.ts'), [entry], sources)
    expect(problems).toEqual([])
    expect(remaining.filter((f) => f.severity === 'error')).toEqual([])
  })

  it('(d) an entry whose file or pattern no longer matches any line fails as a stale allowlist entry', () => {
    for (const e of [
      { ...entry, file: 'e2e/gone.spec.ts' },
      { ...entry, match: 'await page.waitForTimeout(600)' },
    ]) {
      const { problems } = applyAllowlist(findViolations(src, 'e2e/fixture.spec.ts'), [e], sources)
      expect(problems).toHaveLength(1)
      expect(problems[0]).toContain('stale allowlist entry')
    }
  })

  it('(e) an entry with an empty reason fails', () => {
    const { problems } = applyAllowlist(findViolations(src, 'e2e/fixture.spec.ts'), [{ ...entry, reason: ' ' }], sources)
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('reason')
  })

  it('an entry that matches but the fixed wait is still present suppresses only that line', () => {
    const two = ['await page.waitForTimeout(500)', 'await page.waitForTimeout(900)'].join('\n')
    const sources2 = new Map([['e2e/fixture.spec.ts', two]])
    const { remaining } = applyAllowlist(findViolations(two, 'e2e/fixture.spec.ts'), [entry], sources2)
    expect(remaining).toHaveLength(1)
    expect(remaining[0]!.text).toBe('await page.waitForTimeout(900)')
  })
})

describe('the real suite', () => {
  it('no fixed-timeout waits outside the allowlist (warnings are reported, not failed)', () => {
    const files = readdirSync(resolve(web, 'e2e'))
      .filter((f) => f.endsWith('.ts'))
      .sort()
    // The floor keeps the walk from silently shrinking: a deleted e2e file fails here first.
    expect(files.length, 'web/e2e/*.ts count').toBeGreaterThanOrEqual(130)

    const sources = new Map(files.map((f) => [`e2e/${f}`, readFileSync(resolve(web, 'e2e', f), 'utf8')]))
    const entries = JSON.parse(readFileSync(resolve(web, 'e2e', 'wait-allowlist.json'), 'utf8')) as AllowEntry[]
    const findings = [...sources.entries()].flatMap(([file, source]) => findViolations(source, file))
    const { problems, remaining } = applyAllowlist(findings, entries, sources)

    const warnings = remaining.filter((f) => f.severity === 'warning')
    if (warnings.length) {
      console.info(
        `e2e-waits: ${warnings.length} warning(s) (bare reads and msgless waits — the #123 backlog, not a failure). First ten:\n` +
          warnings
            .slice(0, 10)
            .map((w) => `  ${w.file}:${w.line} ${w.rule}: ${w.text}`)
            .join('\n'),
      )
    }
    expect(problems, 'wait-allowlist problems').toEqual([])
    const errors = remaining.filter((f) => f.severity === 'error')
    expect(errors.map((f) => `${f.file}:${f.line} ${f.rule}: ${f.text}`), 'fixed-timeout waits outside wait-allowlist.json').toEqual([])
  })
})
