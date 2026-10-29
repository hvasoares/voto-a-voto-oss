import { test } from '@playwright/test'
import { capture } from './capture'
import { base } from './helpers'
import { PHONE, noJs } from './presets'

/*
 * Gate 2 of the tres-ciclos checkpoint: captures the fixture build at 390x844 next to
 * site/reference/13-tres-ciclos-por-estado.png — the state with its cycles (SP) and the sem-dados
 * state (MT, 2026-only). Output: web/.captures/comparar/ (not committed, no baselines).
 */
for (const [uf, state] of [['sp', 'fixture-build'], ['mt', 'sem-dados']] as const) {
  test(`capture /tres-ciclos/${uf}/ / ${state}`, async ({ page }) => {
    await page.goto(`${base}tres-ciclos/${uf}/`)
    await page.evaluate(() => window.scrollTo(0, 0))
    await capture(page, {
      dir: 'comparar',
      name: `tres-ciclos-${uf}`,
      route: `/tres-ciclos/${uf}/`,
      fullPage: true,
      extra: { slot: `tres-ciclos-${uf}`, state, reference: 'site/reference/13-tres-ciclos-por-estado.png' },
    })
  })

  test(`capture /tres-ciclos/${uf}/ / no JavaScript`, async ({ browser }) => {
    const context = await browser.newContext({ ...noJs(), viewport: PHONE })
    const page = await context.newPage()
    await page.goto(`${base}tres-ciclos/${uf}/`)
    await capture(page, {
      dir: 'comparar',
      name: `tres-ciclos-${uf}-no-js`,
      route: `/tres-ciclos/${uf}/`,
      fullPage: true,
      extra: { slot: `tres-ciclos-${uf}`, state: 'no-js', note: 'static HTML: identical content without JavaScript' },
    })
    await context.close()
  })
}
