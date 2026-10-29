import { expect, test } from '@playwright/test'
import { base } from './helpers'
import { viewport, dataGuard } from './presets'

/*
 * The widget (#29) on the REAL dataset: the cities with the longest generated sentences (name plus headline, found over all 5,760 cities)
 * must fit the snippet's height with no scrollbar at 320 and 390 px, and the two cities of the Sketch frames' wording are in the data.
 */
test.skip(...dataGuard())

const LONGEST = ['pi/sao-francisco-de-assis-do-piaui', 'mg/sao-sebastiao-da-vargem-alegre', 'pb/sao-sebastiao-de-lagoa-de-roca', 'zz/santa-cruz-de-la-sierra', 'mg/santa-barbara-do-monte-verde', 'sp/sao-paulo']
const HEIGHT = 200

for (const width of [320, 390])
  test(`the longest sentences of the real data fit a ${width} px widget with no scrollbar`, async ({ page }) => {
    await page.setViewportSize(viewport(width, 900))
    const worst: Record<string, number> = {}
    for (const city of LONGEST) {
      await page.goto(`${base}embed/${city}/`)
      const m = await page.evaluate(() => {
        const d = document.documentElement
        return { content: Math.ceil(document.querySelector('[data-widget]')!.getBoundingClientRect().height), sw: d.scrollWidth, cw: d.clientWidth }
      })
      worst[city] = m.content
      expect(m.sw, city).toBeLessThanOrEqual(m.cw)
      expect(m.content, `${city} needs ${m.content}px`).toBeLessThanOrEqual(HEIGHT)
    }
    console.log(`widget ${width}px, content heights`, JSON.stringify(worst))
  })
