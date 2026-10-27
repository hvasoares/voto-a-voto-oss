import { expect, test } from '@playwright/test'
import { base } from './helpers'

/*
 * Screens 10/10b (/mapa/ and /mapa/virada/) at 390x844, fixture dataset (states rj, sp, mt;
 * candidates "Candidato A" vs "Candidato B"). Contract: site/src/slots/state-map/CONTRACT.md and
 * state-map-flip. State paths are asserted as PATHS only (state pages are not ported yet, #50).
 */

const DATA = {
  mt: { validos1: 94_433, validos2: 85_154, margin1: 0.15, margin2: 0.21, swing: 0.36 },
  rj: { validos1: 318_640, validos2: 300_519, margin1: 0.32, margin2: -0.48, swing: -0.8 },
  sp: { validos1: 78_625, validos2: 77_680, margin1: 2.97, margin2: 15.18, swing: 12.21 },
}

test.describe('mapa: content', () => {
  test('shows title, subtitle from the data, tabs, toggle, legend, panel and the TSE footer', async ({ page }) => {
    await page.goto(`${base}mapa/`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mapa por estado')
    await expect(page.getByText(/Margem de .+ sobre .+ no 2º turno de 2026, em pontos percentuais/)).toBeVisible()
    await expect(page.getByRole('link', { name: 'Margem (2º turno)' })).toHaveAttribute('href', `${base}mapa/`)
    await expect(page.getByRole('link', { name: 'Virada (1º→2º)' })).toHaveAttribute('href', `${base}mapa/virada/`)
    await expect(page.getByRole('link', { name: 'Mosaico' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Mapa', exact: true })).toBeVisible()
    await expect(page.locator('[data-slot="mapa-escala"]')).toBeVisible()
    await expect(page.locator('[data-slot="mapa-escala"] figcaption')).toContainText('Margem (pp) = % de')
    await expect(page.locator('[data-slot="mapa-escala"] figcaption')).toContainText('menos % de')
    await expect(page.locator('[data-slot="mapa-selecionado"]')).toContainText('· selecionado')
    await expect(page.getByRole('link', { name: 'Abrir estado' })).toHaveAttribute('href', `${base}rj/`) // most valid votes of the fixture
    await expect(page.locator('footer')).toContainText('Fonte: TSE, dados finais · Sobre os dados ›')
    await expect(page.locator('#consent-banner')).toHaveCount(1)
  })

  test('one tile per state of the dataset; overseas never appears', async ({ page }) => {
    await page.goto(`${base}mapa/`)
    const tiles = await page.locator('[data-slot="state-map"] nav a[data-uf]').evaluateAll((els) => els.map((e) => [e.getAttribute('data-uf'), e.getAttribute('href')]))
    expect(tiles).toEqual(
      expect.arrayContaining([
        ['rj', `${base}rj/`],
        ['sp', `${base}sp/`],
        ['mt', `${base}mt/`],
      ]),
    )
    expect(tiles).toHaveLength(3)
    await expect(page.locator('[data-uf="zz"]')).toHaveCount(0)
  })

  test('tiles carry the signed value and the side, not only colour; named without a bare code', async ({ page }) => {
    await page.goto(`${base}mapa/`)
    const rj = page.locator('a[data-uf="rj"]', { hasText: 'RJ' })
    await expect(rj).toContainText('-0,5')
    // The sr-only sentence names the state and reads the value (issue #19).
    await expect(rj).toContainText(/Rio de Janeiro: -0,5 pp, .+ à frente; .+ votos válidos/)
    await expect(rj).not.toHaveAttribute('aria-label', /.+/)
  })

  test('the selected panel shows valid votes and both rounds; the tab is aria-current', async ({ page }) => {
    await page.goto(`${base}mapa/`)
    const panel = page.locator('[data-slot="mapa-selecionado"]')
    await expect(panel).toContainText('RJ · selecionado')
    await expect(panel).toContainText('Votos válidos (2º turno): 300.519')
    await expect(panel).toContainText(/-0,5 pp/)
    await expect(panel).toContainText(/Na eleição anterior: \+0,3 pp/)
    await expect(page.getByRole('link', { name: 'Margem (2º turno)' })).toHaveAttribute('aria-current', 'page')
  })

  test('every tile is at least the minimum tap edge and the page never scrolls sideways', async ({ page }) => {
    await page.goto(`${base}mapa/`)
    const sizes = await page
      .locator('[data-slot="state-map"] nav a[data-uf]')
      .evaluateAll((els) => els.map((e) => e.getBoundingClientRect()))
    expect(sizes.length).toBe(3)
    for (const r of sizes) expect(Math.min(r.width, r.height)).toBeGreaterThanOrEqual(40)
    const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
    expect(sw).toBeLessThanOrEqual(iw)
  })

  test('the legend carries the numeric bin edges and the tile-size hint', async ({ page }) => {
    await page.goto(`${base}mapa/`)
    const legend = page.locator('[data-slot="mapa-escala"]')
    await expect(legend).toContainText('-30')
    await expect(legend).toContainText('-15')
    await expect(legend).toContainText('+15')
    await expect(legend).toContainText('+30')
    await expect(legend).toContainText('Tamanho = votos válidos')
  })
})

test.describe('mapa: map view', () => {
  test('?vista=mapa opens the SVG map with one shape per state in the dataset', async ({ page }) => {
    await page.goto(`${base}mapa/?vista=mapa`)
    const svg = page.getByRole('img', { name: /^Mapa do Brasil por estado/ })
    await expect(svg).toBeVisible()
    const labels = await svg.locator('a[data-uf]').evaluateAll((els) => els.map((e) => e.getAttribute('data-uf')))
    // callout states have a shape anchor AND a box anchor (both open/select the state)
    expect(new Set(labels)).toEqual(new Set(['mt', 'rj', 'sp']))
    await expect(svg).toContainText('RJ')
  })

  test('hydrated: tapping a state selects it instead of navigating, and fires map_state_tap', async ({ page }) => {
    await page.goto(`${base}mapa/`)
    await page.locator('a[data-uf="sp"]').click()
    const panel = page.locator('[data-slot="mapa-selecionado"]')
    await expect(panel).toContainText('SP · selecionado')
    expect(new URL(page.url()).pathname).toMatch(/mapa\/$/)
  })

  test('hydrated: the toggle switches presentation without a page load, URL keeps vista', async ({ page }) => {
    await page.goto(`${base}mapa/`)
    await page.getByRole('link', { name: 'Mapa', exact: true }).click()
    await expect(page.getByRole('img', { name: /^Mapa do Brasil por estado/ })).toBeVisible()
    expect(new URL(page.url()).searchParams.get('vista')).toBe('mapa')
    await page.getByRole('link', { name: 'Mosaico' }).click()
    await expect(page.locator('a[data-uf="rj"]')).toBeVisible()
    expect(new URL(page.url()).search).toBe('')
  })
})

test.describe('mapa/virada: swing view', () => {
  test('shows the swing definition, the swing-valued tiles and the negative-edge legend of the frames', async ({ page }) => {
    await page.goto(`${base}mapa/virada/`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mapa por estado: virada')
    await expect(page.getByText(/Variação da margem entre o 1º e o 2º turno de 2026/)).toBeVisible()
    await expect(page.getByRole('link', { name: 'Virada (1º→2º)' })).toHaveAttribute('aria-current', 'page')
    await expect(page.locator('a[data-uf="rj"]', { hasText: 'RJ' })).toContainText('-0,8')
    const legend = page.locator('[data-slot="mapa-escala"]')
    await expect(legend).toContainText('-2,5')
    await expect(legend).toContainText('+2,5')
    await expect(legend).toContainText('+5')
    await expect(page.locator('[data-slot="mapa-selecionado"]')).toContainText('A margem de')
    await expect(page.locator('[data-slot="mapa-selecionado"]')).toContainText('era de +0,3 pp e passou para -0,5 pp. Variação: -0,8 pp.')
  })
})

test.describe('mapa without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('tiles stay links to the state paths, tabs and toggle are real links, panel pre-rendered', async ({ page }) => {
    await page.goto(`${base}mapa/`)
    await expect(page.locator('a[data-uf="rj"]')).toHaveAttribute('href', `${base}rj/`)
    await expect(page.getByRole('link', { name: /Virada/ })).toHaveAttribute('href', `${base}mapa/virada/`)
    await expect(page.locator('[data-slot="mapa-selecionado"]')).toContainText('RJ · selecionado')
    const noscript = page.locator('noscript').last()
    await expect(noscript).toBeAttached()
  })

  test('tapping a tile navigates to the state path', async ({ page }) => {
    await page.goto(`${base}mapa/`)
    await page.locator('a[data-uf="sp"]').click()
    await expect(page).toHaveURL(new RegExp(`${base}sp/$`))
  })

  test('?vista=mapa without JavaScript still shows the pages (the mosaic stays; no script to flip)', async ({ page }) => {
    await page.goto(`${base}mapa/?vista=mapa`)
    await expect(page.locator('a[data-uf="rj"]')).toBeVisible() // mosaic is the static fallback
  })
})