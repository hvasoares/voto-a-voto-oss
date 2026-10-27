import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { base } from './helpers'

/*
 * Gate 2 of each page checkpoint: captures the fixture-state render at 390x844, scroll 0, next to
 * site/reference/01-home.png. The review itself is done by a fresh-context reviewer following
 * site/docs/screenshot-review-protocol.md. Output: web/.captures/ (not committed, no baselines).
 */
test('capture home / default', async ({ page }) => {
  await page.goto(base)
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(() => window.scrollTo(0, 0))
  const dir = resolve('.captures', 'home')
  mkdirSync(dir, { recursive: true })
  const file = resolve(dir, 'default.png')
  await page.screenshot({ path: file, animations: 'disabled' })
  writeFileSync(
    resolve(dir, 'default.json'),
    JSON.stringify({ slot: 'home', state: 'default', route: base, viewport: page.viewportSize(), scrollY: await page.evaluate(() => window.scrollY), fullPage: false, reference: 'site/reference/01-home.png', capture: file }, null, 2) + '\n',
  )
})

/* Ticket #7: the share sheet demo route (fixture city, 2026 · 1º turno), next to site/reference/03-compartilhamento.png. */
test('capture share / default', async ({ page }) => {
  await page.goto(`${base}compartilhar/`)
  await page.evaluate(() => document.fonts.ready)
  await page.waitForFunction(() => { const i = document.querySelector('astro-island'); return !!i && !i.hasAttribute('ssr') })
  await expect(page.locator('[data-share-actions]')).toHaveAttribute('data-png', 'ready')
  await page.evaluate(() => window.scrollTo(0, 0))
  const dir = resolve('.captures', 'share')
  mkdirSync(dir, { recursive: true })
  const file = resolve(dir, 'default.png')
  await page.screenshot({ path: file, animations: 'disabled' })
  writeFileSync(
    resolve(dir, 'default.json'),
    JSON.stringify({ slot: 'share', state: 'default', route: `${base}compartilhar/`, viewport: page.viewportSize(), scrollY: await page.evaluate(() => window.scrollY), fullPage: false, reference: 'site/reference/03-compartilhamento.png', capture: file }, null, 2) + '\n',
  )
})

/* The shard-contract city page of ticket #49 (the card is #50): the review folder is .captures/city/. */
test('capture city / contract page', async ({ page }) => {
  await page.goto(`${base}rj/cidade-exemplo/`)
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(() => window.scrollTo(0, 0))
  const dir = resolve('.captures', 'city')
  mkdirSync(dir, { recursive: true })
  const file = resolve(dir, 'default.png')
  await page.screenshot({ path: file, animations: 'disabled' })
  writeFileSync(
    resolve(dir, 'default.json'),
    JSON.stringify({ slot: 'city', state: 'contract-page', route: `${base}rj/cidade-exemplo/`, viewport: page.viewportSize(), scrollY: await page.evaluate(() => window.scrollY), fullPage: false, reference: 'site/reference/01-home.png (city card arrives in #50)', capture: file }, null, 2) + '\n',
  )
})

/* Ticket #9: the Mostrar QR demo screen (fixture city), next to site/reference/04-mostrar-qr.png. */
test('capture qr / default', async ({ page }) => {
  await page.goto(`${base}qr/`)
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(() => window.scrollTo(0, 0))
  const dir = resolve('.captures', 'qr')
  mkdirSync(dir, { recursive: true })
  const file = resolve(dir, 'default.png')
  await page.screenshot({ path: file, animations: 'disabled' })
  writeFileSync(
    resolve(dir, 'default.json'),
    JSON.stringify({ slot: 'qr', state: 'default', route: `${base}qr/`, viewport: page.viewportSize(), scrollY: await page.evaluate(() => window.scrollY), fullPage: false, reference: 'site/reference/04-mostrar-qr.png', capture: file }, null, 2) + '\n',
  )
})

/* Ticket #9: the printable poster, A4 emulated (print media at 794x1123 CSS px = 210x297 mm at 96 dpi). */
test('capture qr / poster-print', async ({ page }) => {
  await page.setViewportSize({ width: 794, height: 1123 })
  await page.emulateMedia({ media: 'print' })
  await page.goto(`${base}qr/`)
  await page.evaluate(() => document.fonts.ready)
  await expect(page.locator('[data-poster]')).toBeVisible()
  await expect(page.locator('[data-qr-screen]')).toBeHidden()
  const dir = resolve('.captures', 'qr')
  mkdirSync(dir, { recursive: true })
  const file = resolve(dir, 'poster-print.png')
  await page.screenshot({ path: file, animations: 'disabled' })
  writeFileSync(
    resolve(dir, 'poster-print.json'),
    JSON.stringify({ slot: 'qr', state: 'poster-print', route: `${base}qr/`, viewport: page.viewportSize(), scrollY: 0, fullPage: false, media: 'print', reference: 'A4 (210x297) print layer of the same ticket', capture: file }, null, 2) + '\n',
  )
})
