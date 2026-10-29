import { expect, test } from '@playwright/test'
import { capture } from './capture'
import { base } from './helpers'
import { dataGuard } from './presets'

/*
 * Gate captures of /mapa/rj/ (ticket #16), at 390x844 on the REAL dataset: the list (the mosaic
 * equivalent), the map view and the selected-city panel. Run with
 *   DATA_DIR=../data npx playwright test --project=capture capture-mapa-rj
 * and review next to site/reference/10-mapa-por-estado-mosaico.png. Output: .captures/mapa-rj/
 * (not committed, no baselines). Skipped without ../data.
 */
test.skip(...dataGuard('cities.csv', process.env.DATA_DIR ?? null))

const record = (page: import('@playwright/test').Page, state: string, url: string) =>
  capture(page, {
    dir: 'mapa-rj',
    name: state,
    route: url,
    scrollY: 'page',
    fullPage: false,
    omit: ['capture'],
    extra: { slot: 'city-map', state, reference: 'site/reference/10-mapa-por-estado-mosaico.png' },
  })

test('capture mapa-rj / lista (default view, Rio selected in the panel)', async ({ page }) => {
  const url = `${base}mapa/rj/`
  await page.goto(url)
  await page.evaluate(() => window.scrollTo(0, 0))
  await record(page, 'lista', url)
})

test('capture mapa-rj / mapa (map view, mesh fetched on demand)', async ({ page }) => {
  const url = `${base}mapa/rj/?vista=mapa`
  await page.goto(url)
  await page.locator('[data-slot="mapa-municipios"]').waitFor()
  await page.evaluate(() => window.scrollTo(0, 0))
  await record(page, 'mapa', url)
})

test('capture mapa-rj / selecionado (map view, panel after tapping the Campos dos Goytacazes shape)', async ({ page }) => {
  const url = `${base}mapa/rj/?vista=mapa`
  await page.goto(url)
  await page.locator('[data-slot="mapa-municipios"] a[data-cd-ibge="3301009"]').dispatchEvent('click')
  await expect(page.locator('[data-slot="mapa-selecionado"]')).toContainText('Campos dos Goytacazes')
  await page.evaluate(() => document.querySelector('[data-slot="mapa-selecionado"]')!.scrollIntoView({ block: 'start' }))
  await record(page, 'selecionado', url)
})
