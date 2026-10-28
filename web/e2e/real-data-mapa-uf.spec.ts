import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { allowedOrigins, base, collectRequests, violations } from './helpers'

/*
 * The #17 route on the REAL dataset (run with `npm run test:real`): spot e2e over a spread of UFs --
 * MG (the largest mesh, the one tuned to tolerance 0.012), MT (the 2026-only municipality
 * Boa Esperança do Norte, TSE 73709 / IBGE 5101837, no mesh shape), SP, RS, DF and RR. Every list
 * row must carry the 7-digit IBGE code of its mesh shape (the join), the geo file must be a single
 * on-demand GET to the site origin, and the only without-boundary state must be MT.
 */
test.skip(!existsSync(resolve('../data/cities.csv')), 'no ../data')

const COUNTS: Record<string, number> = { df: 1, rr: 15, rs: 497, sp: 645, mg: 853, mt: 142 }
const UF_CODE: Record<string, string> = { df: '53', rr: '14', rs: '43', sp: '35', mg: '31', mt: '51' }
const UFS = Object.keys(COUNTS)

test.describe('mapa/<uf> across the dataset (spot e2e)', () => {
  for (const uf of UFS) {
    test(`${uf}: the list has every municipality, keyed by its 7-digit IBGE code`, async ({ page }) => {
      await page.goto(`${base}mapa/${uf}/`)
      const rows = await page.locator('[data-slot="city-map"] nav a[data-cd-ibge]').evaluateAll((els) =>
        els.map((e) => e.getAttribute('data-cd-ibge')!),
      )
      expect(rows, `${uf} rows`).toHaveLength(COUNTS[uf]!)
      expect(new Set(rows).size, `${uf} distinct IBGE codes`).toBe(COUNTS[uf]!)
      // the whole state sits under the state's IBGE prefix (the join key domain)
      expect(rows.every((cd) => cd!.startsWith(UF_CODE[uf]!)), `${uf} prefix`).toBe(true)
      await expect(page.locator('[data-slot="escala-sem-contorno"]')).toHaveCount(uf === 'mt' ? 1 : 0)
      if (uf !== 'mt') await expect(page.locator('[data-slot="malha-sem-dados"]')).toHaveCount(0)
    })
  }

  test('mt: the 2026-only municipality is listed with its figures but no shape, under the sem-contorno note', async ({ page }) => {
    await page.goto(`${base}mapa/mt/`)
    // TSE 73709 does have 2026 votes (Lula 945 x 2.353 on 3.298 valid) but the IBGE mesh has no
    // boundary for Boa Esperança do Norte yet: the row shows its figures like any other, while the
    // map view simply has no shape for it and the legend notes the missing boundary.
    const row = page.locator('a[data-cd-ibge="5101837"]')
    await expect(row).toContainText('Boa Esperança do Norte')
    await expect(row).toContainText('-42,7 pp')
    await expect(row).toContainText('3.298')
    await expect(page.locator('[data-slot="escala-sem-contorno"]')).toContainText('Sem contorno: 1 município não tem fronteira no arquivo do IBGE')
    // the other 141 municipalities all join their mesh shape
    await page.goto(`${base}mapa/mt/?vista=mapa`)
    await expect(page.locator('[data-slot="mapa-municipios"] a[data-cd-ibge]')).toHaveCount(141, { timeout: 15_000 })
    expect(await page.locator('[data-slot="mapa-municipios"] a[data-cd-ibge="5101837"]').count()).toBe(0)
  })

  test('mg: the largest mesh loads and draws every one of its 853 shapes', async ({ page }) => {
    const t0 = Date.now()
    await page.goto(`${base}mapa/mg/?vista=mapa`)
    const map = page.locator('[data-slot="mapa-municipios"]')
    await expect(map.locator('a[data-cd-ibge]')).toHaveCount(853, { timeout: 25_000 })
    await expect(map.locator('[data-slot="malha-sem-dados"]')).toHaveCount(0)
    const ms = Date.now() - t0
    console.log(`mapa/mg: mesh joined and SVG rendered in ${ms}ms (853 shapes, phone viewport)`)
    expect(ms).toBeLessThan(25_000)
  })

  test('df: the 1-municipality state map works end to end with a single on-demand GET', async ({ page }) => {
    const seen = collectRequests(page)
    await page.goto(`${base}mapa/df/`)
    await expect(page.getByText(/no 1 município do estado/)).toBeVisible()
    await page.getByRole('link', { name: 'Mapa', exact: true }).click()
    await expect(page.locator('[data-slot="mapa-municipios"]')).toBeVisible()
    await expect(page.locator('[data-slot="mapa-selecionado"]')).toContainText('Brasília')
    await page.waitForLoadState('networkidle')
    const geo = seen.filter((r) => new URL(r.url).pathname.includes('/geo/'))
    expect(geo.map((r) => [r.method, new URL(r.url).pathname])).toEqual([['GET', '/geo/municipios-df.json']])
    expect(violations(seen, await allowedOrigins(new URL(page.url()).origin))).toEqual([])
  })
})