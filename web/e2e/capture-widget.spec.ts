import { test } from '@playwright/test'
import { capture } from './capture'
import { base } from './helpers'
import { acknowledgeNotice } from './presets'

/* Gate 2 of #29: /widget/?cidade=rj/cidade-exemplo at 390x844 against "18 Widget da cidade". Output: web/.captures/widget/ (not committed). */
test('capture widget / phone', async ({ page }) => {
  await acknowledgeNotice(page)
  await page.goto(`${base}widget/?cidade=rj/cidade-exemplo`)
  await page.waitForSelector('[data-widget-builder][data-ready="yes"]')
  await page.waitForTimeout(300)
  await capture(page, { dir: 'widget', name: 'phone', route: 'widget/?cidade=rj/cidade-exemplo', scrollY: 'page' })
  await capture(page, { dir: 'widget', name: 'phone-full', fullPage: true, sidecar: false, fonts: false })
})
