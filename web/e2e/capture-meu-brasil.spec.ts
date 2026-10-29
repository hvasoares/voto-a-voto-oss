import { test } from '@playwright/test'
import { capture } from './capture'
import { base } from './helpers'
import { PHONE, DESKTOP, acknowledgeNotice } from './presets'
import { shareMock } from './share-mock'

/* Gate 2 of #27: /meu-brasil/ with three places at 390x844 against "16 Meu Brasil", and at 1440x900 against the desktop frame "16 Meu Brasil (desktop)". Output: web/.captures/meu-brasil/ (not committed). */
const THREE = '?mora=rj/cidade-exemplo&vota=sp/cidade-exemplo-paulista&nasceu=mt/boa-esperanca-do-norte'
for (const [name, size] of [['phone', PHONE], ['desktop', DESKTOP]] as const)
  test(`capture meu-brasil / ${name}`, async ({ page }) => {
    await page.setViewportSize(size)
    await acknowledgeNotice(page)
    await shareMock(page).install('shares')
    await page.goto(`${base}meu-brasil/${THREE}`)
    await page.waitForSelector('[data-meu-brasil][data-ready="yes"]')
    await capture(page, { dir: 'meu-brasil', name, route: `meu-brasil/${THREE}`, viewport: size, fullPage: name === 'desktop', omit: ['fullPage'] })
  })
