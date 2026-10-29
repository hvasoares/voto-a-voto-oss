import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { base } from './helpers'
import { dataGuard } from './presets'
import { catalogText, dec1, signedDec1, statesByValidVotes, twoWayShare } from './real-data-oracle'

/*
 * /tres-ciclos/sp/ (screen 13) against the real committed dataset (run with `npm run test:real`).
 * The shares of the three cycles' runoffs in SP and MG, the change lines and the order of the chips and of the "Outros estados"
 * (the states by valid votes) are counted by the oracle from the data directory (frame "13 Três ciclos por estado").
 */
test.skip(...dataGuard('votes.csv'))

const SECOND_FINALIST: Record<number, string> = { 2018: '17', 2022: '22', 2026: '22' }
/** The cycle's runoff short names of the two finalists, as the bars and chips print them. */
const NAMES: Record<number, [string, string]> = { 2018: ['Haddad', 'Bolsonaro'], 2022: ['Lula', 'Bolsonaro'], 2026: ['Lula', 'Flávio'] }
/** The first finalist's two-way share of a state in a cycle, as a number. */
const lulaShare = (uf: string, ano: number) => twoWayShare({ ano, turno: 2 }, '13', SECOND_FINALIST[ano]!, { uf })
/** The rounded shares the bar prints: "Haddad 32,0% ... Bolsonaro 68,0%". */
const barName = (uf: string, ano: number) => {
  const [first, second] = NAMES[ano]!
  return new RegExp(`${first} ${dec1(lulaShare(uf, ano))}%.*${second} ${dec1(100 - lulaShare(uf, ano))}%`)
}
/** Change in points against the earlier cycle, as the page prints it (the unrounded difference, rounded once). */
const change = (uf: string, ano: number, vs: number) => signedDec1(lulaShare(uf, ano) - lulaShare(uf, vs))

test.beforeEach(async ({ page }) => {
  await page.goto(`${base}tres-ciclos/sp/`)
})

test('frame 13: the three SP blocks with the frame rates and the change lines', async ({ page }) => {
  const cycles = page.locator('[data-component="cycles"]')
  const bar = (ano: string) => cycles.locator(`[data-cycle="${ano}"] [role="img"]`)
  for (const ano of [2018, 2022, 2026]) await expect(bar(String(ano))).toHaveAccessibleName(barName('sp', ano))
  await expect(cycles.getByText(catalogText('recap.start'))).toBeVisible()
  await expect(cycles.getByText(`Lula: ${change('sp', 2022, 2018)} pp vs 2018`)).toBeVisible()
  await expect(cycles.getByText(`Lula: ${change('sp', 2026, 2022)} pp vs 2022`)).toBeVisible()
})

test('frame 13: chips start with SP and follow the 2026 valid-vote order', async ({ page }) => {
  const chips = page.locator('[data-component="uf-chips"]')
  await expect(chips.locator('[aria-current="page"]')).toHaveText('SP')
  await expect(chips.locator('a').first()).toHaveText(statesByValidVotes({ ano: 2026, turno: 2 })[1]!.toUpperCase()) // the states follow by valid votes: sp, then the next...
})

test('frame 13: "Outros estados" = the five other states of the six largest, in order, with the frame pcts', async ({ page }) => {
  const ufs = await page.locator('[data-component="outros-estados"] > ul > li').evaluateAll((els) => els.map((e) => e.getAttribute('data-uf')))
  const [, ...others] = statesByValidVotes({ ano: 2026, turno: 2 }).slice(0, 6)
  expect(ufs).toEqual(others)
  const first = page.locator(`[data-component="outros-estados"] > ul > li[data-uf="${others[0]}"]`)
  // The first of them across the three cycles: the first finalist's name and share (right column of the frame)
  const pcts = await first.locator('[data-mini-pcts] [data-cycle]').allTextContents()
  expect(pcts).toEqual([2018, 2022, 2026].map((ano) => `${NAMES[ano]![0]} ${dec1(lulaShare(others[0]!, ano))}%`))
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