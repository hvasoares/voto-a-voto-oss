import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from '@playwright/test'
import { base } from './helpers'

/*
 * Screenshot source for the review of /sobre-os-dados/ (ticket #18): 390x844 fullPage (the Sketch
 * frame is tall: 390x1123 of content) and 1280 wide. Output: web/.captures/about/ (not committed,
 * no baselines); review follows site/docs/screenshot-review-protocol.md.
 */
test('capture about / phone full page', async ({ page }) => {
  await page.goto(base + 'sobre-os-dados/')
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(() => window.scrollTo(0, 0))
  const dir = resolve('.captures', 'about')
  mkdirSync(dir, { recursive: true })
  const file = resolve(dir, 'phone-full.png')
  await page.screenshot({ path: file, animations: 'disabled', fullPage: true })
  writeFileSync(
    resolve(dir, 'phone-full.json'),
    JSON.stringify({ slot: 'about', state: 'default', route: base + 'sobre-os-dados/', viewport: page.viewportSize(), scrollY: await page.evaluate(() => window.scrollY), fullPage: true, reference: 'site/reference/14-sobre-os-dados.png', capture: file }, null, 2) + '\n',
  )
})

test('capture about / desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto(base + 'sobre-os-dados/')
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(() => window.scrollTo(0, 0))
  const dir = resolve('.captures', 'about')
  mkdirSync(dir, { recursive: true })
  const file = resolve(dir, 'desktop-full.png')
  await page.screenshot({ path: file, animations: 'disabled', fullPage: true })
  writeFileSync(
    resolve(dir, 'desktop-full.json'),
    JSON.stringify({ slot: 'about', state: 'desktop', route: base + 'sobre-os-dados/', viewport: { width: 1280, height: 900 }, scrollY: await page.evaluate(() => window.scrollY), fullPage: true, reference: 'site/reference/14-sobre-os-dados.png', capture: file }, null, 2) + '\n',
  )
})