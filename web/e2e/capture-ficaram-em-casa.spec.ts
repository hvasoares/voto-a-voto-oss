import { test } from '@playwright/test'
import { capture } from './capture'
import { base } from './helpers'
import { DESKTOP } from './presets'

/*
 * Gate 2 of #32: the slot in its fixture state at 390x844 (mosaic and map), next to the Sketch frames "20 Mapa de quem ficou em casa (mosaico)" and
 * "(mapa)" on the page "Election SPA v3", and at 1440x900 (the desktop fragment). Output: .captures/ficaram-em-casa/ (not committed).
 */
const PATH = `${base}mapa/ficaram-em-casa/`
const DIR = 'ficaram-em-casa'

for (const view of ['mosaico', 'mapa'] as const) {
  test(`capture ficaram-em-casa / ${view}`, async ({ page }) => {
    await page.goto(view === 'mapa' ? `${PATH}?vista=mapa` : PATH)
    if (view === 'mapa') await page.getByRole('link', { name: 'Mapa', exact: true }).click()
    if (view === 'mapa') await page.getByRole('img', { name: /^Parcela dos eleitores/ }).waitFor()
    await page.evaluate(() => window.scrollTo(0, 0))
    await capture(page, {
      dir: DIR,
      name: view,
      route: PATH,
      scrollY: 0,
      fullPage: false,
      omit: ['capture'],
      extra: { slot: 'ficaram-em-casa', state: view },
    })
    await capture(page, { dir: DIR, name: `${view}-full`, fullPage: true, sidecar: false, fonts: false })
  })
}

test('capture ficaram-em-casa / desktop', async ({ page }) => {
  await page.setViewportSize(DESKTOP)
  await page.goto(PATH)
  await page.frameLocator('[data-mapa-frame]').locator('svg[data-uf-map]').waitFor()
  await capture(page, { dir: DIR, name: 'desktop', sidecar: false })
})
