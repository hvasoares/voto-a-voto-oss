import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { base } from './helpers'

/*
 * /mapa/ and /mapa/virada/ on the REAL dataset (run with `npm run test:real`). The numbers below
 * are the same pins of src/lib/margins.test.ts (swing/compare note: RJ +7.4, SP +6.0, MG flip).
 * State paths are asserted as PATHS only; state pages are not ported yet (#50).
 */
test.skip(!existsSync(resolve('../data/cities.csv')), 'no ../data')

test.describe('mapa on the real dataset', () => {
  test('the pair comes from the data: Lula 13 x Flavio 22 in 2026, named in the subtitle', async ({ page }) => {
    await page.goto(`${base}mapa/`)
    await expect(page.getByText(/Margem de Lula sobre Flavio no 2º turno de 2026/)).toBeVisible()
  })

  test('27 state tiles, no overseas, values on the tiles', async ({ page }) => {
    await page.goto(`${base}mapa/`)
    const ufs = await page.locator('[data-slot="state-map"] nav a[data-uf]').evaluateAll((els) => els.map((e) => e.getAttribute('data-uf')!))
    expect(ufs).toHaveLength(27)
    expect(ufs).not.toContain('zz')
    await expect(page.locator('a[data-uf="sp"]', { hasText: 'SP' })).toContainText('-7,7')
    await expect(page.locator('a[data-uf="mg"]', { hasText: 'MG' })).toContainText('+0,9')
    await expect(page.locator('a[data-uf="rj"]', { hasText: 'RJ' })).toContainText('-6,2')
  })

  test('the panel pre-selected the biggest round-2 turnout state (SP) with the note figures', async ({ page }) => {
    await page.goto(`${base}mapa/`)
    const panel = page.locator('[data-slot="mapa-selecionado"]')
    await expect(panel).toContainText('SP · selecionado')
    await expect(panel).toContainText('Votos válidos (2º turno): 26.258.452')
    await expect(panel).toContainText('-7,7 pp. Na eleição anterior: -13,7 pp.')
    await expect(page.getByRole('link', { name: 'Abrir estado' })).toHaveAttribute('href', `${base}sp/`)
  })

  test('the map view renders all 27 shapes and honours ?vista=mapa on a plain load', async ({ page }) => {
    await page.goto(`${base}mapa/?vista=mapa`)
    const svg = page.getByRole('img', { name: /^Mapa do Brasil por estado/ })
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
    await expect(page.locator('a[data-uf="rj"]', { hasText: 'RJ' })).toContainText('+7,4')
    await expect(page.locator('a[data-uf="sp"]', { hasText: 'SP' })).toContainText('+6,0')
    await expect(page.locator('a[data-uf="mg"]', { hasText: 'MG' })).toContainText('+5,8')
    await expect(page.locator('a[data-uf="al"]', { hasText: 'AL' })).toContainText('+7,3')
    await expect(page.locator('a[data-uf="se"]', { hasText: 'SE' })).toContainText('+6,9')
  })

  test('the panel tells the two margins of the selected state', async ({ page }) => {
    await page.goto(`${base}mapa/virada/`)
    const panel = page.locator('[data-slot="mapa-selecionado"]')
    await expect(panel).toContainText('era de -13,7 pp e passou para -7,7 pp. Variação: +6,0 pp.')
  })
})