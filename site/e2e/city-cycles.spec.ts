import { expect, test, type Page } from '@playwright/test'
import { base, waitReady } from './helpers'

/* Three cycles of a city (#6) in a real browser at 390x844 over the fixture dataset (Cidade Exemplo = the Sketch frame figures). */
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
