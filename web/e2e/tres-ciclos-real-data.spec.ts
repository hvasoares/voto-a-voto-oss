import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { base } from './helpers'

/*
 * /tres-ciclos/sp/ (screen 13) against the real committed dataset (run with `npm run test:real`).
 * Every figure is a figure of the Sketch frame "13 Três ciclos por estado": SP 2018 32,0/68,0
 * ("Ponto de partida da série"), 2022 44,8/55,2 (Lula +12,7 pp vs 2018), 2026 46,2/53,8
 * (Lula +1,4 pp vs 2022); chips in the frame order; "Outros estados" MG RJ BA PR RS.
 */
test.skip(!existsSync(resolve('../data/votes.csv')), 'no ../data')

test.beforeEach(async ({ page }) => {
  await page.goto(`${base}tres-ciclos/sp/`)
})

test('frame 13: the three SP blocks with the frame rates and the change lines', async ({ page }) => {
  const cycles = page.locator('[data-component="cycles"]')
  const bar = (ano: string) => cycles.locator(`[data-cycle="${ano}"] [role="img"]`)
  await expect(bar('2018')).toHaveAccessibleName(/Haddad 32,0%.*Bolsonaro 68,0%/)
  await expect(bar('2022')).toHaveAccessibleName(/Lula 44,8%.*Bolsonaro 55,2%/)
  await expect(bar('2026')).toHaveAccessibleName(/Lula 46,2%.*Flávio 53,8%/)
  await expect(cycles.getByText('Ponto de partida da série')).toBeVisible()
  await expect(cycles.getByText('Lula: +12,7 pp vs 2018')).toBeVisible()
  await expect(cycles.getByText('Lula: +1,4 pp vs 2022')).toBeVisible()
})

test('frame 13: chips start with SP and follow the 2026 valid-vote order', async ({ page }) => {
  const chips = page.locator('[data-component="uf-chips"]')
  await expect(chips.locator('[aria-current="page"]')).toHaveText('SP')
  await expect(chips.locator('a').first()).toHaveText('MG') // the states follow by valid votes: sp, then mg...
})

test('frame 13: "Outros estados" = the five other states of the six largest, in order, with the frame pcts', async ({ page }) => {
  const ufs = await page.locator('[data-component="outros-estados"] > ul > li').evaluateAll((els) => els.map((e) => e.getAttribute('data-uf')))
  expect(ufs).toEqual(['mg', 'rj', 'ba', 'pr', 'rs'])
  const mg = page.locator('[data-component="outros-estados"] > ul > li[data-uf="mg"]')
  // MG: Lula 41,8% / 50,2% / 50,4% across the three cycles (right column of the frame)
  const pcts = await mg.locator('[data-mini-pcts] [data-cycle]').allTextContents()
  expect(pcts).toEqual(['Lula 41,8%', 'Lula 50,2%', 'Lula 50,4%'])
})

test('frame 13: links "Ver o estado ›" and "Ver os três ciclos de uma cidade ›"', async ({ page }) => {
  await expect(page.getByRole('link', { name: 'Ver o estado ›' })).toHaveAttribute('href', `${base}sp/`)
  await expect(page.getByRole('link', { name: 'Ver os três ciclos de uma cidade ›' })).toHaveAttribute('href', /\/sp\/.+-ciclos\/$/)
})

test('capture /tres-ciclos/sp/ / real data', async ({ page }) => {
  await page.evaluate(() => document.fonts.ready)
  const dir = resolve('.captures', 'comparar')
  mkdirSync(dir, { recursive: true })
  const file = resolve(dir, 'tres-ciclos-sp-real.png')
  await page.screenshot({ path: file, fullPage: true, animations: 'disabled' })
  writeFileSync(
    resolve(dir, 'tres-ciclos-sp-real.json'),
    JSON.stringify({ slot: 'tres-ciclos-sp', state: 'real-data', route: '/tres-ciclos/sp/', viewport: page.viewportSize(), fullPage: true, reference: 'site/reference/13-tres-ciclos-por-estado.png', capture: file }, null, 2) + '\n',
  )
})