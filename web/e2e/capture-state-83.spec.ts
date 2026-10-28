import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from '@playwright/test'
import { base } from './helpers'

/* #83 gate 2: the state page at 390x844 (list, filtered, map view, empty) and at 1440x900, on the fixture build. Output .captures/state-83/ (not committed). */
const dir = resolve('.captures', 'state-83')
mkdirSync(dir, { recursive: true })
const shot = async (page: import('@playwright/test').Page, name: string) => {
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: resolve(dir, `${name}.png`), animations: 'disabled', fullPage: false })
}

test('capture state-83 / phone', async ({ page }) => {
  await page.goto(`${base}rj/`)
  await page.waitForFunction(() => document.documentElement.dataset.ready !== undefined)
  await page.locator('[data-consent-continue]').click()
  await shot(page, 'phone-lista')
  await page.getByRole('searchbox').fill('exemplo b')
  await shot(page, 'phone-filtrada')
  await page.getByRole('searchbox').fill('zzzz')
  await shot(page, 'phone-vazia')
  await page.getByRole('searchbox').fill('')
  await page.getByRole('link', { name: 'Mapa', exact: true }).click()
  await page.locator('[data-slot="mapa-municipios"]').waitFor()
  await shot(page, 'phone-mapa')
})

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false })
  test('capture state-83 / desktop', async ({ page }) => {
    await page.goto(`${base}rj/`)
    await page.waitForFunction(() => document.documentElement.dataset.ready !== undefined)
    await shot(page, 'desktop-lista')
    await page.getByRole('searchbox').fill('exemplo b')
    await shot(page, 'desktop-filtrada')
  })
})
