import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { base } from './helpers'

/*
 * The #17 extension of the municipality map at 390x844 on the FIXTURE dataset: the dynamic route
 * pre-renders /mapa/<uf>/ for every state with a committed mesh (fixture states rj, sp, mt), the
 * state page /:uf/ hosts the same island under data-placeholder="state-map", and /mapa/ replaces
 * the single-RJ sentence with the "toque no mosaico" wording. The fixture municipality of MT
 * (TSE 99201, "Boa Esperança do Norte", ciclos 2026 only) does not join the real IBGE mesh --
 * the same note Boa Esperança do Norte (TSE 73709) gets on the real build.
 */
test.skip(!existsSync(resolve('fixtures/data/cities.csv')), 'no fixture data')

test.describe('mapa: the index sentence of #17', () => {
  test('the paragraph points at the state pages instead of the single /mapa/rj/ page', async ({ page }) => {
    await page.goto(`${base}mapa/`)
    await expect(page.locator('[data-mapa-municipio]')).toHaveText(
      'Mapa por município: toque num estado no mosaico acima — a página do estado traz o mapa dos municípios.',
    )
  })
})

test.describe('mapa/sp: the dynamic route renders every state with a mesh', () => {
  test('one row for the fixture municipality, with the figures from the dataset', async ({ page }) => {
    await page.goto(`${base}mapa/sp/`)
    // 99101: R2 validos 77.680, A 44.737 x B 32.943 -> +15,2 pp
    expect((await page.getByRole('heading', { level: 1 }).textContent())).toContain('São Paulo')
    await expect(page.getByText(/no 1 município do estado/)).toBeVisible()
    const row = page.locator('[data-slot="city-map"] nav a[data-cd="99101"]')
    await expect(row).toContainText('Cidade Exemplo Paulista')
    await expect(row).toContainText('+15,2 pp')
    await expect(row).toContainText('77.680')
    await expect(row).toHaveAttribute('href', `${base}sp/cidade-exemplo-paulista/`)
  })
})

test.describe('mapa/mt: the municipality the mesh does not draw yet (the #16 rule, now for MT)', () => {
  test('the row carries the figures and the legend notes the missing boundary', async ({ page }) => {
    await page.goto(`${base}mapa/mt/`)
    // 99201: R2 validos 85.154, A 42.667 x B 42.487 -> +0,2 pp (ciclos 2026 only, no R1 margin)
    const row = page.locator('[data-slot="city-map"] nav a[data-cd="99201"]')
    await expect(row).toContainText('Boa Esperança do Norte')
    await expect(row).toContainText('+0,2 pp')
    await expect(row).toContainText('85.154')
    await expect(row).toHaveAttribute('href', `${base}mt/boa-esperanca-do-norte/`)
    await expect(page.locator('[data-slot="escala-sem-contorno"]')).toContainText('Sem contorno: 1 município não tem fronteira no arquivo do IBGE')
    await expect(page.locator('[data-slot="escala-sem-contorno"]')).toContainText('só aparece na lista.')
  })

  test('the tapped row stays selected with the swing absent (there is no 2026 runoff before this one)', async ({ page }) => {
    await page.goto(`${base}mapa/mt/`)
    await page.locator('a[data-cd="99201"]').click()
    const panel = page.locator('[data-slot="mapa-selecionado"]')
    await expect(panel).toContainText('+0,2 pp')
    // the fixture city has both rounds of 2026: the prior margin is the round 1 of the same cycle
    await expect(panel).toContainText(/Na eleição anterior: -0,1 pp\. Variação: \+0,4 pp\./)
  })
})

test.describe('the state page hosts the map island (the #4/#50 placeholder filled by #17)', () => {
  test('/rj/ keeps the placeholder contract and renders the list inside it', async ({ page }) => {
    await page.goto(`${base}rj/`)
    const placeholder = page.locator('[data-placeholder="state-map"]')
    await expect(placeholder).toBeVisible()
    const rows = placeholder.locator('nav[data-tab] a, nav a[data-cd]')
    // the six fixture municipalities pre-render in the placeholder, same island as /mapa/rj/
    expect(await placeholder.locator('a[data-cd]').count()).toBe(6)
    await expect(placeholder.locator('a[data-cd="99001"]').first()).toHaveAttribute('href', `${base}rj/cidade-exemplo/`)
    await expect(rows.first()).toBeVisible()
  })

  test('the state links carry the focused map page of this state', async ({ page }) => {
    await page.goto(`${base}rj/`)
    await expect(page.locator('a[data-link="map-municipio"]')).toHaveAttribute('href', `${base}mapa/rj/`)
    await page.goto(`${base}mt/`)
    await expect(page.locator('a[data-link="map-municipio"]')).toHaveAttribute('href', `${base}mapa/mt/`)
  })

  test('from the state page the map view fetches the mesh once, a GET to the site origin', async ({ page }) => {
    const seen: { path: string; method: string }[] = []
    page.on('request', (r) => {
      if (!r.url().includes('/geo/')) return
      seen.push({ path: new URL(r.url()).pathname, method: r.method() })
    })
    await page.goto(`${base}rj/`)
    await page.locator('a[data-cd="99001"]').click()
    await page.getByRole('link', { name: 'Mapa', exact: true }).click()
    await expect(page.locator('[data-slot="mapa-municipios"]')).toBeVisible()
    await page.waitForLoadState('networkidle')
    expect(seen).toEqual([{ path: '/geo/municipios-rj.json', method: 'GET' }])
  })
})