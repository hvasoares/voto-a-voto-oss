import { expect, test } from '@playwright/test'
import { selected, slotMetas, waitReady } from './helpers'

test.describe('layout holds at 390 px: no horizontal scroll', () => {
  const fixtureRoutes = slotMetas.flatMap((m) => [m.fixtureRoute, ...(m.extraFixtures ?? []).map((e) => e.route)].map((route) => ({ id: m.id, route })))
  for (const r of selected) {
    test(`${r.slotId} ${r.path}`, async ({ page }) => {
      await page.goto(r.path)
      await waitReady(page)
      expect(page.viewportSize()).toEqual({ width: 390, height: 844 })
      const { scrollWidth, innerWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }))
      expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
    })
  }
  for (const f of fixtureRoutes) {
    test(`fixture ${f.id} ${f.route}`, async ({ page }) => {
      await page.goto(f.route)
      await waitReady(page)
      const { scrollWidth, innerWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }))
      expect(scrollWidth).toBeLessThanOrEqual(innerWidth)
    })
  }
})
