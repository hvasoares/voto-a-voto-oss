import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { base } from './helpers'

/*
 * Gate 2 of the compare checkpoint: captures the fixture build at 390x844 next to the frames
 * site/reference/11-comparar-2022.png and 11b-comparar-2018.png. Output: web/.captures/comparar/
 * (not committed, no baselines); one JSON sidecar per capture.
 */
for (const route of ['/comparar/2018/', '/comparar/2022/']) {
  test(`capture ${route} / fixture build`, async ({ page }) => {
    await page.goto(`${base}${route.slice(1)}`)
    await page.evaluate(() => document.fonts.ready)
    await page.evaluate(() => window.scrollTo(0, 0))
    await expect(page.locator('[data-component="compare-rows"] > li').first()).toBeVisible()
    const dir = resolve('.captures', 'comparar')
    mkdirSync(dir, { recursive: true })
    const name = route.endsWith('2018/') ? '2018' : '2022'
    const file = resolve(dir, `${name}.png`)
    await page.screenshot({ path: file, fullPage: true, animations: 'disabled' })
    writeFileSync(
      resolve(dir, `${name}.json`),
      JSON.stringify({ slot: `comparar-${name}`, state: 'fixture-build', route, viewport: page.viewportSize(), fullPage: true, reference: `site/reference/11${name === '2018' ? 'b' : ''}-comparar-${name}.png`, capture: file }, null, 2) + '\n',
    )
  })

  test(`capture ${route} / same page with JavaScript off`, async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } })
    const page = await context.newPage()
    await page.goto(`${base}${route.slice(1)}`)
    const dir = resolve('.captures', 'comparar')
    const name = route.endsWith('2018/') ? '2018' : '2022'
    const file = resolve(dir, `${name}-no-js.png`)
    await page.screenshot({ path: file, fullPage: true, animations: 'disabled' })
    writeFileSync(
      resolve(dir, `${name}-no-js.json`),
      JSON.stringify({ slot: `comparar-${name}`, state: 'no-js', route, viewport: page.viewportSize(), fullPage: true, note: 'static HTML: identical content without JavaScript', capture: file }, null, 2) + '\n',
    )
    await context.close()
  })
}