import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { base } from './helpers'

/*
 * /mapa/rj/ (ticket #16) at 390x844 on the FIXTURE dataset: six RJ municipalities
 * ("Cidade Exemplo*", TSE codes 99001-99006, IBGE codes 3399001-3399006). The fixture names do not
 * join the real IBGE mesh (below), which the map view reports as its own note. The real numbers
 * live in real-data-mapa-rj.spec.ts; the island layer is CityMapMap.test.tsx.
 *
 * (The pre-#50 predicate ../site/fixtures/data/cities.csv never matches the #50 layout any more,
 * so this whole file has been SILENTLY SKIPPED since that merge; it points at the committed
 * web/fixtures/data again. Flagged in web/docs/checkpoints/issue-17.md.)
 */
test.skip(!existsSync(resolve('fixtures/data/cities.csv')), 'no fixture data')

const ROWS = [
  { cd: '99001', nome: 'Cidade Exemplo', slug: 'cidade-exemplo', pp: '+0,9', validos: '68.434' },
  { cd: '99006', nome: 'Cidade Exemplo E', slug: 'cidade-exemplo-e', pp: '+6,0', validos: '62.887' },
  { cd: '99005', nome: 'Cidade Exemplo D', slug: 'cidade-exemplo-d', pp: '+5,8', validos: '56.493' },
  { cd: '99004', nome: 'Cidade Exemplo C', slug: 'cidade-exemplo-c', pp: '-13,2', validos: '49.986' },
  { cd: '99003', nome: 'Cidade Exemplo B', slug: 'cidade-exemplo-b', pp: '-6,4', validos: '38.320' },
  { cd: '99002', nome: 'Cidade Exemplo A', slug: 'cidade-exemplo-a', pp: '-0,1', validos: '24.399' },
]

