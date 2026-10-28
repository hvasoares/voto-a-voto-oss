import { expect, test, type Page } from '@playwright/test'
import { base, waitReady } from './helpers'

/*
 * #84: one colour pair for the two runoff candidates on every screen. In the fixture build the candidates are "Candidato A" and
 * "Candidato B" (the pair by election order): the City card, its legend, the three-cycle page and /brasil/ draw them in the SAME red
 * and blue, and every segment still carries its name and number in text (colour is never the only cue). The words themselves are
 * pinned by src/shared/candidates.test.ts over the real names.
 */
const RED = 'rgb(176, 43, 39)'
const BLUE = 'rgb(12, 84, 160)'
const bg = (page: Page, selector: string) => page.locator(selector).first().evaluate((el) => getComputedStyle(el).backgroundColor)

test.describe('candidate identity: one red/blue pair on every screen', () => {
  test('the City card: bars and legend swatches wear the pair, with the names in text', async ({ page }) => {
    await page.goto(`${base}rj/cidade-exemplo/?turno=1`)
    await waitReady(page)
    expect(await bg(page, '[data-city-card] .bar__seg--a')).toBe(RED)
    expect(await bg(page, '[data-city-card] .bar__seg--b')).toBe(BLUE)
    expect(await bg(page, '[data-city-card] .legend__swatch--a')).toBe(RED)
    expect(await bg(page, '[data-city-card] .legend__swatch--b')).toBe(BLUE)
    await expect(page.locator('[data-city-card] .bar__seg--a').first()).toContainText('Candidato A')
    await expect(page.locator('[data-city-card] .bar__seg--b').first()).toContainText('Candidato B')
  })

  test('the three-cycle page draws the same pair, in the same words', async ({ page }) => {
    await page.goto(`${base}rj/cidade-exemplo/tres-ciclos/`)
    await waitReady(page)
    const cycle = page.locator('.cycle[data-ano="2026"]')
    expect(await bg(page, '.cycle[data-ano="2026"] .bar__seg--a')).toBe(RED)
    expect(await bg(page, '.cycle[data-ano="2026"] .bar__seg--b')).toBe(BLUE)
    await expect(cycle.locator('.bar__seg--a').first()).toContainText('Candidato A')
    await expect(page.getByText('em vermelho; o outro, em azul')).toBeVisible()
  })

  test('/brasil/ draws the candidate with the lower number in the same red and the other in the same blue', async ({ page }) => {
    await page.goto(`${base}brasil/`)
    const segs = page.locator('[data-brasil-bar] > span')
    expect(await segs.nth(0).evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(RED)
    expect(await segs.nth(1).evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(BLUE)
  })
})
