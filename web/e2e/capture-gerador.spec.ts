import { test } from '@playwright/test'
import { capture } from './capture'
import { base } from './helpers'
import { acknowledgeNotice } from './presets'
import { shareMock } from './share-mock'

/* Gate 2 of #25: the generator in its fixture state at 390x844 against the frame "15 Gerador de cartão". Output: web/.captures/gerador/ (not committed). */
test('capture gerador / phone', async ({ page }) => {
  await acknowledgeNotice(page)
  await shareMock(page).install('shares')
  await page.goto(`${base}gerador/?cidade=rj/cidade-exemplo`)
  await page.waitForFunction(() => document.querySelector('[data-card-generator]')?.getAttribute('data-ready') === 'yes')
  await page.evaluate(() => window.scrollTo(0, 0))
  await capture(page, { dir: 'gerador', name: 'phone', route: 'gerador/?cidade=rj/cidade-exemplo', scrollY: 'page' })
})
