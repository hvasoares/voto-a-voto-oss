import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from '@playwright/test'
import { base } from './helpers'

/*
 * Gate 2 of the home checkpoint: captures the fixture-state render at 390x844, scroll 0, next to
 * site/reference/01-home.png. The review itself is done by a fresh-context reviewer following
 * site/docs/screenshot-review-protocol.md. Output: web/.captures/home/ (not committed, no baselines).
 */
test('capture home / default', async ({ page }) => {
  await page.goto(base)
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(() => window.scrollTo(0, 0))
  const dir = resolve('.captures', 'home')
  mkdirSync(dir, { recursive: true })
  const file = resolve(dir, 'default.png')
  await page.screenshot({ path: file, animations: 'disabled' })
  writeFileSync(
    resolve(dir, 'default.json'),
    JSON.stringify({ slot: 'home', state: 'default', route: base, viewport: page.viewportSize(), scrollY: await page.evaluate(() => window.scrollY), fullPage: false, reference: 'site/reference/01-home.png', capture: file }, null, 2) + '\n',
  )
})
