import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from '@playwright/test'
import { base } from './helpers'
import { PHONE, DESKTOP, acknowledgeNotice } from './presets'

/* Gate 2 of #27: /meu-brasil/ with three places at 390x844 against "16 Meu Brasil", and at 1440x900 against the desktop frame "16 Meu Brasil (desktop)". Output: web/.captures/meu-brasil/ (not committed). */
const THREE = '?mora=rj/cidade-exemplo&vota=sp/cidade-exemplo-paulista&nasceu=mt/boa-esperanca-do-norte'
for (const [name, size] of [['phone', PHONE], ['desktop', DESKTOP]] as const)
  test(`capture meu-brasil / ${name}`, async ({ page }) => {
    await page.setViewportSize(size)
    await acknowledgeNotice(page)
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', { value: () => Promise.resolve(), configurable: true })
    })
    await page.goto(`${base}meu-brasil/${THREE}`)
    await page.waitForSelector('[data-meu-brasil][data-ready="yes"]')
    await page.evaluate(() => document.fonts.ready)
    const dir = resolve('.captures', 'meu-brasil')
    mkdirSync(dir, { recursive: true })
    const file = resolve(dir, `${name}.png`)
    await page.screenshot({ path: file, animations: 'disabled', fullPage: name === 'desktop' })
    writeFileSync(resolve(dir, `${name}.json`), JSON.stringify({ route: `meu-brasil/${THREE}`, viewport: size, capture: file }, null, 2) + '\n')
  })
