import { test } from '@playwright/test'
import { capture } from './capture'
import { base } from './helpers'
import { DESKTOP } from './presets'

/* #83 gate 2: the state page at 390x844 (list, filtered, map view, empty) and at 1440x900, on the fixture build. Output .captures/state-83/ (not committed). */
const DIR = 'state-83'
const shot = (page: import('@playwright/test').Page, name: string) => capture(page, { dir: DIR, name, fullPage: false, sidecar: false })

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
  test.use({ viewport: DESKTOP, isMobile: false, hasTouch: false })
  test('capture state-83 / desktop', async ({ page }) => {
    await page.goto(`${base}rj/`)
    await page.waitForFunction(() => document.documentElement.dataset.ready !== undefined)
    await shot(page, 'desktop-lista')
    await page.getByRole('searchbox').fill('exemplo b')
    await shot(page, 'desktop-filtrada')
  })
})
