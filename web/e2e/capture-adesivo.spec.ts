import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from '@playwright/test'
import { base } from './helpers'
import { acknowledgeNotice } from './presets'

/* Gate 2 of #37: /meu-brasil/adesivo/ at 390x844 against "23 Adesivo Meu Brasil". Output: web/.captures/adesivo/ (not committed). */
test('capture adesivo / phone', async ({ page }) => {
  await acknowledgeNotice(page)
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { value: () => Promise.resolve(), configurable: true })
  })
  await page.goto(`${base}meu-brasil/adesivo/?mora=rj/cidade-exemplo&vota=sp/cidade-exemplo-paulista&nasceu=mt/boa-esperanca-do-norte`)
  await page.waitForSelector('[data-share-actions][data-png="ready"]')
  await page.evaluate(() => document.fonts.ready)
  const dir = resolve('.captures', 'adesivo')
  mkdirSync(dir, { recursive: true })
  const file = resolve(dir, 'phone.png')
  await page.screenshot({ path: file, animations: 'disabled' })
  writeFileSync(resolve(dir, 'phone.json'), JSON.stringify({ route: 'meu-brasil/adesivo/', viewport: page.viewportSize(), scrollY: await page.evaluate(() => window.scrollY), capture: file }, null, 2) + '\n')
})
