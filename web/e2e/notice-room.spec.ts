import { expect, test, type Page } from '@playwright/test'
import { base } from './helpers'
import { viewport } from './presets'

/*
 * The fixed metrics notice (#90) must not cover the last lines of a page. While it is visible the page makes room for it (bottom padding, and a shell that is
 * shorter by the same amount so a SHORT page does not scroll for nothing); once dismissed the room is given back. Checked at the phone and the desktop frame.
 */
const FRAMES = [[390, 844], [1440, 900]] as const
const SHORT = 'pagina-que-nao-existe/'

/** Bottom edge of the lowest control or link of the page (the notice itself excluded). */
const lowestControl = (page: Page) =>
  page.evaluate(() => Math.max(...[...document.querySelectorAll('a[href], button, input')].filter((e) => !e.closest('#consent-banner')).map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0 && r.height > 0).map((r) => r.bottom)))
const bannerTop = (page: Page) => page.locator('#consent-banner').evaluate((el) => el.getBoundingClientRect().top)

for (const [w, h] of FRAMES) {
  test.describe(`${w}x${h}`, () => {
    test.use({ viewport: viewport(w, h) })

    test('a short page shows its last control above the notice at once, with nothing to scroll', async ({ page }) => {
      await page.goto(base + SHORT)
      await expect(page.locator('#consent-banner')).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true)
      expect(await lowestControl(page)).toBeLessThanOrEqual((await bannerTop(page)) + 0.5)
    })

    test('a long page scrolled to its end shows its last control above the notice', async ({ page }) => {
      await page.goto(base + 'sobre-os-dados/')
      await expect(page.locator('#consent-banner')).toBeVisible()
      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight))
      expect(await lowestControl(page)).toBeLessThanOrEqual((await bannerTop(page)) + 0.5)
    })

    test('dismissing the notice gives the room back, and a remembered visitor never had it taken', async ({ page }) => {
      await page.goto(base + 'sobre-os-dados/')
      await expect(page.locator('#consent-banner')).toBeVisible()
      const withNotice = await page.evaluate(() => document.documentElement.scrollHeight)
      await page.locator('[data-consent-continue]').click()
      await expect(page.locator('#consent-banner')).toBeHidden()
      const state = await page.evaluate(() => ({ pad: document.body.style.paddingBottom, shell: document.querySelector<HTMLElement>('#consent-banner')!.parentElement!.style.minHeight, h: document.documentElement.scrollHeight }))
      expect(state.pad).toBe('')
      expect(state.shell).toBe('')
      expect(state.h).toBeLessThan(withNotice)
      await page.reload()
      await expect(page.locator('#consent-banner')).toBeHidden()
      expect(await page.evaluate(() => document.body.style.paddingBottom)).toBe('')
      expect(Math.abs((await page.evaluate(() => document.documentElement.scrollHeight)) - state.h)).toBeLessThanOrEqual(2)
    })
  })
}
