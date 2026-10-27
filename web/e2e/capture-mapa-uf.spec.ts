import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { base } from './helpers'

/*
 * Gate 2 of the #17 checkpoint: captures of the NEW screens at 390x844 on the FIXTURE build (no
 * Sketch frame exists; the approved closest finished screen is #16's /mapa/rj/, captured fresh on
 * the same build for apples-to-apples layout). Output: .captures/mapa-uf/ (not committed, no
 * baselines); the review is a separate fresh-context step (web/docs/screenshot-review-protocol.md).
 */
const dir = resolve('.captures', 'mapa-uf')
mkdirSync(dir, { recursive: true })

const record = async (page: import('@playwright/test').Page, state: string, url: string, note: string) =>
  writeFileSync(
    resolve(dir, `${state}.json`),
    JSON.stringify({ slot: 'city-map', state, route: url, viewport: page.viewportSize(), scrollY: await page.evaluate(() => window.scrollY), fullPage: false, reference: '.captures/mapa-uf/rj-lista.png', note }, null, 2) + '\n',
  )

const capture = async (page: import('@playwright/test').Page, state: string, url: string, opts: { tapMap?: boolean; note: string }) => {
  await page.goto(url)
  if (opts.tapMap) {
    await page.getByRole('link', { name: 'Mapa', exact: true }).click()
    await page.locator('[data-slot="mapa-municipios"]').waitFor()
  }
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(() => window.scrollTo(0, 0))
  const file = resolve(dir, `${state}.png`)
  await page.screenshot({ path: file, animations: 'disabled', fullPage: false })
  await record(page, state, url, opts.note)
}

test('capture mapa-uf / rj-lista (the approved screen of #16, fresh on this build)', async ({ page }) => {
  await capture(page, 'rj-lista', `${base}mapa/rj/`, { note: 'reference: the approved municipality-map screen, same build as the new states' })
})

test('capture mapa-uf / mt-lista (the 2026-only municipality, the sem-contorno note)', async ({ page }) => {
  await capture(page, 'mt-lista', `${base}mapa/mt/`, { note: 'new screen: one municipality, the boundary note next to the legend' })
})

test('capture mapa-uf / sp-lista (the route generalises to a second state)', async ({ page }) => {
  await capture(page, 'sp-lista', `${base}mapa/sp/`, { note: 'new screen: the same island, one fixture municipality' })
})

test('capture mapa-uf / mt-mapa (map view with the unmatched municipality shape absent)', async ({ page }) => {
  await capture(page, 'mt-mapa', `${base}mapa/mt/?vista=mapa`, { tapMap: true, note: 'new screen: real IBGE shapes of MT against the fixture name; unmatched municipality stays out' })
})

test('capture mapa-uf / estado-rj (the #4/#50 placeholder hosting the island)', async ({ page }) => {
  const url = `${base}rj/`
  await page.goto(url)
  await page.evaluate(() => document.fonts.ready)
  await page.locator('[data-placeholder="state-map"]').waitFor()
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(page.locator('[data-placeholder="state-map"] a[data-cd]')).not.toHaveCount(0)
  const file = resolve(dir, 'estado-rj.png')
  await page.screenshot({ path: file, animations: 'disabled', fullPage: false })
  await record(page, 'estado-rj', url, 'new screen: the island inside the state page placeholder, above the search and the city list')
  await page.screenshot({ path: resolve(dir, 'estado-rj-full.png'), animations: 'disabled', fullPage: true })
})