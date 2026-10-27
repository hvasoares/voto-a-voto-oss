import { expect, test } from '@playwright/test'
import { activateSearch, allowedOrigins, base, collectRequests, mode, violations } from './helpers'

/*
 * Frontend only. Two modes (E2E_MODE): against the local-bundle build only the site's own origin and the analytics
 * origins may be requested; against the production build the approved CDN origins (cdn.config.json) are also allowed.
 * Both fail on anything else.
 */
test.describe(`network allow-list (${mode} build)`, () => {
  for (const path of ['', 'sem-arquivo-aqui/']) {
    test(`/${path} requests only allowed origins`, async ({ page, baseURL }) => {
      const seen = collectRequests(page)
      await page.goto(base + path)
      await page.waitForLoadState('networkidle')
      if (path === '') await (await activateSearch(page)).fill('cidade')
      await page.waitForLoadState('networkidle')
      expect(seen.length).toBeGreaterThan(0)
      expect(violations(seen, await allowedOrigins(new URL(baseURL!).origin))).toEqual([])
    })
  }

  test('the check itself catches an off-site request (canary)', async ({ page, baseURL }) => {
    const seen = collectRequests(page)
    await page.goto(base)
    await page.evaluate(() => fetch('https://example.invalid/analytics.js').catch(() => undefined))
    expect(violations(seen, await allowedOrigins(new URL(baseURL!).origin)).some((v) => v.includes('example.invalid'))).toBe(true)
  })

  test('the check catches a non-GET request to the site (canary)', async ({ page, baseURL }) => {
    const seen = collectRequests(page)
    await page.goto(base)
    await page.evaluate((b) => fetch(b, { method: 'POST' }).catch(() => undefined), base)
    expect(violations(seen, await allowedOrigins(new URL(baseURL!).origin)).some((v) => v.startsWith('POST'))).toBe(true)
  })
})
