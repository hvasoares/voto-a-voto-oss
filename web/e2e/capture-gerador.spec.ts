import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from '@playwright/test'
import { base } from './helpers'
import { acknowledgeNotice } from './presets'

/* Gate 2 of #25: the generator in its fixture state at 390x844 against the frame "15 Gerador de cartão". Output: web/.captures/gerador/ (not committed). */
test('capture gerador / phone', async ({ page }) => {
  await acknowledgeNotice(page)
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { value: () => Promise.resolve(), configurable: true })
  })
  await page.goto(`${base}gerador/?cidade=rj/cidade-exemplo`)
  await page.waitForFunction(() => document.querySelector('[data-card-generator]')?.getAttribute('data-ready') === 'yes')
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(() => window.scrollTo(0, 0))
  const dir = resolve('.captures', 'gerador')
  mkdirSync(dir, { recursive: true })
  const file = resolve(dir, 'phone.png')
  await page.screenshot({ path: file, animations: 'disabled' })
  writeFileSync(resolve(dir, 'phone.json'), JSON.stringify({ route: 'gerador/?cidade=rj/cidade-exemplo', viewport: page.viewportSize(), scrollY: await page.evaluate(() => window.scrollY), capture: file }, null, 2) + '\n')
})
