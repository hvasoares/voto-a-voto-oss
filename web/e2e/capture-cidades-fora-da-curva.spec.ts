import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from '@playwright/test'
import { base } from './helpers'

/* Gate 2 of #34: the slot in its fixture state at 390x844 and 1440x900, next to the Sketch frames "22 Cidades fora da curva" (phone) and "(desktop)". Output: .captures/cidades-fora-da-curva/ (not committed). */
const PATH = `${base}relatorios/cidades-fora-da-curva/`
const out = (name: string) => {
  const dir = resolve('.captures', 'cidades-fora-da-curva')
  mkdirSync(dir, { recursive: true })
  return resolve(dir, `${name}.png`)
}

test('capture cidades-fora-da-curva / phone', async ({ page }) => {
  await page.goto(PATH)
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: out('phone'), animations: 'disabled' })
  await page.screenshot({ path: out('phone-full'), animations: 'disabled', fullPage: true })
  await page.locator('[data-filter="min"] summary').click()
  await page.screenshot({ path: out('phone-filter-open'), animations: 'disabled' })
})

test('capture cidades-fora-da-curva / desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(PATH)
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: out('desktop'), animations: 'disabled' })
})