test.describe('mapa/rj: content', () => {
  test('shows title, subtitle, the state-map link, the toggle, legend and panel', async ({ page }) => {
    await page.goto(`${base}mapa/rj/`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mapa por município · Rio de Janeiro')
    await expect(page.getByText(/no 2º turno de 2026, em pontos percentuais \(pp\), nos 6 municípios do estado/)).toBeVisible()
    await expect(page.getByRole('link', { name: '‹ Mapa por estado' })).toHaveAttribute('href', `${base}mapa/`)
    await expect(page.getByRole('link', { name: 'Lista' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('link', { name: 'Mapa', exact: true })).toHaveAttribute('href', '?vista=mapa')
    await expect(page.locator('[data-slot="mapa-escala"]')).toContainText('+30')
    await expect(page.locator('[data-slot="mapa-selecionado"]')).toContainText('Cidade Exemplo · selecionado')
    await expect(page.locator('[data-slot="mapa-selecionado"]')).toContainText('Votos válidos (2º turno): 68.434')
    await expect(page.locator('[data-slot="mapa-selecionado"]')).toContainText(/Na eleição anterior: \+4,0 pp\. Variação: -3,1 pp\./)
    await expect(page.locator('footer')).toContainText('fronteiras: malhas do IBGE')
    await expect(page.locator('#consent-banner')).toHaveCount(1)
  })

  test('one link per municipality, ordered by round-2 valid votes, carrying the signed pp', async ({ page }) => {
    await page.goto(`${base}mapa/rj/`)
    const rows = await page.locator('[data-slot="city-map"] nav a[data-cd]').evaluateAll((els) => els.map((el) => [el.getAttribute('data-cd'), el.getAttribute('href'), el.textContent]))
    expect(rows.map((r) => r[0])).toEqual(ROWS.map((r) => r.cd))
    for (let i = 0; i < ROWS.length; i++) {
      expect(rows[i]![1]).toBe(`${base}rj/${ROWS[i]!.slug}/`)
      expect(rows[i]![2]).toContain(ROWS[i]!.pp)
      expect(rows[i]![2]).toContain(ROWS[i]!.validos)
    }
  })

  test('every municipality row at least the min tap height; never sideways scroll', async ({ page }) => {
    await page.goto(`${base}mapa/rj/`)
    const heights = await page.locator('[data-slot="city-map"] nav a[data-cd]').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))
    expect(heights).toHaveLength(6)
    for (const h of heights) expect(h).toBeGreaterThanOrEqual(40)
    const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
    expect(sw).toBeLessThanOrEqual(iw)
  })

  test('a hydrated tap selects instead of navigating', async ({ page }) => {
    await page.goto(`${base}mapa/rj/`)
    await page.locator('a[data-cd="99004"]').click()
    await expect(page.locator('[data-slot="mapa-selecionado"]')).toContainText('Cidade Exemplo C · selecionado')
    await expect(page.locator('[data-slot="mapa-selecionado"]')).toContainText('-13,2 pp')
    expect(new URL(page.url()).pathname).toMatch(/mapa\/rj\/$/)
  })

  test('the map view draws all 92 mesh polygons; the fixture names stay muted with the note', async ({ page }) => {
    await page.goto(`${base}mapa/rj/?vista=mapa`)
    const map = page.locator('[data-slot="mapa-municipios"]')
    await expect(map).toBeVisible()
    const anchors = await map.locator('a[data-cd-ibge]').evaluateAll((els) => els.map((e) => e.getAttribute('data-cd-ibge')!))
    expect(new Set(anchors).size).toBe(92)
    // none of the fixture codes (3399001-3399006) join the real IBGE mesh
    for (let i = 1; i <= 6; i++) expect(anchors).not.toContain(`339900${i}`)
    await expect(map.locator('[data-slot="malha-sem-dados"]')).toContainText('92 dos municípios do arquivo de fronteiras não têm dados neste dataset')
    await expect(page.getByRole('button', { name: 'Aproximar' })).toBeVisible()
    await page.getByRole('button', { name: 'Aproximar' }).click()
    await expect(page.getByRole('button', { name: 'Ver tudo' })).toBeVisible()
  })

  test('the mesh file loads only once the map view opens, and it is a GET to the site itself', async ({ page }) => {
    const seen: { path: string; method: string }[] = []
    page.on('request', (r) => {
      if (!r.url().includes('/geo/')) return
      try {
        seen.push({ path: new URL(r.url()).pathname, method: r.method() })
      } catch {
        seen.push({ path: r.url(), method: r.method() })
      }
    })
    await page.goto(`${base}mapa/rj/`)
    expect(seen).toEqual([])
    // hydrate with a row tap first (client:interaction); the toggle then switches in-page
    await page.locator('a[data-cd="99004"]').click()
    await expect(page.locator('[data-slot="mapa-selecionado"]')).toContainText('Cidade Exemplo C')
    await page.getByRole('link', { name: 'Mapa', exact: true }).click()
    await expect(page.locator('[data-slot="mapa-municipios"]')).toBeVisible()
    await page.waitForLoadState('networkidle')
    expect(seen).toEqual([{ path: '/geo/municipios-rj.json', method: 'GET' }])
  })

  test('the page works without JavaScript: rows stay plain links to the city pages', async ({ page, browser }) => {
    const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } })
    const p = await noJs.newPage()
    await p.goto(`${base}mapa/rj/`)
    await expect(p.locator('[data-cd="99001"]')).toHaveAttribute('href', `${base}rj/cidade-exemplo/`)
    // without JavaScript the map view is out, but the noscript note is in the HTML (same shape as home.spec)
    expect(await p.locator('noscript').first().textContent()).toContain('A lista acima funciona sem')
    await noJs.close()
  })
})

test.describe('mapa/virada and /mapa/ links reach the municipality page', () => {
  test('the state map keeps working next to the new route (one link added, others untouched)', async ({ page }) => {
    await page.goto(`${base}mapa/`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mapa por estado')
    const tiles = await page.locator('[data-slot="state-map"] nav a[data-uf]').evaluateAll((els) => els.map((e) => e.getAttribute('data-uf')!))
    expect(tiles).toEqual(expect.arrayContaining(['rj', 'sp', 'mt']))
    expect(tiles).toHaveLength(3)
  })
})