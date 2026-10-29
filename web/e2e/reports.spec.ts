import { expect, test } from '@playwright/test'
import { allowedOrigins, base, collectRequests, violations } from './helpers'
import { noJs } from './presets'

/*
 * The reports hub (/relatorios/) and the built reports: /relatorios/cidades-que-viraram/ (ticket #12)
 * and the four of ticket #13 (maiores-viradas, votos-ganhos-e-perdidos, disputas-mais-apertadas,
 * comparecimento). All are pre-rendered Astro markup, no island and no browser data parsing: every
 * figure is in the HTML at build time, so the pages work with JavaScript off. The figures below are
 * pinned to the SITE FIXTURES (default build): "Candidato A/B" (91/92), one flip to each candidate,
 * by unit tests (src/lib/reports/*.test.ts), not hard-coded app constants. Since #14, all seven rows
 * link through (the last stub went away when /comparar/2022/ landed).
 */

const STUB_TITLES: string[] = []

test.describe('reports hub page', () => {
  test('carries the rows of the frame (and Cidades fora da curva, #34) with their computed headlines', async ({ page }) => {
    await page.goto(base + 'relatorios/')
    await expect(page.locator('#main h1')).toHaveText('Relatórios')
    await expect(page.locator('#main > p').first()).toHaveText('2º turno de 2026 e comparação com 2022')
    const rows = page.locator('nav[aria-label="Relatórios"] > ul > li')
    await expect(rows).toHaveCount(8)
    await expect(page.getByRole('link', { name: /Cidades que viraram no 2º turno/ })).toHaveText('Cidades que viraram no 2º turnoCandidato A virou 2 cidades; Candidato B virou 1')
    for (const title of STUB_TITLES) await expect(rows.filter({ hasText: title }), title).toHaveCount(0)
    await expect(page.locator('[data-report="cidades-que-viraram"]')).toHaveAttribute('href', base + 'relatorios/cidades-que-viraram/')
    await expect(page.locator('[data-report="comparar"]')).toHaveAttribute('href', base + 'comparar/2022/')
  })

  test('links every row of the hub', async ({ page }) => {
    await page.goto(base + 'relatorios/')
    await expect(page.getByText('Em breve')).toHaveCount(0)
    const hrefs = await page
      .locator('nav[aria-label="Relatórios"] > ul > li > a[data-report]')
      .evaluateAll((els) => els.map((e) => `${e.getAttribute('data-report')}${e.getAttribute('href')}`))
    expect(hrefs).toEqual([
      `cidades-que-viraram${base}relatorios/cidades-que-viraram/`,
      `maiores-viradas${base}relatorios/maiores-viradas/`,
      `votos-ganhos-e-perdidos${base}relatorios/votos-ganhos-e-perdidos/`,
      `disputas-mais-apertadas${base}relatorios/disputas-mais-apertadas/`,
      `comparecimento${base}relatorios/comparecimento/`,
      `cidades-fora-da-curva${base}relatorios/cidades-fora-da-curva/`,
      `comparar${base}comparar/2022/`,
      `como-cada-grupo-votou${base}relatorios/como-cada-grupo-votou/`,
    ])
  })

  test('backs to the home page and cites the source with the data page', async ({ page }) => {
    await page.goto(base + 'relatorios/')
    await expect(page.locator('#main').getByRole('link', { name: '‹ Início' })).toHaveAttribute('href', base)
    await expect(page.locator('footer[data-component="source-footer"]')).toHaveText('Fonte: TSE, dados finais · Sobre os dados ›')
    await expect(page.locator('footer[data-component="source-footer"]').getByRole('link', { name: 'Sobre os dados' })).toHaveAttribute('href', base + 'sobre-os-dados/')
  })

  test('is reachable from the home "Para explorar" list and only asks the site itself', async ({ page, baseURL }) => {
    const seen = collectRequests(page)
    await page.goto(base)
    await page.getByRole('link', { name: 'Relatórios Viradas, comparações e disputas apertadas' }).click()
    await expect(page).toHaveURL(new RegExp(`${base}relatorios/$`))
    await expect(page.locator('#main h1')).toBeVisible()
    expect(violations(seen, await allowedOrigins(baseURL!))).toEqual([])
  })
})

