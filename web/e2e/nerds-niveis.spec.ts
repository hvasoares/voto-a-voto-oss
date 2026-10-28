import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { base } from './helpers'

/*
 * "Dados para nerds" at Brasil and região (#74): one component for the three levels, the breadcrumb and the links down (with JavaScript off), the two entry points on
 * "Brasil e regiões", and the address as the only state.
 */
const int = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
const eleitorado = (file: string) => {
  const shard = JSON.parse(readFileSync(resolve('fixtures/data/nerds', file), 'utf8')) as { columns: string[]; total: number[] }
  return int(shard.total[shard.columns.indexOf('eleitorado')]!)
}
const at = (path: string) => `${base}dados-para-nerds/${path}`

test.describe('Brasil, região and estado from one component', () => {
  const cases = [
    { level: 'brasil', path: '', file: 'brasil/2026-1.json', name: 'Brasil' },
    { level: 'regiao', path: 'regiao/sudeste/', file: 'regiao/sudeste/2026-1.json', name: 'Sudeste' },
    { level: 'estado', path: 'estado/rj/', file: 'uf/rj/2026-1.json', name: 'Rio de Janeiro' },
  ]
  for (const c of cases) {
    test(`${c.level}: the same page structure, the numbers of its own shard`, async ({ page }) => {
      await page.goto(at(c.path))
      await expect(page.locator('[data-page="nerds"]')).toHaveAttribute('data-level', c.level)
      await expect(page.locator('h1')).toHaveText('Dados para nerds')
      await expect(page.locator('[data-subtitle]')).toContainText(`${c.name} · Presidente`)
      await expect(page.locator('[data-how]')).toBeVisible()
      await expect(page.locator('[data-ciclo-block="2026"] [data-stat="eleitorado"] dd[data-turno="1"]')).toHaveAttribute('data-value', eleitorado(c.file))
      expect(await page.locator('[data-ciclo-block="2026"] [data-panel="placar"] [data-panel-footer] dt').allTextContents()).toEqual(['Definição', 'Fonte', 'Cálculo', 'Não mede'])
    })
  }
})

test.describe('breadcrumb and links down work with JavaScript off', () => {
  test.use({ javaScriptEnabled: false })

  test('Brasil -> região -> estado and back up, only by links', async ({ page }) => {
    await page.goto(at(''))
    await expect(page.locator('[data-down] h2')).toHaveText(['Regiões', 'Estados'])
    await page.locator('[data-down] a', { hasText: 'Sudeste' }).click()
    await expect(page).toHaveURL(new RegExp('dados-para-nerds/regiao/sudeste/$'))
    await expect(page.locator('.nerds-crumbs ol li')).toHaveText(['Brasil', 'Sudeste'])
    await expect(page.locator('.nerds-crumbs > a')).toHaveText('‹ Brasil')
    await page.locator('[data-down] a', { hasText: 'Rio de Janeiro' }).click()
    await expect(page).toHaveURL(new RegExp('dados-para-nerds/estado/rj/$'))
    await expect(page.locator('.nerds-crumbs ol li')).toHaveText(['Brasil', 'Sudeste', 'Rio de Janeiro'])
    await page.locator('.nerds-crumbs > a').click()
    await expect(page).toHaveURL(new RegExp('dados-para-nerds/regiao/sudeste/$'))
    await page.locator('.nerds-crumbs ol a', { hasText: 'Brasil' }).click()
    await expect(page).toHaveURL(new RegExp('dados-para-nerds/$'))
  })
})

test.describe('the address is the only state', () => {
  test('the dashboard writes nothing to local or session storage, whatever the address says', async ({ page }) => {
    for (const q of ['', '?ciclo=2022&turno=2&cargo=presidente', '?ciclo=zzz&turno=9']) {
      await page.goto(at(`regiao/sudeste/${q}`))
      await expect(page.locator('[data-page="nerds"]')).toHaveAttribute('data-ready', 'yes')
      expect(await page.evaluate(() => [localStorage.length, sessionStorage.length, document.cookie])).toEqual([0, 0, ''])
    }
  })

  test('the same address always shows the same cycle; the cycle links are permalinks', async ({ page }) => {
    await page.goto(at('?ciclo=2022&turno=1&cargo=presidente'))
    await expect(page.locator('[data-ciclo-block]:visible')).toHaveAttribute('data-ciclo-block', '2022')
    const href = await page.locator('[data-cycle-link="2018"]').getAttribute('href')
    expect(href).toBe('?ciclo=2018&turno=1&cargo=presidente')
    await page.locator('[data-cycle-link="2018"]').click()
    await expect(page.locator('[data-page="nerds"]')).toHaveAttribute('data-ciclo', '2018')
    await expect(page.locator('[data-ciclo-block]:visible')).toHaveAttribute('data-ciclo-block', '2018')
  })
})

test.describe('the entry points on "Brasil e regiões"', () => {
  test('a "Dados para nerds ›" link at the top and a "Dados da região ›" link on each região row, one anchor each', async ({ page }) => {
    await page.goto(`${base}brasil/`)
    const top = page.locator('a[data-link="nerds"]')
    await expect(top).toHaveCount(1)
    expect(await top.getAttribute('href')).toBe(`${base}dados-para-nerds/`)
    await expect(top).toHaveText('Dados para nerds ›')
    const rows = page.locator('[data-regiao]')
    const count = await rows.count()
    expect(count).toBeGreaterThan(0)
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i)
      const key = (await row.getAttribute('data-regiao'))!
      const link = row.locator('a[data-link="nerds-regiao"]')
      await expect(link, key).toHaveCount(1)
      expect(await link.getAttribute('href')).toBe(`${base}dados-para-nerds/regiao/${key}/`)
      await expect(link).toHaveText('Dados da região ›')
    }
    // the existing "Comparar regiões" link is still there, a sibling in the "Próximo" nav
    await expect(page.locator('nav[aria-label="Próximo"] a[data-link="compare"]')).toHaveCount(1)
  })

  test('both links are reachable from the keyboard with a visible focus ring, and open the right level', async ({ page }) => {
    await page.goto(`${base}brasil/`)
    const top = page.locator('a[data-link="nerds"]')
    await top.focus()
    expect(await top.evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe('none')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(new RegExp('dados-para-nerds/$'))
    await page.goBack()
    const region = page.locator('a[data-link="nerds-regiao"]').first()
    await region.focus()
    expect(await region.evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe('none')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(new RegExp('dados-para-nerds/regiao/[a-z-]+/$'))
    await expect(page.locator('[data-page="nerds"]')).toHaveAttribute('data-level', 'regiao')
  })

  test('the top bar is unchanged: no Dados para nerds link there and none on the Home', async ({ page }) => {
    await page.goto(`${base}brasil/`)
    expect(await page.locator('header a, [data-component="top-bar"] a').filter({ hasText: 'nerds' }).count()).toBe(0)
    await page.goto(base)
    expect(await page.locator('a[href*="dados-para-nerds"]').count()).toBe(0)
  })
})
