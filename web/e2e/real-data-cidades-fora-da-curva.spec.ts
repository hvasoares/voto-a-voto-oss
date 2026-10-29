import { expect, test } from '@playwright/test'
import { base } from './helpers'
import { dataGuard } from './presets'
import { catalogText, citiesWithValidVotes, int, latestRound } from './real-data-oracle'

/*
 * "Cidades fora da curva" (#34) on the REAL dataset (run with `npm run test:real`). The method is pinned by src/lib/reports/outliers.test.ts; these are the shape of the
 * list the real data gives and the first cities of the default list (a regression pin of the ranking, not a claim about any city).
 */
test.skip(...dataGuard())

const PATH = `${base}relatorios/cidades-fora-da-curva/`
/** The cities of the default list's filter: 5 mil or more valid votes in the newest round (every one has peers, so all are compared). */
const compared = () => int(citiesWithValidVotes(latestRound(), 5_000))

test.describe('Cidades fora da curva on the real dataset', () => {
  test('the default list: the screening text first, 25 cities of 5 mil+ valid votes in decreasing distance, each with its volume, its card and its record', async ({ page }) => {
    await page.goto(PATH)
    await expect(page.locator('[data-screening]')).toHaveText(catalogText('outlier.screening'))
    const items = page.locator('[data-outliers] > li')
    await expect(items).toHaveCount(25)
    await expect(page.locator('[data-count]')).toContainText(catalogText('outlier.count', { shown: 25, compared: compared(), min: catalogText('outlier.min.k', { n: 5 }), where: catalogText('outlier.where.all') }))
    const valid = await items.evaluateAll((els) => els.map((e) => Number(/([\d.]+) votos válidos/.exec(e.textContent ?? '')![1]!.replace(/\./g, ''))))
    for (const v of valid) expect(v).toBeGreaterThanOrEqual(5_000)
    await expect(items.nth(0)).toContainText('Itaubal/AP')
    await expect(items.nth(0)).toContainText('59,0% (típico 82,2%)')
    await expect(items.nth(1)).toContainText('Marechal Thaumaturgo/AC')
    await expect(items.nth(2)).toContainText('Iracema/RR')
    await expect(items.nth(0).locator('a').first()).toHaveAttribute('href', `${base}ap/itaubal/`)
  })

  test('a state and a bigger minimum filter the ranking: only that state, only cities above the minimum', async ({ page }) => {
    await page.goto(`${PATH}mg/50000/`)
    const items = page.locator('[data-outliers] > li')
    expect(await items.count()).toBeGreaterThan(0)
    const hrefs = await items.evaluateAll((els) => els.map((e) => e.querySelector('a')!.getAttribute('href')!))
    for (const h of hrefs) expect(h).toContain(`${base}mg/`)
    const valid = await items.evaluateAll((els) => els.map((e) => Number(/([\d.]+) votos válidos/.exec(e.textContent ?? '')![1]!.replace(/\./g, ''))))
    for (const v of valid) expect(v).toBeGreaterThanOrEqual(50_000)
  })

  test('the hub row says how many cities the default list compared', async ({ page }) => {
    await page.goto(`${base}relatorios/`)
    await expect(page.locator('[data-report="cidades-fora-da-curva"]')).toContainText(`Lista de triagem: ${compared()} cidades comparadas com cidades parecidas`)
  })

  test('a record page has the five peers and the calculation, for a city of the default list', async ({ page }) => {
    await page.goto(`${base}fato/relatorios/cidades-fora-da-curva/ap/`)
    const record = page.locator('#ap-itaubal')
    await expect(record).toContainText(catalogText('fact.in.peer', { n: 5 }))
    await expect(record).toContainText('mediana de 5 cidades parecidas')
  })
})