test.describe('cidades que viraram page', () => {
  test('shows the definition, the volume pairing notice and the ranked flips of the fixtures', async ({ page }) => {
    await page.goto(base + 'relatorios/cidades-que-viraram/')
    await expect(page.locator('#main h1')).toHaveText('Cidades que viraram no 2º turno')
    await expect(page.locator('#main > p').first()).toContainText('Maiores viradas para Candidato A, cidades com 5 mil+ votos válidos.')
    await expect(page.locator('#main > p').first()).toContainText('Margem = % de Candidato A menos % de Candidato B, em pontos percentuais (pp) dos votos válidos.')
    await expect(page.locator('th', { hasText: 'Margem no 1º turno' })).toBeVisible()
    const rows = page.locator('[data-flip]')
    await expect(rows).toHaveCount(2)
    await expect(rows.first()).toContainText('Cidade Exemplo D/RJ')
    await expect(rows.first()).toContainText('Margem -0,6 pp → +5,8 pp · 56.493 votos válidos')
    await expect(rows.last()).toContainText('Boa Esperança do Norte/MT')
    await expect(rows.first().locator('a').first()).toHaveAttribute('href', base + 'rj/cidade-exemplo-d/')
    await expect(page.locator('[data-notice]')).toContainText('Compare por pontos percentuais, não por votos absolutos')
    await expect(page.locator('footer[data-component="source-footer"]')).toHaveText('Fonte: TSE, dados finais · Sobre os dados ›')
  })

  test('backs to the hub', async ({ page }) => {
    await page.goto(base + 'relatorios/cidades-que-viraram/')
    await expect(page.locator('#main').getByRole('link', { name: '‹ Relatórios' })).toHaveAttribute('href', base + 'relatorios/')
  })

  test('is reachable from the hub row', async ({ page }) => {
    await page.goto(base + 'relatorios/')
    await page.getByRole('link', { name: /Cidades que viraram no 2º turno/ }).click()
    await expect(page).toHaveURL(new RegExp(`${base}relatorios/cidades-que-viraram/$`))
  })

  test('reports what it does without JavaScript: all figures visible, share answers by copying', async ({ browser }) => {
    const context = await browser.newContext(noJs())
    const page = await context.newPage()
    await page.goto(base + 'relatorios/cidades-que-viraram/')
    await expect(page.locator('#main h1')).toBeVisible()
    await expect(page.locator('[data-flip]').first()).toContainText('Margem -0,6 pp → +5,8 pp')
    await expect(page.locator('[data-notice]')).toBeVisible()
    await page.goto(base + 'relatorios/')
    await expect(page.locator('#main h1')).toBeVisible()
    await context.close()
  })

  test('without a native share sheet, Compartilhar copies the link and says so', async ({ browser }) => {
    const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] })
    const page = await context.newPage()
    await page.goto(base + 'relatorios/cidades-que-viraram/')
    await page.locator('[data-share-report]').click()
    await expect(page.locator('[data-share-feedback]')).toHaveText('Link copiado!')
    await context.close()
  })
})

test.describe('maiores viradas page', () => {
  test('states the 100 mil+ filter and renders the empty list of the fixtures', async ({ page }) => {
    await page.goto(base + 'relatorios/maiores-viradas/')
    await expect(page.locator('#main h1')).toHaveText('Maiores viradas, cidades de 100 mil+ votos')
    await expect(page.locator('[data-sized]')).toContainText('Nenhuma dessas cidades virou no sentido contrário (Candidato B). Margem =')
    await expect(page.locator('[data-empty]')).toHaveText('Nenhuma cidade de 100 mil+ votos válidos.')
    await expect(page.locator('[data-swing]')).toHaveCount(0)
    await expect(page.locator('[data-notice]')).toContainText('Compare por pontos percentuais, não por votos absolutos')
  })

  test('backs to the hub and is reachable from its row', async ({ page }) => {
    await page.goto(base + 'relatorios/')
    await page.getByRole('link', { name: /Maiores viradas/ }).click()
    await expect(page).toHaveURL(new RegExp(`${base}relatorios/maiores-viradas/$`))
    await expect(page.locator('#main').getByRole('link', { name: '‹ Relatórios' })).toHaveAttribute('href', base + 'relatorios/')
  })
})

