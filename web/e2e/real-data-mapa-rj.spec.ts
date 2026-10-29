import { expect, test } from '@playwright/test'
import { allowedOrigins, base, collectRequests, violations } from './helpers'
import { dataGuard } from './presets'
import { cityBySlug, cityCount, int, marginPp, signedDec1, swingPp, turnoutSum } from './real-data-oracle'

/*
 * /mapa/rj/ on the REAL dataset (run with `npm run test:real`): the per-city margins of a few named cities
 * (counted by the oracle from the data directory, not typed), checked in the rendered page; the mesh join of
 * all the state's municipalities; the on-demand GET of the geo file; and a load/render time record.
 */
test.skip(...dataGuard())

const ROUND = { ano: 2026, turno: 2 }
const ROUND1 = { ano: 2026, turno: 1 }
/** The cities the specs name, by path (their figures are counted from the data directory). */
const place = (slug: string) => {
  const c = cityBySlug('rj', slug)
  const where = { uf: 'rj', cd: c.cd }
  return {
    ibge: c.ibge,
    margin: signedDec1(marginPp(ROUND, '13', '22', where)),
    previous: signedDec1(marginPp(ROUND1, '13', '22', where)),
    swing: signedDec1(swingPp(2026, '13', '22', where)),
    valid: int(turnoutSum(ROUND, where).validos),
  }
}
const total = () => cityCount('rj')

