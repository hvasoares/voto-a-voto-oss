import { mkdirSync, writeFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { resolve } from 'node:path'
import { base } from './helpers'

/*
 * Screenshot captures of screen 8 (ticket #10): the render at 390x844, scroll 0, next to
 * site/reference/08-brasil-e-regioes.png. The review follows site/docs/screenshot-review-protocol.md.
 * Output: web/.captures/brasil/ (git-ignored; the review compares the PNGs with the reference).
 * States captured here: the fixture dataset and the same page with JavaScript off (the page has no
 * island; the check documents that server-rendering alone shows the screen). The real-data state is
 * captured by e2e/real-data-brasil.spec.ts (data directory ../data).
 */
const capture = async (page: Page, state: string) => {
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(() => window.scrollTo(0, 0))
  const dir = resolve('.captures', 'brasil')
  mkdirSync(dir, { recursive: true })
  const file = resolve(dir, `${state}.png`)
  await page.screenshot({ path: file, animations: 'disabled' })
  writeFileSync(
    resolve(dir, `${state}.json`),
    JSON.stringify({ slot: 'brasil (issue 10)', state, route: `${base}brasil/`, viewport: page.viewportSize(), scrollY: await page.evaluate(() => window.scrollY), fullPage: false, reference: 'site/reference/08-brasil-e-regioes.png', capture: file }, null, 2) + '\n',
  )
}

test('capture /brasil/ fixture state', async ({ page }) => {
  await page.goto(`${base}brasil/`)
  await capture(page, 'fixture')
  // the capture spec is also the review gate: the slot must actually have rendered something
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Brasil e regiões')
  await expect(page.locator('[data-regiao]')).toHaveCount(2)
})

test.describe('with JavaScript off', () => {
  test.use({ javaScriptEnabled: false })

  test('capture /brasil/ no-JS state', async ({ page }) => {
    await page.goto(`${base}brasil/`)
    await capture(page, 'no-js')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Brasil e regiões')
    await expect(page.locator('[data-regiao]')).toHaveCount(2)
  })
})