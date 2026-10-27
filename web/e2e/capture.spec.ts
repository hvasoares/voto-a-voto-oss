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

/* State page (#50, the ported Sketch frame "5 Estado"), next to site/reference/05-estado.png. */
test('capture state / default', async ({ page }) => {
  await page.goto(`${base}rj/`)
  await page.evaluate(() => document.fonts.ready)
  await page.waitForFunction(() => document.documentElement.dataset.stateSearch !== undefined)
  await page.evaluate(() => window.scrollTo(0, 0))
  const dir = resolve('.captures', 'state')
  mkdirSync(dir, { recursive: true })
  const file = resolve(dir, 'default.png')
  await page.screenshot({ path: file, animations: 'disabled' })
  writeFileSync(
    resolve(dir, 'default.json'),
    JSON.stringify({ slot: 'state', state: 'default', route: `${base}rj/`, viewport: page.viewportSize(), scrollY: await page.evaluate(() => window.scrollY), fullPage: false, reference: 'site/reference/05-estado.png', capture: file }, null, 2) + '\n',
  )
})

/* The sketch fixture state (?fixture=sketch) draws the frame's own illustrative figures, for the comparison with site/reference/05-estado.png. */
test('capture state / sketch', async ({ page }) => {
  await page.goto(`${base}rj/?fixture=sketch`)
  await page.evaluate(() => document.fonts.ready)
  await page.waitForFunction(() => document.documentElement.dataset.stateSearch !== undefined)
  await page.evaluate(() => window.scrollTo(0, 0))
  const dir = resolve('.captures', 'state')
  mkdirSync(dir, { recursive: true })
  const file = resolve(dir, 'sketch.png')
  await page.screenshot({ path: file, animations: 'disabled' })
  writeFileSync(
    resolve(dir, 'sketch.json'),
    JSON.stringify({ slot: 'state', state: 'sketch', route: `${base}rj/?fixture=sketch`, viewport: page.viewportSize(), scrollY: await page.evaluate(() => window.scrollY), fullPage: false, reference: 'site/reference/05-estado.png', capture: file }, null, 2) + '\n',
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
