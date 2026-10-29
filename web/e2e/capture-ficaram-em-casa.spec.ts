import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from '@playwright/test'
import { base } from './helpers'
import { DESKTOP } from './presets'

/*
 * Gate 2 of #32: the slot in its fixture state at 390x844 (mosaic and map), next to the Sketch frames "20 Mapa de quem ficou em casa (mosaico)" and
 * "(mapa)" on the page "Election SPA v3", and at 1440x900 (the desktop fragment). Output: .captures/ficaram-em-casa/ (not committed).
 */
const PATH = `${base}mapa/ficaram-em-casa/`
const out = (name: string) => {
  const dir = resolve('.captures', 'ficaram-em-casa')
  mkdirSync(dir, { recursive: true })
  return { file: resolve(dir, `${name}.png`), meta: resolve(dir, `${name}.json`) }
}

for (const view of ['mosaico', 'mapa'] as const) {
  test(`capture ficaram-em-casa / ${view}`, async ({ page }) => {
    await page.goto(view === 'mapa' ? `${PATH}?vista=mapa` : PATH)
    await page.evaluate(() => document.fonts.ready)
    if (view === 'mapa') await page.getByRole('link', { name: 'Mapa', exact: true }).click()
    if (view === 'mapa') await page.getByRole('img', { name: /^Parcela dos eleitores/ }).waitFor()
    await page.evaluate(() => window.scrollTo(0, 0))
    const { file, meta } = out(view)
    await page.screenshot({ path: file, animations: 'disabled' })
    await page.screenshot({ path: file.replace('.png', '-full.png'), animations: 'disabled', fullPage: true })
    writeFileSync(meta, JSON.stringify({ slot: 'ficaram-em-casa', state: view, route: PATH, viewport: page.viewportSize(), scrollY: 0, fullPage: false }, null, 2) + '\n')
  })
}

test('capture ficaram-em-casa / desktop', async ({ page }) => {
  await page.setViewportSize(DESKTOP)
  await page.goto(PATH)
  await page.frameLocator('[data-mapa-frame]').locator('svg[data-uf-map]').waitFor()
  await page.evaluate(() => document.fonts.ready)
  const { file } = out('desktop')
  await page.screenshot({ path: file, animations: 'disabled' })
})
