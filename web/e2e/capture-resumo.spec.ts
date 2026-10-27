import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from '@playwright/test'
import { base } from './helpers'

/* Gate 2 of #28: /rj/resumo/ at 390x844 against "17 Resumo do estado". Output: web/.captures/resumo/ (not committed). */
test('capture resumo / phone', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('voto-a-voto:notice', 'acknowledged')
    Object.defineProperty(navigator, 'share', { value: () => Promise.resolve(), configurable: true })
  })
  await page.goto(`${base}rj/resumo/`)
  await page.waitForSelector('[data-share-actions][data-png="ready"]')
  await page.evaluate(() => document.fonts.ready)
  const dir = resolve('.captures', 'resumo')
  mkdirSync(dir, { recursive: true })
  const file = resolve(dir, 'phone.png')
  await page.screenshot({ path: file, animations: 'disabled' })
  writeFileSync(resolve(dir, 'phone.json'), JSON.stringify({ route: 'rj/resumo/', viewport: page.viewportSize(), scrollY: await page.evaluate(() => window.scrollY), capture: file }, null, 2) + '\n')
})
