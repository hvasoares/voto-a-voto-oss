import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from '@playwright/test'
import { base } from './helpers'
import { dataGuard } from './presets'

/*
 * Real-dataset captures for the state map (screens 10/10b): run with
 *   DATA_DIR=../data npx playwright test --project=capture capture-mapa-real
 * (build with the real data inside the same env). Skipped without ../data.
 */
test.skip(...dataGuard('cities.csv', process.env.DATA_DIR ?? null))

const routes: Record<string, string> = {
  'real-mosaico': `${base}mapa/`,
  'real-mapa': `${base}mapa/?vista=mapa`,
  'real-virada-mosaico': `${base}mapa/virada/`,
  'real-virada-mapa': `${base}mapa/virada/?vista=mapa`,
}

for (const [state, url] of Object.entries(routes)) {
  test(`capture mapa / ${state}`, async ({ page }) => {
    await page.goto(url)
    await page.evaluate(() => document.fonts.ready)
    await page.evaluate(() => window.scrollTo(0, 0))
    if (state.endsWith('-mapa')) {
      await page.getByRole('link', { name: 'Mapa', exact: true }).click()
      await page.getByRole('img', { name: /^Mapa do Brasil por estado/ }).waitFor()
    }
    const dir = resolve('.captures', 'mapa')
    mkdirSync(dir, { recursive: true })
    const file = resolve(dir, `${state}.png`)
    await page.screenshot({ path: file, animations: 'disabled', fullPage: false })
    writeFileSync(
      resolve(dir, `${state}.json`),
      JSON.stringify({ slot: 'state-map', state, route: url, viewport: page.viewportSize(), scrollY: await page.evaluate(() => window.scrollY), fullPage: false, reference: 'site/reference/10*.png' }, null, 2) + '\n',
    )
  })
}