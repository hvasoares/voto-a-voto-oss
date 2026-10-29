import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from '@playwright/test'
import { base } from './helpers'
import { useNoJs } from './presets'

/*
 * Gate 2 of the state-map checkpoint: captures /mapa/ and /mapa/virada/ (fixture states) at
 * 390x844, next to site/reference/10-mapa-por-estado-*.png and 10b-virada-*.png. The review is a
 * separate fresh-context step (site/docs/screenshot-review-protocol.md). Output: .captures/mapa/
 * (not committed, no baselines). The real-dataset captures come from capture-mapa-real.spec.ts.
 */
const refs = {
  'mosaico': 'site/reference/10-mapa-por-estado-mosaico.png',
  'mapa': 'site/reference/10-mapa-por-estado-mapa.png',
  'virada-mosaico': 'site/reference/10b-virada-mosaico.png',
  'virada-mapa': 'site/reference/10b-virada-mapa.png',
} as const

for (const [state, reference] of Object.entries(refs)) {
  const url = state.startsWith('virada') ? `${base}mapa/virada/${state.endsWith('-mapa') ? '?vista=mapa' : ''}` : `${base}mapa/${state === 'mapa' ? '?vista=mapa' : ''}`
  test(`capture mapa / ${state}`, async ({ page }) => {
    await page.goto(url)
    await page.evaluate(() => document.fonts.ready)
    await page.evaluate(() => window.scrollTo(0, 0))
    if (state.endsWith('-mapa')) {
      // the map view is hydration-only: tap the toggle and wait for React
      await page.getByRole('link', { name: 'Mapa', exact: true }).click()
      await page.getByRole('img', { name: /^Mapa do Brasil por estado/ }).waitFor()
    }
    const dir = resolve('.captures', 'mapa')
    mkdirSync(dir, { recursive: true })
    const file = resolve(dir, `${state}.png`)
    await page.screenshot({ path: file, animations: 'disabled' })
    writeFileSync(
      resolve(dir, `${state}.json`),
      JSON.stringify({ slot: 'state-map', state, route: url, viewport: page.viewportSize(), scrollY: await page.evaluate(() => window.scrollY), fullPage: false, reference, capture: file }, null, 2) + '\n',
    )
  })
}

test.describe('no-JS render', () => {
  useNoJs()
  test('capture mapa / no-js', async ({ page }) => {
    const url = `${base}mapa/`
    await page.goto(url)
    await page.evaluate(() => document.fonts.ready)
    await page.evaluate(() => window.scrollTo(0, 0))
    const dir = resolve('.captures', 'mapa')
    mkdirSync(dir, { recursive: true })
    const file = resolve(dir, 'no-js.png')
    await page.screenshot({ path: file, animations: 'disabled' })
    writeFileSync(
      resolve(dir, 'no-js.json'),
      JSON.stringify({ slot: 'state-map', state: 'no-js', route: url, viewport: page.viewportSize(), scrollY: await page.evaluate(() => window.scrollY), fullPage: false, reference: 'site/reference/10-mapa-por-estado-mosaico.png', capture: file }, null, 2) + '\n',
    )
  })
})