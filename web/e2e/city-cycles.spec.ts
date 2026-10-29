import { expect, test, type Page } from '@playwright/test'
import { base, collectRequests, waitReady } from './helpers'
import { PHONE, noJs } from './presets'

/*
 * Three cycles of a city (the approved Sketch frame "9 Três ciclos (cidade)", ported by #50) in a
 * real browser at 390x844 over the fixture dataset (Cidade Exemplo = the frame figures). Both rounds
 * of all three cycles are pre-rendered; the script shows one round and switches without a request.
 */
const page9 = `${base}rj/cidade-exemplo/tres-ciclos/`
const visible = (page: Page) => page.locator('.cycles__round:not([hidden])')
const shown = async (page: Page) => (await visible(page).innerText()).replace(/\s+/g, ' ')

test.describe('city-cycles: fixture route is the frame', () => {
  test('?turno=1 shows round 1 only, with the numbers of the Sketch frame', async ({ page }) => {
    await page.goto(`${page9}?turno=1`)
    await waitReady(page)
    await expect(page.locator('h1')).toHaveText('Três ciclos')
    await expect(visible(page)).toHaveCount(1)
    const t = await shown(page)
    expect(t).toContain('Presidente 2018, 2022 e 2026 · Cidade Exemplo (1º turno)')
    expect(t).toContain('Votaram 79% do eleitorado (barra: % dos votos)')
    expect(t).toContain('A 55% B 45%')
    expect(t).toContain('Abstenção 78%')
    await expect(page.locator('.banner')).toContainText('DADOS FICTÍCIOS')
  })

  test('without a query the default round (2) is shown', async ({ page }) => {
    await page.goto(page9)
    await waitReady(page)
    expect(await shown(page)).toContain('(2º turno)')
  })

  test('three blocks of the same height, with or without data', async ({ page }) => {
    await page.goto(`${base}mt/boa-esperanca-do-norte/tres-ciclos/`)
    await waitReady(page)
    const heights = await visible(page).locator('.cycle').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)))
    expect(heights).toHaveLength(3)
    expect(new Set(heights).size).toBe(1)
    await expect(visible(page).locator('[data-nodata]')).toHaveCount(2)
  })
})

test.describe('city-cycles: round switch', () => {
  test('the switch link changes the round without any request, updates the address, back works', async ({ page }) => {
    await page.goto(`${page9}?turno=1`)
    await waitReady(page)
    await page.waitForLoadState('networkidle')
    const seen = collectRequests(page)
    const sw = page.locator('[data-switch]')
    await expect(sw).toHaveText('Ver o 2º turno ›')
    await expect(sw).toHaveAttribute('href', `${page9}?turno=2`)
    await sw.click()
    await expect(page).toHaveURL(`${page9}?turno=2`)
    expect(await shown(page)).toContain('(2º turno)')
    await expect(sw).toHaveText('Ver o 1º turno ›')
    await page.goBack()
    await expect(page).toHaveURL(`${page9}?turno=1`)
    expect(await shown(page)).toContain('(1º turno)')
    expect(seen).toEqual([])
  })
})

test.describe('city-cycles: without JavaScript', () => {
  test('all three cycles of both rounds are in the page, stacked, and the useless switch link is hidden', async ({ browser, baseURL }) => {
    const ctx = await browser.newContext({ ...noJs(), baseURL, viewport: PHONE })
    const page = await ctx.newPage()
    await page.goto(page9)
    await expect(page.locator('.cycles__round:visible')).toHaveCount(2)
    await expect(page.locator('.cycle:visible')).toHaveCount(6)
    await expect(page.locator('[data-switch]')).toBeHidden()
    const t = (await page.locator('main').innerText()).replace(/\s+/g, ' ')
    expect(t).toContain('(1º turno)')
    expect(t).toContain('(2º turno)')
    await expect(page.getByRole('link', { name: 'Cartão da cidade' })).toBeVisible()
    await ctx.close()
  })
})

test('no horizontal scroll at 390 px', async ({ page }) => {
  await page.goto(page9)
  await waitReady(page)
  const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
  expect(sw).toBeLessThanOrEqual(iw)
})