import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { allowedOrigins, base, collectRequests, violations } from './helpers'

/*
 * /mapa/rj/ on the REAL dataset (run with `npm run test:real`): the per-city margins of the
 * highlights note (thoughts/team/data-engineering/2026-10-26-runoff-results-highlights.md), the
 * same pins of src/lib/margins-city.test.ts, now checked in the rendered page; the mesh join of
 * all 92 municipalities; the on-demand GET of the geo file; and a load/render time record.
 */
test.skip(!existsSync(resolve('../data/cities.csv')), 'no ../data')

test.describe('mapa/rj on the real dataset', () => {
  test('the pair comes from the data and the page names all 92 municipalities', async ({ page }) => {
    await page.goto(`${base}mapa/rj/`)
    await expect(page.getByText(/Margem de Lula sobre Flávio no 2º turno de 2026, em pontos percentuais \(pp\), nos 92 municípios/)).toBeVisible()
    const rows = await page.locator('[data-slot="city-map"] nav a[data-cd]').evaluateAll((els) => els.map((el) => el.getAttribute('data-cd')!))
    expect(rows).toHaveLength(92)
    expect(new Set(rows).size).toBe(92)
  })

  test('the pinned per-city figures of the highlights note are on the list rows', async ({ page }) => {
    await page.goto(`${base}mapa/rj/`)
    // Rio: round-2 +3,1pp (the note's +113k net votes on 3.68M valid)
    const rio = page.locator('a[data-cd-ibge="3304557"]')
    await expect(rio).toContainText('+3,1')
    // Campos dos Goytacazes: -15,8pp; Belford Roxo -12,3pp in the runoff (swing +8,6, pinned in vitest)
    await expect(page.locator('a[data-cd-ibge="3301009"]')).toContainText('-15,8')
    await expect(page.locator('a[data-cd-ibge="3300456"]')).toContainText('-12,3')
    // Barra do Piraí flips: -5,1 -> +4,2 in the panel of the tapped row
    await page.locator('a[data-cd-ibge="3300308"]').click()
    const panel = page.locator('[data-slot="mapa-selecionado"]')
    await expect(panel).toContainText(/Margem \(Lula − Flávio Bolsonaro\): \+4,2 pp\. Na eleição anterior: -5,1 pp\. Variação: \+9,3 pp\./)
  })

  test('the default selection is Rio de Janeiro with the note figures in the panel', async ({ page }) => {
    await page.goto(`${base}mapa/rj/`)
    const panel = page.locator('[data-slot="mapa-selecionado"]')
    await expect(panel).toContainText('Rio de Janeiro · selecionado')
    await expect(panel).toContainText('Votos válidos (2º turno): 3.683.589')
    await expect(panel).toContainText(/Margem \(Lula − Flávio Bolsonaro\): \+3,1 pp\. Na eleição anterior: -4,0 pp\. Variação: \+7,0 pp\./)
    await expect(panel.getByRole('link', { name: 'Abrir cidade' })).toHaveAttribute('href', `${base}rj/rio-de-janeiro/`)
  })

  test('the map view joins all 92 shapes (no unmatched, no without-fill note) and honours ?vista=mapa', async ({ page }) => {
    const t0 = Date.now()
    await page.goto(`${base}mapa/rj/?vista=mapa`)
    const map = page.locator('[data-slot="mapa-municipios"]')
    await expect(map).toBeVisible()
    const cds = await map.locator('a[data-cd-ibge]').evaluateAll((els) => els.map((e) => e.getAttribute('data-cd-ibge')!))
    const ms = Date.now() - t0
    expect(new Set(cds).size).toBe(92)
    expect(cds.every((cd) => cd!.startsWith('33'))).toBe(true)
    await expect(map.locator('[data-slot="malha-sem-dados"]')).toHaveCount(0)
    await expect(page.locator('[data-slot="escala-sem-dados"]')).toHaveCount(0)
    // the biggest municipality (Rio) shows its inline value at the default zoom (labels are the
    // second SVG pass, groups above every fill, so a neighbour's fill never overprints a value)
    await expect(map.locator('g[data-cd-ibge="3304557"]')).toContainText('+3,1')
    console.log(`mapa/rj: mesh joined and SVG rendered in ${ms}ms (92 shapes, phone viewport)`)
    expect(ms).toBeLessThan(20_000)
  })

  test('the geo file is a single on-demand GET to the site origin; nothing else is requested', async ({ page }) => {
    const seen = collectRequests(page)
    await page.goto(`${base}mapa/rj/`)
    await page.waitForLoadState('networkidle')
    const geoOnLoad = seen.filter((r) => new URL(r.url).pathname.includes('/geo/'))
    expect(geoOnLoad).toEqual([]) // nothing before the map view
    // hydrate with a row tap first (client:interaction); the toggle then switches in-page
    await page.locator('a[data-cd-ibge="3300308"]').click()
    await expect(page.locator('[data-slot="mapa-selecionado"]')).toContainText('Barra do Piraí')
    await page.getByRole('link', { name: 'Mapa', exact: true }).click()
    await expect(page.locator('[data-slot="mapa-municipios"] a[data-cd-ibge]')).toHaveCount(92, { timeout: 15_000 })
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
    await expect(page.locator('[data-slot="mapa-municipios"] a[data-cd-ibge]')).toHaveCount(92, { timeout: 15_000 })
    const mapIbges = await page.locator('[data-slot="mapa-municipios"] a[data-cd-ibge]').evaluateAll((els) => els.map((e) => e.getAttribute('data-cd-ibge')!))
    expect(listCds).toHaveLength(92)
    expect(new Set(listCds)).toEqual(new Set(mapIbges))
  })
})