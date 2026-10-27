import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from '@playwright/test'
import { base } from './helpers'

/*
 * Gate 2 of ticket #36: the footer with the donation link, at 390 wide, fixture state: a placeholder address
 * configured (PUBLIC_DONATION_URL=https://doacao.example.test/apoie at build time) and the metrics notice acknowledged.
 * Next to the Sketch frame "14 Sobre os dados, with donation footer" (page "Election SPA v3", 390x1123, whose
 * bottom is the section "Apoie o projeto" and the footer): the data page is taller than the frame, so the capture is
 * its last 330 px; the Home footer has no frame of its own and is captured at 390x844 (viewport) scrolled to its end.
 */
test('capture about / donation footer', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('voto-a-voto:notice', 'acknowledged'))
  await page.goto(`${base}sobre-os-dados/`)
  await page.evaluate(() => document.fonts.ready)
  const height = await page.evaluate(() => document.documentElement.scrollHeight)
  const dir = resolve('.captures', 'about')
  mkdirSync(dir, { recursive: true })
  const file = resolve(dir, 'donation.png')
  await page.screenshot({ path: file, animations: 'disabled', fullPage: true, clip: { x: 0, y: height - 330, width: 390, height: 330 } })
  writeFileSync(resolve(dir, 'donation.json'), JSON.stringify({ slot: 'about', state: 'donation', route: `${base}sobre-os-dados/`, viewport: page.viewportSize(), clip: { y: height - 330, height: 330 }, reference: 'Sketch: 14 Sobre os dados, with donation footer (bottom 160 px)', capture: file }, null, 2) + '\n')
})

test('capture home / donation footer', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('voto-a-voto:notice', 'acknowledged'))
  await page.goto(base)
  await page.evaluate(() => document.fonts.ready)
  await page.waitForFunction(() => document.documentElement.dataset.ready !== undefined)
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  const dir = resolve('.captures', 'home')
  mkdirSync(dir, { recursive: true })
  const file = resolve(dir, 'donation-footer.png')
  await page.screenshot({ path: file, animations: 'disabled' })
  writeFileSync(resolve(dir, 'donation-footer.json'), JSON.stringify({ slot: 'home', state: 'donation-footer', route: base, viewport: page.viewportSize(), scrollY: await page.evaluate(() => window.scrollY), reference: 'none (no frame for the footer line)', capture: file }, null, 2) + '\n')
})
