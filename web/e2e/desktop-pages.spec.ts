import { expect, test } from '@playwright/test'
import { base, collectRequests, expectNoHorizontalScroll, resizeTo, WIDTHS } from './helpers'

/* Ticket #55: Estado, Três ciclos (cidade) and Três ciclos por estado on desktop. Fixture dataset (rj, sp, mt). */
const SCREENS = {
  estado: `${base}rj/`,
  'três ciclos (cidade)': `${base}rj/cidade-exemplo/tres-ciclos/`,
  'três ciclos por estado': `${base}tres-ciclos/rj/`,
} as const

for (const [name, url] of Object.entries(SCREENS)) {
  test.describe(name, () => {
    for (const width of WIDTHS) {
      test(`at ${width} px does not scroll sideways`, async ({ page }) => {
        await resizeTo(page, width)
        await page.goto(url)
        await expectNoHorizontalScroll(page)
      })
    }

    test('at 1440 and 768 the content is one centered column of about 720 px', async ({ page }) => {
      for (const width of [768, 1440]) {
        await resizeTo(page, width)
        await page.goto(url)
        const h1 = (await page.locator('h1').boundingBox())!
        const main = (await page.locator('#main').boundingBox())!
        expect(main.width).toBeLessThanOrEqual(760)
        expect(Math.abs(main.x * 2 + main.width - width)).toBeLessThanOrEqual(2)
        expect(h1.x).toBeGreaterThanOrEqual(main.x)
      }
    })

    test('at 1440 the top bar replaces the page header', async ({ page }) => {
      await page.goto(url)
      await expect(page.locator('[data-component="top-bar"]')).toBeVisible()
      await expect(page.locator('.app-header')).toBeHidden()
    })

    test('a phone does not fetch the desktop module', async ({ page }) => {
      const seen = collectRequests(page)
      await resizeTo(page, 390)
      await page.goto(url)
      await page.waitForLoadState('networkidle')
      expect(seen.filter((r) => /desktop-shell|topbar-search/.test(r.url))).toEqual([])
    })
  })
}

test.describe('Estado: the municipality map slot', () => {
  const MAP_CODE = /CityMapMap/

  test('at 1440 it loads only when scrolled into view', async ({ page }) => {
    const seen = collectRequests(page)
    await page.setViewportSize({ width: 1440, height: 160 }) // the slot starts below the fold
    await page.goto(SCREENS.estado)
    await page.waitForLoadState('networkidle')
    expect(seen.filter((r) => MAP_CODE.test(r.url))).toEqual([])
    await page.locator('[data-map-area]').scrollIntoViewIfNeeded()
    await expect.poll(() => seen.filter((r) => MAP_CODE.test(r.url)).length).toBeGreaterThan(0)
  })

  for (const width of [390, 768, 1023]) {
    test(`at ${width} px it does not load by scrolling (a phone downloads nothing until a tap)`, async ({ page }) => {
      const seen = collectRequests(page)
      await page.setViewportSize({ width, height: 600 })
      await page.goto(SCREENS.estado)
      await page.locator('[data-map-area]').scrollIntoViewIfNeeded()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(300)
      expect(seen.filter((r) => MAP_CODE.test(r.url))).toEqual([])
    })
  }

  test('without scripts the page shows the municipality list and its links', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false })
    const page = await context.newPage()
    await page.goto(SCREENS.estado)
    await expect(page.locator('[data-map-area] nav a[data-cd]')).toHaveCount(6)
    await expect(page.locator('[data-map-area] nav a[data-cd]').first()).toHaveAttribute('href', /\/rj\/cidade-exemplo/)
    await context.close()
  })
})

test.describe('bars carry their printed values (no meaning by colour alone)', () => {
  test('Três ciclos (cidade): every bar segment prints its percentage', async ({ page }) => {
    await page.goto(SCREENS['três ciclos (cidade)'])
    const segs = await page.locator('.cycle .bar__seg:not(.bar__seg--empty)').allInnerTexts()
    expect(segs.length).toBeGreaterThan(5)
    for (const text of segs) expect(text).toMatch(/\d|Br|Nu/)
    for (const text of await page.locator('.cycle .bar__seg--a, .cycle .bar__seg--b').allInnerTexts()) expect(text).toMatch(/\d+%/)
  })

  test('Três ciclos por estado: every bar prints its label and percentage, and the mini rows print theirs', async ({ page }) => {
    await page.goto(SCREENS['três ciclos por estado'])
    for (const bar of await page.locator('[data-component="cycles"] [role="img"]').all()) expect(await bar.innerText()).toMatch(/\d+,\d%/)
    for (const t of await page.locator('[data-mini-pcts] > div').allInnerTexts()) expect(t).toMatch(/\d+,\d%|sem dados/)
    const bars = await page.locator('[data-component="cycles"] [role="img"]').first().getAttribute('aria-label')
    expect(bars).toMatch(/dos votos válidos/)
  })

  test('Três ciclos por estado at 1440: "Outros estados" has one column per cycle', async ({ page }) => {
    await page.goto(SCREENS['três ciclos por estado'])
    const row = page.locator('[data-component="outros-estados"] li').nth(1)
    const xs = await row.locator('[data-mini-pcts] > div').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().x)))
    expect(new Set(xs).size).toBe(3)
    expect(xs).toEqual([...xs].sort((a, b) => a - b))
  })
})
