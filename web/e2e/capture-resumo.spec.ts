import { test } from '@playwright/test'
import { capture } from './capture'
import { base } from './helpers'
import { acknowledgeNotice } from './presets'

/* Gate 2 of #28: /rj/resumo/ at 390x844 against "17 Resumo do estado". Output: web/.captures/resumo/ (not committed). */
test('capture resumo / phone', async ({ page }) => {
  await acknowledgeNotice(page)
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { value: () => Promise.resolve(), configurable: true })
  })
  await page.goto(`${base}rj/resumo/`)
  await page.waitForSelector('[data-share-actions][data-png="ready"]')
  await capture(page, { dir: 'resumo', name: 'phone', route: 'rj/resumo/', scrollY: 'page' })
})