test.describe('mapa/rj on the real dataset', () => {
  test('the pair comes from the data and the page names every municipality of the state', async ({ page }) => {
    await page.goto(`${base}mapa/rj/`)
    await expect(page.getByText(new RegExp(`Margem de Lula sobre Flávio no 2º turno de 2026, em pontos percentuais \\(pp\\), nos ${total()} municípios`))).toBeVisible()
    const rows = await page.locator('[data-slot="city-map"] nav a[data-cd]').evaluateAll((els) => els.map((el) => el.getAttribute('data-cd')!))
    expect(rows).toHaveLength(total())
    expect(new Set(rows).size).toBe(total())
  })

  test('the pinned per-city figures of the highlights note are on the list rows', async ({ page }) => {
    await page.goto(`${base}mapa/rj/`)
    // Rio, Campos dos Goytacazes and Belford Roxo: the round-2 margin on the list row
    for (const slug of ['rio-de-janeiro', 'campos-dos-goytacazes', 'belford-roxo']) {
      const { ibge, margin } = place(slug)
      await expect(page.locator(`a[data-cd-ibge="${ibge}"]`), slug).toContainText(margin)
    }
    // Barra do Piraí flips: the margins of both rounds in the panel of the tapped shape (a tap on a list row opens the City card, #83)
    await page.goto(`${base}mapa/rj/?vista=mapa`)
    await expect(page.locator('[data-slot="mapa-municipios"] a[data-cd-ibge]')).toHaveCount(total(), { timeout: 15_000 })
    const barra = place('barra-do-pirai')
    await page.locator(`[data-slot="mapa-municipios"] a[data-cd-ibge="${barra.ibge}"]`).dispatchEvent('click')
    const panel = page.locator('[data-slot="mapa-selecionado"]')
    await expect(panel).toContainText(`Margem (Lula − Flávio Bolsonaro): ${barra.margin} pp. Na eleição anterior: ${barra.previous} pp. Variação: ${barra.swing} pp.`)
  })

  test('the default selection is Rio de Janeiro with the note figures in the panel (map view)', async ({ page }) => {
    await page.goto(`${base}mapa/rj/?vista=mapa`)
    const panel = page.locator('[data-slot="mapa-selecionado"]')
    await expect(panel).toContainText('Rio de Janeiro · selecionado')
    const rio = place('rio-de-janeiro')
    await expect(panel).toContainText(`Votos válidos (2º turno): ${rio.valid}`)
    await expect(panel).toContainText(`Margem (Lula − Flávio Bolsonaro): ${rio.margin} pp. Na eleição anterior: ${rio.previous} pp. Variação: ${rio.swing} pp.`)
    await expect(panel.getByRole('link', { name: 'Abrir cidade' })).toHaveAttribute('href', `${base}rj/rio-de-janeiro/`)
  })

  test('the map view joins every shape (no unmatched, no without-fill note) and honours ?vista=mapa', async ({ page }) => {
    const t0 = Date.now()
    await page.goto(`${base}mapa/rj/?vista=mapa`)
    const map = page.locator('[data-slot="mapa-municipios"]')
    await expect(map).toBeVisible()
    const cds = await map.locator('a[data-cd-ibge]').evaluateAll((els) => els.map((e) => e.getAttribute('data-cd-ibge')!))
    const ms = Date.now() - t0
    expect(new Set(cds).size).toBe(total())
    expect(cds.every((cd) => cd!.startsWith(place('rio-de-janeiro').ibge.slice(0, 2)))).toBe(true)
    await expect(map.locator('[data-slot="malha-sem-dados"]')).toHaveCount(0)
    await expect(page.locator('[data-slot="escala-sem-dados"]')).toHaveCount(0)
    // the biggest municipality (Rio) shows its inline value at the default zoom (labels are the
    // second SVG pass, groups above every fill, so a neighbour's fill never overprints a value)
    await expect(map.locator(`g[data-cd-ibge="${place('rio-de-janeiro').ibge}"]`)).toContainText(place('rio-de-janeiro').margin)
    console.log(`mapa/rj: mesh joined and SVG rendered in ${ms}ms (${total()} shapes, phone viewport)`)
    expect(ms).toBeLessThan(20_000)
  })

  test('the geo file is a single on-demand GET to the site origin; nothing else is requested', async ({ page }) => {
    const seen = collectRequests(page)
    await page.goto(`${base}mapa/rj/`)
    await page.waitForLoadState('networkidle')
    const geoOnLoad = seen.filter((r) => new URL(r.url).pathname.includes('/geo/'))
    expect(geoOnLoad).toEqual([]) // nothing before the map view
    // the toggle tap hydrates the island (client:interaction) and is kept through the hydration
    await page.getByRole('link', { name: 'Mapa', exact: true }).click()
    await expect(page.locator('[data-slot="mapa-municipios"] a[data-cd-ibge]')).toHaveCount(total(), { timeout: 15_000 })
    await page.waitForLoadState('networkidle')
    const geo = seen.filter((r) => new URL(r.url).pathname.includes('/geo/'))
    expect(geo.map((r) => [r.method, new URL(r.url).pathname])).toEqual([['GET', '/geo/municipios-rj.json']])
    expect(violations(seen.filter((r) => !geo.includes(r)), await allowedOrigins(new URL(page.url()).origin))).toEqual([])
  })

  test('municipal geometry is identical to the dataset join: every row has a drawn shape and vice versa', async ({ page }) => {
    // the list rows (hydrated page, ?vista=mapa unmounts the list, so harvest them first)...
    await page.goto(`${base}mapa/rj/`)
    const listCds = await page.locator('[data-slot="city-map"] nav a[data-cd-ibge]').evaluateAll((els) => els.map((e) => e.getAttribute('data-cd-ibge')!))
    // ...then the map: every mesh shape joins a list row, and every list row has its shape
    await page.goto(`${base}mapa/rj/?vista=mapa`)
    await expect(page.locator('[data-slot="mapa-municipios"] a[data-cd-ibge]')).toHaveCount(total(), { timeout: 15_000 })
    const mapIbges = await page.locator('[data-slot="mapa-municipios"] a[data-cd-ibge]').evaluateAll((els) => els.map((e) => e.getAttribute('data-cd-ibge')!))
    expect(listCds).toHaveLength(total())
    expect(new Set(listCds)).toEqual(new Set(mapIbges))
  })
})