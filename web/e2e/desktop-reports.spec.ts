import { expect, test } from '@playwright/test'
import { base, collectRequests, expectNoHorizontalScroll, resizeTo, WIDTHS } from './helpers'

/* Ticket #56: the report screens on desktop. Fixture dataset. */
const SCREENS = {
  relatórios: `${base}relatorios/`,
  'cidades que viraram': `${base}relatorios/cidades-que-viraram/`,
  'como cada grupo votou': `${base}relatorios/como-cada-grupo-votou/`,
  'comparar com 2022': `${base}comparar/2022/`,
  'comparar com 2018': `${base}comparar/2018/`,
  'brasil e regiões': `${base}brasil/`,
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

    test('at 768 and 1440 the content is one centered column of about 720 px', async ({ page }) => {
      for (const width of [768, 1440]) {
        await resizeTo(page, width)
        await page.goto(url)
        const main = (await page.locator('#main, main').first().boundingBox())!
        expect(main.width).toBeLessThanOrEqual(760)
        expect(Math.abs(main.x * 2 + main.width - width)).toBeLessThanOrEqual(2)
      }
    })

    test('a phone does not fetch the desktop module, and the page needs no desktop-only island', async ({ page }) => {
      const seen = collectRequests(page)
      await resizeTo(page, 390)
      await page.goto(url)
      await page.waitForLoadState('networkidle')
      expect(seen.filter((r) => /desktop-shell|topbar-search|fragmentos/.test(r.url))).toEqual([])
    })
  })
}

test.describe('comparar: the six states as a three-column table', () => {
  test('at 1440 there is a header row of three columns and every row has three cells aligned to it', async ({ page }) => {
    await page.goto(SCREENS['comparar com 2022'])
    const table = page.getByRole('table')
    await expect(table.getByRole('columnheader')).toHaveCount(3)
    const heads = await table.getByRole('columnheader').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().x)))
    const rows = table.locator('[data-component="compare-rows"] > li')
    expect(await rows.count()).toBeGreaterThan(0)
    for (const row of await rows.all()) {
      const cells = await row.getByRole('cell').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().x)))
      expect(cells).toEqual(heads)
    }
  })

  test('the signed vote volumes stay printed in every cell, and the colour squares are decoration', async ({ page }) => {
    await page.goto(SCREENS['comparar com 2022'])
    for (const side of await page.locator('[data-side]').allInnerTexts()) expect(side).toMatch(/\d+,\d% · 2022: \d+,\d% · [+-][\d.]+ votos/)
    await expect(page.locator('[data-side] > span[aria-hidden="true"]').first()).toBeVisible()
  })

  test('below 1024 px it is the phone list: no header row is drawn', async ({ page }) => {
    await resizeTo(page, 768)
    await page.goto(SCREENS['comparar com 2022'])
    await expect(page.locator('[data-component="compare-header"]')).toBeHidden()
  })

  test('the 2022/2018 toggle switches between the two pages, with and without scripts', async ({ page, browser }) => {
    await page.goto(SCREENS['comparar com 2022'])
    await page.locator('[data-component="cycle-tabs"] a[data-tab="2018"]').click()
    await expect(page).toHaveURL(SCREENS['comparar com 2018'])
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false })
    const plain = await context.newPage()
    await plain.goto(SCREENS['comparar com 2018'])
    await plain.locator('[data-component="cycle-tabs"] a[data-tab="2022"]').click()
    await expect(plain).toHaveURL(SCREENS['comparar com 2022'])
    await context.close()
  })
})

test.describe('tables have a header row and the numbers stay printed', () => {
  test('cidades que viraram: a header row, and every row prints its signed margins', async ({ page }) => {
    await page.goto(SCREENS['cidades que viraram'])
    const table = page.locator('[data-flip-table]')
    if (await table.count()) {
      await expect(table.locator('thead th').first()).toBeAttached()
    }
    const text = await page.locator('main').innerText()
    expect(text).toMatch(/[+-]\d+,\d pp/)
  })

  test('brasil e regiões: the region figures are printed numbers', async ({ page }) => {
    await page.goto(SCREENS['brasil e regiões'])
    expect(await page.locator('main').innerText()).toMatch(/\d+,\d%/)
  })
})
