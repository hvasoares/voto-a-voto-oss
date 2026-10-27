import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { activateSearch, allowedOrigins, base, collectRequests, violations } from './helpers'

/*
 * Real-data checks. Run with `npm run test:real` (builds with DATA_DIR=../data, relative to web/). Skipped when ../data is missing.
 * Tile hrefs are asserted as correct PATHS only: state pages are not ported yet (#50), so they do not exist in this build.
 */
test.skip(!existsSync(resolve('../data/cities.csv')), 'no ../data')

const results = (page: import('@playwright/test').Page) => page.locator('a[data-position]').evaluateAll((els) => els.map((e) => e.textContent!.trim()))

test.describe('home search on the real dataset', () => {
  test('finds cities typed without accents, with their UF', async ({ page }) => {
    await page.goto(base)
    const box = await activateSearch(page)
    for (const [typed, first] of [['sao paulo', 'São PauloSP'], ['brasilia', 'BrasíliaDF'], ['Belém', 'BelémAL']] as const) {
      await box.fill(typed)
      await expect(page.locator('a[data-position]').first()).toBeVisible()
      expect(await results(page), typed).toContain(first)
    }
  })

  test('shows every state of a name that exists in several states', async ({ page }) => {
    await page.goto(base)
    const box = await activateSearch(page)
    await box.fill('belem')
    await expect(page.locator('a[data-position]').first()).toBeVisible()
    const found = await results(page)
    for (const uf of ['AL', 'PA', 'PB']) expect(found).toContain(`Belém${uf}`)
  })

  test('cuts the list at 20 and says how many exist', async ({ page }) => {
    await page.goto(base)
    const box = await activateSearch(page)
    await box.fill('sa')
    await expect(page.locator('a[data-position]')).toHaveCount(20)
    await expect(page.getByText(/Mostrando 20 de \d+/)).toBeVisible()
  })

  test('opens the right city from a result', async ({ page }) => {
    await page.goto(base)
    const box = await activateSearch(page)
    await box.fill('sao paulo')
    await page.locator('a[data-position]', { hasText: 'SP' }).first().click()
    await expect(page).toHaveURL(new RegExp(`${base}sp/sao-paulo/$`))
  })

  test('27 state tiles link to the state path; overseas is not a state (state pages are not ported yet: paths only)', async ({ page }) => {
    await page.goto(base)
    const hrefs = await page.locator('a[data-uf]').evaluateAll((els) => els.map((e) => e.getAttribute('href')!))
    expect(hrefs).toHaveLength(27)
    expect(hrefs).not.toContain(`${base}zz/`)
    for (const h of hrefs) expect(h).toMatch(new RegExp(`^${base}[a-z]{2}/$`))
    await expect(page.locator('span[data-uf]')).toHaveCount(0)
  })

  test('typing makes no request beyond the site and answers fast', async ({ page, baseURL }) => {
    const seen = collectRequests(page)
    await page.goto(base)
    const box = await activateSearch(page)
    await box.fill('sa')
    await expect(page.locator('a[data-position]').first()).toBeVisible()
    const ms: number[] = []
    for (const q of ['sao', 'sao paulo', 'belem', 'bom jesus', 'santa luzia', 'brasilia']) {
      const t0 = Date.now()
      await box.fill(q)
      await expect(page.locator('a[data-position]').first()).toBeVisible()
      ms.push(Date.now() - t0)
    }
    console.log('search latency ms (incl. Playwright round trips, 5,760 cities):', ms.join(' '))
    expect(Math.max(...ms)).toBeLessThan(500)
    await page.waitForLoadState('networkidle')
    expect(violations(seen, await allowedOrigins(new URL(baseURL!).origin))).toEqual([])
    const files = seen.map((r) => new URL(r.url).pathname).filter((p) => p.includes('/data/'))
    expect(files.every((p) => p.endsWith('/search.json'))).toBe(true)
  })

  test('works without horizontal scroll with results open', async ({ page }) => {
    await page.goto(base)
    const box = await activateSearch(page)
    await box.fill('bom jesus')
    await expect(page.locator('a[data-position]').first()).toBeVisible()
    const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
    expect(sw).toBeLessThanOrEqual(iw)
  })
})
