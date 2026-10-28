import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { base } from './helpers'

/*
 * #90: the metrics notice is a calm note, not the page's call to action. It sits on the SECONDARY background (the one the site's
 * quiet panels use), "Prosseguir" is an outlined button (not the filled primary one), text and link stay AA, the button keeps a visible
 * focus ring. Position is unchanged (fixed, z-40, same height): only the look was calmed.
 */
const PAGES = [['Home', ''], ['City card', 'rj/cidade-exemplo/']] as const

for (const [name, path] of PAGES) {
  test.describe(name, () => {
    test('the visible notice uses the secondary background and an outline button, not the primary fill', async ({ page }) => {
      await page.goto(base + path)
      const banner = page.locator('#consent-banner')
      await expect(banner).toBeVisible()
      const colours = await page.evaluate(() => {
        const css = (el: Element, p: string) => getComputedStyle(el).getPropertyValue(p)
        const root = document.documentElement
        const token = (n: string) => {
          const probe = document.createElement('i')
          probe.style.color = `var(${n})`
          root.append(probe)
          const c = getComputedStyle(probe).color
          probe.remove()
          return c
        }
        const b = document.querySelector('#consent-banner')!
        const btn = b.querySelector('[data-consent-continue]')!
        return {
          bar: css(b, 'background-color'), secondary: token('--secondary'), primary: token('--primary'),
          btnBg: css(btn, 'background-color'), btnBorder: css(btn, 'border-top-color'),
        }
      })
      expect(colours.bar).toBe(colours.secondary)
      expect(colours.bar).not.toBe(colours.primary)
      expect(colours.btnBg).not.toBe(colours.primary)
      expect(colours.btnBorder).toBe(colours.primary)
    })

    test('"Prosseguir" shows a focus ring on keyboard focus; axe (colour contrast included) is clean with the notice open', async ({ page }) => {
      await page.goto(base + path)
      const button = page.locator('[data-consent-continue]')
      await expect(button).toBeVisible()
      await button.focus()
      await page.keyboard.press('Shift+Tab')
      await page.keyboard.press('Tab')
      await expect(button).toBeFocused()
      expect(await button.evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe('none')
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
      expect(violations.map((v) => v.id)).toEqual([])
    })

    test('dismissing hides the notice and it stays hidden after a reload', async ({ page }) => {
      await page.goto(base + path)
      await page.locator('[data-consent-continue]').click()
      await expect(page.locator('#consent-banner')).toBeHidden()
      await page.reload()
      await expect(page.locator('#consent-banner')).toBeHidden()
    })
  })
}
