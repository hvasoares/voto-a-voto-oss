import { test } from '@playwright/test'
import { capture } from './capture'
import { base } from './helpers'
import { acknowledgeNotice } from './presets'
import { shareMock } from './share-mock'

/* Gate 2 of #37: /meu-brasil/adesivo/ at 390x844 against "23 Adesivo Meu Brasil". Output: web/.captures/adesivo/ (not committed). */
test('capture adesivo / phone', async ({ page }) => {
  await acknowledgeNotice(page)
  await shareMock(page).install('shares')
  await page.goto(`${base}meu-brasil/adesivo/?mora=rj/cidade-exemplo&vota=sp/cidade-exemplo-paulista&nasceu=mt/boa-esperanca-do-norte`)
  await page.waitForSelector('[data-share-actions][data-png="ready"]')
  await capture(page, { dir: 'adesivo', name: 'phone', route: 'meu-brasil/adesivo/', scrollY: 'page' })
})
