import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from '@playwright/test'
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
    await page.evaluate(() => document.fonts.ready)
    await page.evaluate(() => window.scrollTo(0, 0))
    const dir = resolve('.captures', 'comparar')
    mkdirSync(dir, { recursive: true })
    const file = resolve(dir, `tres-ciclos-${uf}.png`)
    await page.screenshot({ path: file, fullPage: true, animations: 'disabled' })
    writeFileSync(
      resolve(dir, `tres-ciclos-${uf}.json`),
      JSON.stringify({ slot: `tres-ciclos-${uf}`, state, route: `/tres-ciclos/${uf}/`, viewport: page.viewportSize(), fullPage: true, reference: 'site/reference/13-tres-ciclos-por-estado.png', capture: file }, null, 2) + '\n',
    )
  })

  test(`capture /tres-ciclos/${uf}/ / no JavaScript`, async ({ browser }) => {
    const context = await browser.newContext({ ...noJs(), viewport: PHONE })
    const page = await context.newPage()
    await page.goto(`${base}tres-ciclos/${uf}/`)
    const dir = resolve('.captures', 'comparar')
    const file = resolve(dir, `tres-ciclos-${uf}-no-js.png`)
    await page.screenshot({ path: file, fullPage: true, animations: 'disabled' })
    writeFileSync(
      resolve(dir, `tres-ciclos-${uf}-no-js.json`),
      JSON.stringify({ slot: `tres-ciclos-${uf}`, state: 'no-js', route: `/tres-ciclos/${uf}/`, viewport: page.viewportSize(), fullPage: true, note: 'static HTML: identical content without JavaScript', capture: file }, null, 2) + '\n',
    )
    await context.close()
  })
}