test.describe('votos ganhos e perdidos page', () => {
  test('shows both candidates with their net totals and the ranked fixture lists', async ({ page }) => {
    await page.goto(base + 'relatorios/votos-ganhos-e-perdidos/')
    await expect(page.locator('#main h1')).toHaveText('Votos ganhos e perdidos vs. 2022')
    const sections = page.locator('[data-candidate-section]')
    await expect(sections).toHaveCount(2)
    // Candidato A: everything lost in 2026 vs 2022; the list is the empty side, the losses are ranked.
    const first = sections.nth(0)
    await expect(first.locator('[data-total]')).toHaveText('-14.914 votos no país: ganhou em 0 cidades, perdeu em 7 cidades (de 7 comparadas).')
    await expect(first.locator('[data-no-gains]')).toContainText('nenhuma ganhou votos de Candidato A')
    await expect(first.locator('[data-loss]')).toHaveCount(7)
    await expect(first.locator('[data-loss="0"]')).toContainText('Cidade Exemplo/RJ')
    await expect(first.locator('[data-loss="0"]')).toContainText('-5.914 votos · 34.537 em 2026')
    // Candidato B net of the fixtures: three cities keep more votes, four lose.
    const second = sections.nth(1)
    await expect(second.locator('[data-total]')).toHaveText('-1.667 votos no país: ganhou em 3 cidades, perdeu em 4 cidades (de 7 comparadas).')
    await expect(second.locator('[data-gain]')).toHaveCount(3)
    await expect(second.locator('[data-gain="0"]')).toContainText('Cidade Exemplo/RJ')
    await expect(second.locator('[data-gain="0"]')).toContainText('+4.356 votos · 33.897 em 2026')
    await expect(second.locator('[data-loss="0"]')).toContainText('Cidade Exemplo E/RJ')
    await expect(second.locator('[data-loss="0"]')).toContainText('-8.644 votos · 29.561 em 2026')
    await expect(page.locator('[data-notice]')).toContainText('Votos absolutos favorecem as cidades grandes')
  })

  test('backs to the hub and is reachable from its row', async ({ page }) => {
    await page.goto(base + 'relatorios/')
    await page.getByRole('link', { name: /Votos ganhos e perdidos/ }).click()
    await expect(page).toHaveURL(new RegExp(`${base}relatorios/votos-ganhos-e-perdidos/$`))
    await expect(page.locator('#main').getByRole('link', { name: '‹ Relatórios' })).toHaveAttribute('href', base + 'relatorios/')
  })
})

test.describe('disputas mais apertadas page', () => {
  test('ranks the fixture races without a size filter and labels who is ahead', async ({ page }) => {
    await page.goto(base + 'relatorios/disputas-mais-apertadas/')
    await expect(page.locator('#main h1')).toHaveText('Disputas mais apertadas')
    await expect(page.locator('[data-sized]')).toContainText('As 8 menores diferenças de 8 cidades')
    const rows = page.locator('[data-race]')
    await expect(rows).toHaveCount(8)
    // The fixture's closest race: Cidade Exemplo A/RJ, 31 votes apart, Candidato B ahead (unit-pinned).
    await expect(rows.first()).toContainText('Cidade Exemplo A/RJ')
    await expect(rows.first()).toContainText('Diferença de 31 votos — Candidato B à frente (12.215 a 12.184)')
    await expect(rows.first()).toContainText('margem -0,1 pp · 24.399 votos válidos')
    await expect(rows.first().locator('a').first()).toHaveAttribute('href', base + 'rj/cidade-exemplo-a/')
    await expect(rows.first().locator('a.calc')).toHaveCount(0)
    await expect(page.locator('a.calc')).toHaveAttribute('href', /^.*\/fato\/relatorios\/disputas-mais-apertadas\/cidades\/#/)
    await expect(page.locator('[data-notice]')).toContainText('Empate = o mesmo número de votos')
  })

  test('backs to the hub and is reachable from its row', async ({ page }) => {
    await page.goto(base + 'relatorios/')
    await page.getByRole('link', { name: /Disputas mais apertadas/ }).click()
    await expect(page).toHaveURL(new RegExp(`${base}relatorios/disputas-mais-apertadas/$`))
    await expect(page.locator('#main').getByRole('link', { name: '‹ Relatórios' })).toHaveAttribute('href', base + 'relatorios/')
  })
})

test.describe('comparecimento page', () => {
  test('shows the two ranked turnout tables with the volume under each rate', async ({ page }) => {
    await page.goto(base + 'relatorios/comparecimento/')
    await expect(page.locator('#main h1')).toHaveText('Comparecimento mais alto e mais baixo')
    await expect(page.locator('[data-sized]')).toContainText('8 cidades no filtro, de cada uma o volume embaixo da taxa')
    const high = page.locator('[data-turnout-high] [data-turnout]')
    const low = page.locator('[data-turnout-low] [data-turnout]')
    await expect(high).toHaveCount(8)
    await expect(low).toHaveCount(8)
    await expect(high.first()).toContainText('Cidade Exemplo C/RJ')
    await expect(high.first()).toContainText('78,2% · 53.040 de 67.868 eleitores aptos')
    await expect(low.first()).toContainText('Cidade Exemplo E/RJ')
    await expect(low.first()).toContainText('70,5% · 67.175 de 95.294 eleitores aptos')
    await expect(low.first().locator('a').first()).toHaveAttribute('href', base + 'rj/cidade-exemplo-e/')
    await expect(page.locator('[data-notice]')).toContainText('Cada taxa com o seu volume:')
  })

  test('backs to the hub and is reachable from its row', async ({ page }) => {
    await page.goto(base + 'relatorios/')
    await page.getByRole('link', { name: /Comparecimento mais alto e mais baixo/ }).click()
    await expect(page).toHaveURL(new RegExp(`${base}relatorios/comparecimento/$`))
    await expect(page.locator('#main').getByRole('link', { name: '‹ Relatórios' })).toHaveAttribute('href', base + 'relatorios/')
  })
})