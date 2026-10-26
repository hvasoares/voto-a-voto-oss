import { expect, test } from '@playwright/test'
import { collectRequests, selected, violations, waitReady } from './helpers'

/*
 * Frontend only: the site is static files and browser code. Every request must be a GET to the site's own
 * origin (pages, assets, data files). The only future exception is the analytics provider loaded after
 * consent by ticket #20, which will be allow-listed HERE, in one place, when it lands.
 */
test.describe('frontend-only: nothing is requested outside the site', () => {
  for (const r of selected) {
    test(`${r.slotId} ${r.path}`, async ({ page, baseURL }) => {
      const seen = collectRequests(page)
      await page.goto(r.path)
      await waitReady(page)
      await page.waitForLoadState('networkidle')
      expect(seen.length).toBeGreaterThan(0)
      expect(violations(seen, new URL(baseURL!).origin)).toEqual([])
    })
  }

  test('the check itself catches an off-site request (canary)', async ({ page, baseURL }) => {
    const seen = collectRequests(page)
    await page.goto(selected[0]!.path)
    await waitReady(page)
    await page.evaluate(() => fetch('https://example.invalid/analytics.js').catch(() => undefined))
    expect(violations(seen, new URL(baseURL!).origin).some((v) => v.includes('example.invalid'))).toBe(true)
  })

  test('data files come from the site own static address', async ({ page, baseURL }) => {
    const seen = collectRequests(page)
    // 404 fallback path makes the client fetch the dataset.
    await page.goto('/rj/cidade-exemplo/?fixture=sketch')
    await waitReady(page)
    const data = seen.filter((r) => r.url.includes('/data/'))
    expect(data.length).toBeGreaterThan(0)
    for (const d of data) expect(new URL(d.url).origin).toBe(new URL(baseURL!).origin)
  })
})
