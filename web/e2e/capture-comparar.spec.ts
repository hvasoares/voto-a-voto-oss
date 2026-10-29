import { expect, test } from '@playwright/test'
import { capture } from './capture'
import { base } from './helpers'
import { PHONE, noJs } from './presets'

/*
 * Gate 2 of the compare checkpoint: captures the fixture build at 390x844 next to the frames
 * site/reference/11-comparar-2022.png and 11b-comparar-2018.png. Output: web/.captures/comparar/
 * (not committed, no baselines); one JSON sidecar per capture.
 */
for (const route of ['/comparar/2018/', '/comparar/2022/']) {
  test(`capture ${route} / fixture build`, async ({ page }) => {
    await page.goto(`${base}${route.slice(1)}`)
    await page.evaluate(() => window.scrollTo(0, 0))
    await expect(page.locator('[data-component="compare-rows"] > li').first()).toBeVisible()
    const name = route.endsWith('2018/') ? '2018' : '2022'
    await capture(page, {
      dir: 'comparar',
      name,
      route,
      fullPage: true,
      extra: { slot: `comparar-${name}`, state: 'fixture-build', reference: `site/reference/11${name === '2018' ? 'b' : ''}-comparar-${name}.png` },
    })
  })

  test(`capture ${route} / same page with JavaScript off`, async ({ browser }) => {
    const context = await browser.newContext({ ...noJs(), viewport: PHONE })
    const page = await context.newPage()
    await page.goto(`${base}${route.slice(1)}`)
    const name = route.endsWith('2018/') ? '2018' : '2022'
    await capture(page, {
      dir: 'comparar',
      name: `${name}-no-js`,
      route,
      fullPage: true,
      extra: { slot: `comparar-${name}`, state: 'no-js', note: 'static HTML: identical content without JavaScript' },
    })
    await context.close()
  })
}
