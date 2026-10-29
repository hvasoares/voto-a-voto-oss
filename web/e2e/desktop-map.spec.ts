import { expect, test } from '@playwright/test'
import { base, collectRequests, expectNoHorizontalScroll, hoverState, mapFrame, resizeTo } from './helpers'
import { useNoJs } from './presets'

/*
 * Ticket #53: the SVG state map on Home at 1024 px and up. Fixture dataset: states rj, sp and mt have pages.
 * Delivery: the inline SVG added ~5 KB gzip to the phone's Home HTML (over the 2 KB budget set after the first measurement), so
 * the map is a fragment document in a lazy iframe that is only drawn from 1024 px up (docs/checkpoints/issue-53.md).
 */
const WITH_PAGE = ['mt', 'rj', 'sp']

test.describe('Home map', () => {
  test('draws one shape per state, matched by code: 27, no extra, no overseas', async ({ page }) => {
    await page.goto(base)
    const codes = await mapFrame(page).locator('[data-map-uf]').evaluateAll((els) => els.map((e) => e.getAttribute('data-map-uf')).sort())
    expect(codes).toHaveLength(27)
    expect(new Set(codes).size).toBe(27)
    expect(codes).not.toContain('zz')
    expect(codes).toEqual(expect.arrayContaining(['ac', 'ro', 'rs', 'df', 'se']))
  })

  test('every state of the dataset is a link to its page with a title and a text label; the others are drawn, not linked', async ({ page }) => {
    await page.goto(base)
    const frame = mapFrame(page)
    expect(await frame.locator('a').evaluateAll((els) => els.map((e) => e.getAttribute('data-map-uf')).sort())).toEqual(WITH_PAGE)
    for (const uf of WITH_PAGE) {
      const link = frame.locator(`a[data-map-uf="${uf}"]`)
      await expect(link).toHaveAttribute('href', `${base}${uf}/`)
      await expect(link.locator('title')).not.toBeEmpty()
      await expect(link.locator('text')).toHaveText(uf.toUpperCase())
    }
    await expect(frame.locator('a[data-map-uf="rj"]')).toHaveAttribute('aria-label', 'RJ · Rio de Janeiro')
    await expect(frame.locator('g[data-map-uf="ac"]')).toHaveAttribute('aria-disabled', 'true')
    await expect(page.locator('[data-uf-map-frame]')).toHaveAttribute('title', /Mapa do Brasil por estado/)
  })

  test.describe('without JavaScript', () => {
    useNoJs()
    test('at 1440 the map draws and every state link works', async ({ page }) => {
      await page.goto(base)
      await expect(page.locator('[data-uf-map-frame]')).toBeVisible()
      await expect(page.locator('[data-uf-grid]')).toBeHidden()
      const frame = mapFrame(page)
      await expect(frame.getByRole('link', { name: /RJ · Rio de Janeiro/ })).toHaveAttribute('href', `${base}rj/`)
      await expect(frame.locator('path').first()).toBeVisible()
      await frame.getByRole('link', { name: /SP · São Paulo/ }).click()
      await expect(page).toHaveURL(`${base}sp/`) // the link opens in the page, not inside the frame
    })
  })

  test('the small coastal states and Acre are named outside the map, with a key square and a leader line', async ({ page }) => {
    await page.goto(base)
    const frame = mapFrame(page)
    for (const uf of ['ce', 'rn', 'pb', 'pe', 'al', 'se', 'df', 'es', 'rj', 'sc', 'ac']) {
      const shape = frame.locator(`[data-map-uf="${uf}"]`)
      await expect(shape.locator('rect')).toHaveCount(1)
      await expect(shape.locator('line')).toHaveCount(1)
    }
    await expect(frame.locator('[data-map-uf="mg"] rect')).toHaveCount(0)
  })

  test('hover is CSS only and focus is visible: keyboard focus draws a 2.5 px accent outline on the state', async ({ page }) => {
    await page.goto(base)
    const frame = mapFrame(page)
    await frame.locator('a[data-map-uf="mt"]').focus()
    await expect(frame.locator('a[data-map-uf="mt"]')).toBeFocused()
    expect(await frame.locator('a[data-map-uf="mt"] path').evaluate((el) => getComputedStyle(el).strokeWidth)).toBe('2.5px')
    await page.mouse.move(5, 5)
    const idle = await frame.locator('a[data-map-uf="sp"] path').evaluate((el) => getComputedStyle(el).fill)
    await hoverState(page, 'sp')
    expect(await frame.locator('a[data-map-uf="sp"] path').evaluate((el) => getComputedStyle(el).fill)).not.toBe(idle)
  })

  test('the map document has no script and no request leaves the site', async ({ page, baseURL }) => {
    const seen = collectRequests(page)
    await page.goto(base)
    await page.waitForLoadState('networkidle')
    const fragment = seen.find((r) => r.url.includes('/fragmentos/mapa-uf/'))
    expect(fragment).toBeDefined()
    const html = await (await page.request.get(`${base}fragmentos/mapa-uf/`)).text()
    expect(html).not.toMatch(/<script/)
    expect(html).toMatch(/name="robots" content="noindex"/)
    expect(seen.every((r) => r.url.startsWith(baseURL!) || r.url.startsWith('data:'))).toBe(true)
  })
})

test.describe('breakpoints', () => {
  for (const width of [768, 1023]) {
    test(`at ${width} px the tile grid is shown and the map is not`, async ({ page }) => {
      await resizeTo(page, width)
      await page.goto(base)
      await expect(page.locator('[data-uf-grid]')).toBeVisible()
      await expect(page.locator('[data-uf-map-frame]')).toBeHidden()
      await expectNoHorizontalScroll(page)
    })
  }
  for (const width of [1024, 1440]) {
    test(`at ${width} px the map is shown instead of the tile grid, without sideways scroll`, async ({ page }) => {
      await resizeTo(page, width)
      await page.goto(base)
      await expect(page.locator('[data-uf-map-frame]')).toBeVisible()
      await expect(page.locator('[data-uf-grid]')).toBeHidden()
      await expectNoHorizontalScroll(page)
      const box = await page.locator('[data-uf-map-frame]').boundingBox()
      expect(box!.x + box!.width).toBeLessThanOrEqual(width)
    })
  }
})

test.describe('phone cost', () => {
  test('a phone and a tablet never request the map document', async ({ page }) => {
    for (const width of [390, 768, 1023]) {
      const seen = collectRequests(page)
      await resizeTo(page, width)
      await page.goto(base)
      await page.waitForLoadState('networkidle')
      expect(seen.filter((r) => /fragmentos/.test(r.url))).toEqual([])
    }
  })

  test('the Home HTML a phone downloads carries no map: no path data, no outline numbers', async ({ page }) => {
    const html = await (await page.request.get(base)).text()
    expect(html).not.toMatch(/<path d="M[\d.]+ [\d.]+l/)
    expect(html).not.toContain('data-uf-map ')
  })
})
