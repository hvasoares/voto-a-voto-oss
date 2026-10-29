import { expect, test } from '@playwright/test'
import { base } from './helpers'
import { useNoJs } from './presets'

/*
 * The region page (ticket #183, `/brasil/<regiao>/`) with the committed FIXTURE dataset: Sudeste has two states (RJ, SP), Centro-Oeste one (MT), the other
 * three regions have no data and no page. The page is static HTML with no island, so every check also holds with JavaScript off (the second block).
 * Structure and links only; the numbers are the fixture's own and the real ones are pinned by the unit tests over ../data.
 */

test.describe('region page (fixture build)', () => {
  test('title, count line, one two-candidate bar, the states as rows and the links', async ({ page }) => {
    await page.goto(`${base}brasil/sudeste/`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Região Sudeste')
    await expect(page.locator('[data-region-counts]')).toHaveText('2 estados · 7 municípios')
    await expect(page.locator('[data-region-result] [role="img"]')).toHaveCount(1)
    await expect(page.locator('[data-region-result] [role="img"] span')).toHaveCount(2)
    await expect(page.locator('[data-region-votes]')).toContainText('votos')
    await expect(page.locator('[data-region-states] a')).toHaveCount(2)
    await expect(page.locator('[data-region-states] a[data-uf="rj"]')).toHaveAttribute('href', `${base}rj/`)
    await expect(page.locator('[data-region-states] a[data-uf="sp"]')).toHaveAttribute('href', `${base}sp/`)
    await expect(page.locator('[data-link="nerds-regiao"]')).toHaveAttribute('href', `${base}dados-para-nerds/regiao/sudeste/`)
    await expect(page.locator('[data-link="compare"]')).toHaveText('Comparar regiões ›')
    await expect(page.locator('[data-link="map"]')).toHaveAttribute('href', `${base}mapa/`)
  })

  test('the cards link is not drawn: no region cards route exists yet', async ({ page }) => {
    await page.goto(`${base}brasil/sudeste/`)
    await expect(page.getByRole('link', { name: /Ver os cartões da região/ })).toHaveCount(0)
  })

  test('it counts and does not rank: no winner or reason wording, no "ranking"', async ({ page }) => {
    await page.goto(`${base}brasil/sudeste/`)
    const text = (await page.locator('main').innerText()).toLowerCase()
    expect(text).not.toMatch(/vencedor|venceu|ranking|porque|por causa/)
  })

  test('the shared header is there and the calculation entry opens the fact page of the region', async ({ page }) => {
    await page.goto(`${base}brasil/sudeste/`)
    await expect(page.locator('[data-app-header]')).toHaveCount(1)
    const calc = page.locator('a[data-calc]')
    await expect(calc).toHaveCount(1)
    await calc.click()
    await expect(page).toHaveURL(new RegExp(`${base}fato/regiao/sudeste/2026-2/`))
    await expect(page.locator('#estado-rj')).toHaveCount(1)
    await expect(page.locator('#estado-sp')).toHaveCount(1)
  })

  test('a state row opens the state page', async ({ page }) => {
    await page.goto(`${base}brasil/sudeste/`)
    await page.locator('[data-region-states] a[data-uf="rj"]').click()
    await expect(page).toHaveURL(`${base}rj/`)
  })

  test('each region name on Brasil e regiões links to its page, and "Dados da região" still opens the nerds page', async ({ page }) => {
    await page.goto(`${base}brasil/`)
    await expect(page.locator('[data-regiao="sudeste"] [data-place="regiao"]')).toHaveAttribute('href', `${base}brasil/sudeste/`)
    await expect(page.locator('[data-regiao="centro-oeste"] [data-place="regiao"]')).toHaveAttribute('href', `${base}brasil/centro-oeste/`)
    await expect(page.locator('[data-regiao="sudeste"] [data-link="nerds-regiao"]')).toHaveAttribute('href', `${base}dados-para-nerds/regiao/sudeste/`)
    await page.locator('[data-regiao="sudeste"] [data-place="regiao"]').click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Região Sudeste')
  })

  test('each row and link is a 44 px touch target', async ({ page }) => {
    await page.goto(`${base}brasil/sudeste/`)
    for (const link of await page.locator('[data-region-states] a, [data-link]').all()) {
      const box = (await link.boundingBox())!
      expect(box.height).toBeGreaterThanOrEqual(43.5)
    }
  })
})

test.describe('region page without scripts (fixture build)', () => {
  useNoJs()

  test('every state, the bar and every link are in the page', async ({ page }) => {
    await page.goto(`${base}brasil/centro-oeste/`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Região Centro-Oeste')
    await expect(page.locator('[data-region-counts]')).toHaveText('1 estado · 1 município')
    await expect(page.locator('[data-region-states] a')).toHaveCount(1)
    await expect(page.locator('[data-region-result] [role="img"] span')).toHaveCount(2)
    await expect(page.locator('[data-link="nerds-regiao"]')).toHaveCount(1)
    await expect(page.locator('[data-app-header]')).toHaveCount(1)
  })
})
