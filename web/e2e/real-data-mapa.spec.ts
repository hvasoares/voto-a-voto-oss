import { expect, test } from '@playwright/test'
import { base } from './helpers'
import { dataGuard } from './presets'
import { int, marginPp, signedDec1, swingPp, turnoutSum } from './real-data-oracle'

/*
 * /mapa/ and /mapa/virada/ on the REAL dataset (run with `npm run test:real`). The margins and swings are counted by the
 * oracle from the data directory's votes.csv and turnout.csv, never typed.
 * State paths are asserted as PATHS only; state pages are not ported yet (#50).
 */
test.skip(...dataGuard())

const LULA = '13'
const FLAVIO = '22'
const ROUND = { ano: 2026, turno: 2 }
const ROUND1 = { ano: 2026, turno: 1 }
/** A state's margin, in the form the maps print it: "-7,7" / "+0,9" (counted from the data directory). */
const margin = (uf: string) => signedDec1(marginPp(ROUND, LULA, FLAVIO, { uf }))
const swing = (uf: string) => signedDec1(swingPp(2026, LULA, FLAVIO, { uf }))
const previous = (uf: string) => signedDec1(marginPp(ROUND1, LULA, FLAVIO, { uf }))
const valid = (uf: string) => int(turnoutSum(ROUND, { uf }).validos)

test.describe('mapa on the real dataset', () => {
  test('the pair comes from the data: Lula 13 x Flávio 22 in 2026, named in the subtitle', async ({ page }) => {
    await page.goto(`${base}mapa/`)
    await expect(page.getByText(/Margem de Lula sobre Flávio no 2º turno de 2026/)).toBeVisible()
  })

  test('27 state tiles, no overseas, values on the tiles', async ({ page }) => {
    await page.goto(`${base}mapa/`)
    const ufs = await page.locator('[data-slot="state-map"] nav a[data-uf]').evaluateAll((els) => els.map((e) => e.getAttribute('data-uf')!))
    expect(ufs).toHaveLength(27)
    expect(ufs).not.toContain('zz')
    for (const uf of ['sp', 'mg', 'rj']) await expect(page.locator(`a[data-uf="${uf}"]`, { hasText: uf.toUpperCase() })).toContainText(margin(uf))
  })

  test('the panel pre-selected the biggest round-2 turnout state (SP) with the note figures', async ({ page }) => {
    await page.goto(`${base}mapa/`)
    const panel = page.locator('[data-slot="mapa-selecionado"]')
    await expect(panel).toContainText('SP · selecionado')
    await expect(panel).toContainText(`Votos válidos (2º turno): ${valid('sp')}`)
    await expect(panel).toContainText(`${margin('sp')} pp. Na eleição anterior: ${previous('sp')} pp.`)
    await expect(page.getByRole('link', { name: 'Abrir estado' })).toHaveAttribute('href', `${base}sp/`)
  })

  test('the map view renders all 27 shapes and honours ?vista=mapa on a plain load', async ({ page }) => {
    await page.goto(`${base}mapa/?vista=mapa`)
    const svg = page.getByRole('img', { name: /^Mapa do Brasil por estado/ })
    // The map is island-rendered after hydration and the state mesh arrives by fetch: wait for the
    // first shape before the anchor harvest. Small NE states carry a shape plus a callout anchor
    // (the side value boxes are anchors too), so the pin is the DISTINCT uf count, 27.
    await expect(svg.locator('a[data-uf]').first()).toBeVisible({ timeout: 15_000 })
    const anchors = await svg.locator('a[data-uf]').evaluateAll((els) => els.map((e) => e.getAttribute('data-uf')!))
    expect(new Set(anchors).size).toBe(27)
    await expect(svg).toContainText('SP')
  })

  test('hydrated tap selects instead of navigating', async ({ page }) => {
    await page.goto(`${base}mapa/`)
    await page.locator('a[data-uf="rj"]').click()
    await expect(page.locator('[data-slot="mapa-selecionado"]')).toContainText('RJ · selecionado')
    expect(new URL(page.url()).pathname).toMatch(/mapa\/$/)
  })
})

test.describe('mapa/virada on the real dataset', () => {
  test('the swings match the note; no negative swing, so the legend carries the frame note', async ({ page }) => {
    await page.goto(`${base}mapa/virada/`)
    const legend = page.locator('[data-slot="mapa-escala"]')
    await expect(legend).toContainText('Sem estados com variação negativa')
    await expect(legend).not.toContainText('-5')
    for (const uf of ['rj', 'sp', 'mg', 'al', 'se']) await expect(page.locator(`a[data-uf="${uf}"]`, { hasText: uf.toUpperCase() })).toContainText(swing(uf))
  })

  test('the panel tells the two margins of the selected state', async ({ page }) => {
    await page.goto(`${base}mapa/virada/`)
    const panel = page.locator('[data-slot="mapa-selecionado"]')
    await expect(panel).toContainText(`era de ${previous('sp')} pp e passou para ${margin('sp')} pp. Variação: ${swing('sp')} pp.`)
  })
})