import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from '@playwright/test'
import { base } from './helpers'
import { acknowledgeNotice } from './presets'

/* Gate 2 of #29: /widget/?cidade=rj/cidade-exemplo at 390x844 against "18 Widget da cidade". Output: web/.captures/widget/ (not committed). */
test('capture widget / phone', async ({ page }) => {
  await acknowledgeNotice(page)
  await page.goto(`${base}widget/?cidade=rj/cidade-exemplo`)
  await page.waitForSelector('[data-widget-builder][data-ready="yes"]')
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(300)
  const dir = resolve('.captures', 'widget')
  mkdirSync(dir, { recursive: true })
  const file = resolve(dir, 'phone.png')
  await page.screenshot({ path: file, animations: 'disabled' })
  await page.screenshot({ path: resolve(dir, 'phone-full.png'), animations: 'disabled', fullPage: true })
  writeFileSync(resolve(dir, 'phone.json'), JSON.stringify({ route: 'widget/?cidade=rj/cidade-exemplo', viewport: page.viewportSize(), scrollY: await page.evaluate(() => window.scrollY), capture: file }, null, 2) + '\n')
})
