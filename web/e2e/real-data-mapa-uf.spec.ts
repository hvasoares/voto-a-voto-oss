import { expect, test } from '@playwright/test'
import { allowedOrigins, base, collectRequests, violations } from './helpers'
import { dataGuard } from './presets'
import { cityCount, dataset, int, marginPp, signedDec1, turnoutSum } from './real-data-oracle'

/*
 * The #17 route on the REAL dataset (run with `npm run test:real`): spot e2e over a spread of UFs --
 * MG (the largest mesh, the one tuned to tolerance 0.012), MT (its 2026-only municipality has no mesh shape),
 * SP, RS, DF and RR. Every list row must carry the 7-digit IBGE code of its mesh shape (the join), the geo
 * file must be a single on-demand GET to the site origin, and the only without-boundary state must be MT.
 * The municipality counts and IBGE prefixes are counted from the data directory's cities.csv.
 */
test.skip(...dataGuard())

const UFS = ['df', 'rr', 'rs', 'sp', 'mg', 'mt']
/** The 2-digit IBGE prefix of a state (the join key domain), read off its first municipality. */
const ufCode = (uf: string) => dataset().cities.find((c) => c.uf === uf)!.ibge.slice(0, 2)
/** The municipality that exists in the 2026 election only (a younger one than the IBGE mesh). */
const newcomer = (uf: string) => dataset().cities.find((c) => c.uf === uf && c.ciclos.join(';') === '2026')!
const ROUND = { ano: 2026, turno: 2 }

test.describe('mapa/<uf> across the dataset (spot e2e)', () => {
  for (const uf of UFS) {
    test(`${uf}: the list has every municipality, keyed by its 7-digit IBGE code`, async ({ page }) => {
      await page.goto(`${base}mapa/${uf}/`)
      const rows = await page.locator('[data-slot="city-map"] nav a[data-cd-ibge]').evaluateAll((els) =>
        els.map((e) => e.getAttribute('data-cd-ibge')!),
      )
      expect(rows, `${uf} rows`).toHaveLength(cityCount(uf))
      expect(new Set(rows).size, `${uf} distinct IBGE codes`).toBe(cityCount(uf))
      // the whole state sits under the state's IBGE prefix (the join key domain)
      expect(rows.every((cd) => cd!.startsWith(ufCode(uf))), `${uf} prefix`).toBe(true)
      await expect(page.locator('[data-slot="escala-sem-contorno"]')).toHaveCount(uf === 'mt' ? 1 : 0)
      if (uf !== 'mt') await expect(page.locator('[data-slot="malha-sem-dados"]')).toHaveCount(0)
    })
  }

  test('mt: the 2026-only municipality is listed with its figures but no shape, under the sem-contorno note', async ({ page }) => {
    await page.goto(`${base}mapa/mt/`)
    // The 2026-only municipality has votes in 2026 but the IBGE mesh has no boundary for it yet: the row shows its
    // figures like any other, while the map view simply has no shape for it and the legend notes the missing boundary.
    const young = newcomer('mt')
    const where = { uf: 'mt', cd: young.cd }
    const row = page.locator(`a[data-cd-ibge="${young.ibge}"]`)
    await expect(row).toContainText(young.nome, { ignoreCase: true })
    await expect(row).toContainText(`${signedDec1(marginPp(ROUND, '13', '22', where))} pp`)
    await expect(row).toContainText(int(turnoutSum(ROUND, where).validos))
    await expect(page.locator('[data-slot="escala-sem-contorno"]')).toContainText('Sem contorno: 1 município não tem fronteira no arquivo do IBGE')
    // all the other municipalities join their mesh shape
    await page.goto(`${base}mapa/mt/?vista=mapa`)
    await expect(page.locator('[data-slot="mapa-municipios"] a[data-cd-ibge]')).toHaveCount(cityCount('mt') - 1, { timeout: 15_000 })
    expect(await page.locator(`[data-slot="mapa-municipios"] a[data-cd-ibge="${young.ibge}"]`).count()).toBe(0)
  })

  test('mg: the largest mesh loads and draws every one of its shapes', async ({ page }) => {
    const t0 = Date.now()
    await page.goto(`${base}mapa/mg/?vista=mapa`)
    const map = page.locator('[data-slot="mapa-municipios"]')
    await expect(map.locator('a[data-cd-ibge]')).toHaveCount(cityCount('mg'), { timeout: 25_000 })
    await expect(map.locator('[data-slot="malha-sem-dados"]')).toHaveCount(0)
    const ms = Date.now() - t0
    console.log(`mapa/mg: mesh joined and SVG rendered in ${ms}ms (${cityCount('mg')} shapes, phone viewport)`)
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