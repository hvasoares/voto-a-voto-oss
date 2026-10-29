import { expect, test } from '@playwright/test'
import { base, collectRequests } from './helpers'
import { DESKTOP, noJs } from './presets'

/* The sentence highlight of the three-cycles page (#62), 1440x900: one island, loaded for 1024 px and up; every highlighted value is readable by keyboard and touch. */
const page_ = `${base}tres-ciclos/rj/`

test.describe('desktop: sentence to data', () => {
  test('is the one island of the page and loads only from 1024 px', async ({ page }) => {
    const seen = collectRequests(page)
    await page.goto(page_)
    await expect(page.locator('[data-fact-highlight]')).toBeVisible()
    expect(seen.some((r) => /FactHighlight/.test(r.url))).toBe(true)
    expect(await page.locator('astro-island[client="media"]').count()).toBe(1)
    await expect(page.locator('astro-island[client="media"]')).toHaveAttribute('opts', /\(min-width: 1024px\)/)
  })

  test('clicking a sentence lights the matching bar segment and table cell, with the calculation beside it', async ({ page }) => {
    await page.goto(page_)
    const sentence = page.locator('[data-fact-sentence="2022-variacao"]')
    await sentence.click()
    await expect(sentence).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('[data-seg="2022-a"]')).toHaveCSS('outline-style', 'solid')
    await expect(page.locator('[data-seg="2022-b"]')).toHaveCSS('outline-style', 'none')
    await expect(page.locator('[data-cell="2022-a"]')).toHaveCSS('font-weight', '700')
    const calc = page.locator('[data-fact-calc]')
    await expect(calc).toContainText('Destacado:')
    await expect(calc).toContainText('votos da linha ÷ votos válidos × 100')
    await expect(calc).toContainText('÷')
    await expect(calc.getByRole('link', { name: 'De onde vem este número? ›' })).toHaveAttribute('href', `${base}fato/estado/rj/tres-ciclos/#2022-a`)
  })

  test('the change lights the left segment of its cycle and its cell', async ({ page }) => {
    await page.goto(page_)
    await page.locator('[data-fact-sentence="2022-variacao"]').click()
    await expect(page.locator('[data-seg="2022-a"]')).toHaveCSS('outline-style', 'solid')
    await expect(page.locator('[data-cell="2022-variacao"]')).toHaveCSS('font-weight', '700')
  })

  test('works from the keyboard: Tab reaches the sentences, Enter lights, the calculation is announced, Escape clears', async ({ page }) => {
    await page.goto(page_)
    const first = page.locator('[data-fact-sentence]').first()
    await first.focus()
    await page.keyboard.press('Enter')
    await expect(first).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('[data-fact-calc]')).toHaveAttribute('aria-live', 'polite')
    await expect(page.locator('[data-fact-calc]')).toContainText('Destacado:')
    await page.keyboard.press('Escape')
    await expect(first).toHaveAttribute('aria-pressed', 'false')
    await expect(page.locator('[data-fact-calc]')).toBeEmpty()
  })

  test('works by touch (a tap) and the buttons are at least 44 px tall', async ({ browser, baseURL }) => {
    const ctx = await browser.newContext({ viewport: DESKTOP, hasTouch: true, baseURL })
    const page = await ctx.newPage()
    await page.goto(page_)
    const first = page.locator('[data-fact-sentence]').first()
    expect((await first.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    await first.tap()
    await expect(first).toHaveAttribute('aria-pressed', 'true')
    await ctx.close()
  })

  test('the page without the island still has the links and the seal (the records stay readable)', async ({ browser, baseURL }) => {
    const ctx = await browser.newContext({ viewport: DESKTOP, ...noJs(), baseURL })
    const page = await ctx.newPage()
    await page.goto(page_)
    await expect(page.locator('a.calc').first()).toBeVisible()
    await expect(page.locator('[data-seal]')).toBeVisible()
    await ctx.close()
  })
})
