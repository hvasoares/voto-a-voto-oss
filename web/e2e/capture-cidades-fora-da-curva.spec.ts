import { test } from '@playwright/test'
import { capture } from './capture'
import { base } from './helpers'
import { DESKTOP } from './presets'

/* Gate 2 of #34: the slot in its fixture state at 390x844 and 1440x900, next to the Sketch frames "22 Cidades fora da curva" (phone) and "(desktop)". Output: .captures/cidades-fora-da-curva/ (not committed). */
const PATH = `${base}relatorios/cidades-fora-da-curva/`
const DIR = 'cidades-fora-da-curva'

test('capture cidades-fora-da-curva / phone', async ({ page }) => {
  await page.goto(PATH)
  await capture(page, { dir: DIR, name: 'phone', sidecar: false })
  await capture(page, { dir: DIR, name: 'phone-full', fullPage: true, sidecar: false, fonts: false })
  await page.locator('[data-filter="min"] summary').click()
  await capture(page, { dir: DIR, name: 'phone-filter-open', sidecar: false, fonts: false })
})

test('capture cidades-fora-da-curva / desktop', async ({ page }) => {
  await page.setViewportSize(DESKTOP)
  await page.goto(PATH)
  await capture(page, { dir: DIR, name: 'desktop', sidecar: false })
})
