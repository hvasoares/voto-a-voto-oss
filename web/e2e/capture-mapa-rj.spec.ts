import { existsSync } from 'node:fs'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { base } from './helpers'

/*
 * Gate captures of /mapa/rj/ (ticket #16), at 390x844 on the REAL dataset: the list (the mosaic
 * equivalent), the map view and the selected-city panel. Run with
 *   DATA_DIR=../data npx playwright test --project=capture capture-mapa-rj
 * and review next to site/reference/10-mapa-por-estado-mosaico.png. Output: .captures/mapa-rj/
 * (not committed, no baselines). Skipped without ../data.
 */
test.skip(process.env.DATA_DIR === undefined || !existsSync(resolve(process.env.DATA_DIR, 'cities.csv')), 'run with DATA_DIR=../data')

const dir = resolve('.captures', 'mapa-rj')
const record = async (page: import('@playwright/test').Page, state: string, url: string) =>
  writeFileSync(
    resolve(dir, `${state}.json`),
    JSON.stringify({ slot: 'city-map', state, route: url, viewport: page.viewportSize(), scrollY: await page.evaluate(() => window.scrollY), fullPage: false, reference: 'site/reference/10-mapa-por-estado-mosaico.png' }, null, 2) + '\n',
  )

test('capture mapa-rj / lista (default view, Rio selected in the panel)', async ({ page }) => {
  const url = `${base}mapa/rj/`
  await page.goto(url)
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(() => window.scrollTo(0, 0))
  const file = resolve(dir, 'lista.png')
  await page.screenshot({ path: file, animations: 'disabled', fullPage: false })
  await record(page, 'lista', url)
})

test('capture mapa-rj / mapa (map view, mesh fetched on demand)', async ({ page }) => {
  const url = `${base}mapa/rj/?vista=mapa`
  await page.goto(url)
  await page.locator('[data-slot="mapa-municipios"]').waitFor()
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(() => window.scrollTo(0, 0))
  const file = resolve(dir, 'mapa.png')
  await page.screenshot({ path: file, animations: 'disabled', fullPage: false })
  await record(page, 'mapa', url)
})

test('capture mapa-rj / selecionado (panel after tapping Campos dos Goytacazes)', async ({ page }) => {
  const url = `${base}mapa/rj/`
  await page.goto(url)
  await page.evaluate(() => document.fonts.ready)
  await page.locator('a[data-cd-ibge="3301009"]').click()
  await expect(page.locator('[data-slot="mapa-selecionado"]')).toContainText('Campos dos Goytacazes')
  await page.evaluate(() => document.querySelector('[data-slot="mapa-selecionado"]')!.scrollIntoView({ block: 'start' }))
  const file = resolve(dir, 'selecionado.png')
  await page.screenshot({ path: file, animations: 'disabled', fullPage: false })
  await record(page, 'selecionado', url)
})