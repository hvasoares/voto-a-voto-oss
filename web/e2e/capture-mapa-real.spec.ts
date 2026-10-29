import { test } from '@playwright/test'
import { capture } from './capture'
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
    await page.evaluate(() => window.scrollTo(0, 0))
    if (state.endsWith('-mapa')) {
      await page.getByRole('link', { name: 'Mapa', exact: true }).click()
      await page.getByRole('img', { name: /^Mapa do Brasil por estado/ }).waitFor()
    }
    await capture(page, {
      dir: 'mapa',
      name: state,
      route: url,
      scrollY: 'page',
      fullPage: false,
      extra: { slot: 'state-map', state, reference: 'site/reference/10*.png' },
    })
  })
}
