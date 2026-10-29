import { expect, test } from '@playwright/test'
import { base } from './helpers'
import { FINALITY_PAGES } from './routes-inventory'
import { viewport, noJs } from './presets'

/*
 * "Final, não ao vivo" sits on the global footer line of every page (Base.astro), with the wording Home prints under its tagline. A chip, not a link: plain text that
 * needs no script. The 44 px rule of the footer still holds for every link of the line. The page list lives in e2e/routes-inventory.ts
 * (#110): one page per layout that renders the chip; the route-inventory guard fails when such a layout has no listed page.
 */
const PAGES = FINALITY_PAGES.map(({ name, route }) => [name, `${base}${route}`] as const)
const line = (page: import('@playwright/test').Page) => page.locator('[data-component="consent-footer"]')

for (const [w, h] of [[390, 844], [1440, 900]] as const) {
  test.describe(`${w}x${h}`, () => {
    test.use({ viewport: viewport(w, h) })

    test('every page type has the chip once on the footer line, with the words Home uses, and it is not a link', async ({ page }) => {
      await page.goto(base)
      const home = ((await page.locator('[data-finality]').textContent()) ?? '').trim().replace(/\.$/, '')
      expect(home).toBe('Final, não ao vivo')
      for (const [name, url] of PAGES) {
        await page.goto(url)
        const chip = line(page).locator('[data-finality-chip]')
        await expect(chip, name).toHaveCount(1)
        await expect(chip, name).toBeVisible()
        await expect(chip, name).toHaveText(home)
        expect(await chip.evaluate((el) => !!el.closest('a') && el.tagName), name).toBe(false)
      }
    })

    test('the footer stays on two lines (the chip does not push a third one, with or without the donation link)', async ({ page }) => {
      for (const [name, url] of PAGES) {
        await page.goto(url)
        expect(await line(page).evaluate((el) => el.getBoundingClientRect().height), name).toBeLessThan(2 * 44 + 24)
      }
    })

    test('the footer line keeps its 44 px links, fits the width and does not scroll sideways', async ({ page }) => {
      for (const [name, url] of PAGES) {
        await page.goto(url)
        for (const a of await line(page).locator('a').all()) expect((await a.boundingBox())!.height, name).toBeGreaterThanOrEqual(44)
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), name).toBe(true)
      }
    })
  })
}

test('the chip is in the page without scripts', async ({ browser }) => {
  const ctx = await browser.newContext(noJs())
  const page = await ctx.newPage()
  await page.goto(`${base}rj/cidade-exemplo/`)
  await expect(line(page).locator('[data-finality-chip]')).toHaveText('Final, não ao vivo')
  await ctx.close()
})
