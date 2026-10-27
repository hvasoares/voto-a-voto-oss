import { expect, test } from '@playwright/test'
import { allowedOrigins, base, collectRequests, violations } from './helpers'

/*
 * The reports hub (/relatorios/) and the built report (/relatorios/cidades-que-viraram/), ticket #12.
 * Both are pre-rendered Astro markup, no island and no browser data parsing: every figure is in the
 * HTML at build time, so the page works with JavaScript off. The figures below are pinned to the
 * SITE FIXTURES (default build): "Candidato A/B" (91/92), one flip to each candidate, by unit tests
 * (src/lib/reports/*.test.ts), not hard-coded app constants.
 */

const STUB_TITLES = [
  'Maiores viradas, cidades de 100 mil+ votos',
  'Votos ganhos e perdidos vs. 2022',
  'Disputas mais apertadas',
  'Comparecimento mais alto e mais baixo',
  'Comparar com 2022 e 2018',
  'Como cada grupo votou',
]

test.describe('reports hub page', () => {
  test('carries the seven rows of the frame with their computed headlines', async ({ page }) => {
    await page.goto(base + 'relatorios/')
    await expect(page.locator('#main h1')).toHaveText('Relatórios')
    await expect(page.locator('#main > p').first()).toHaveText('2º turno de 2026 e comparação com 2022')
    const rows = page.locator('nav[aria-label="Relatórios"] > ul > li')
    await expect(rows).toHaveCount(7)
    await expect(page.getByRole('link', { name: /Cidades que viraram no 2º turno/ })).toHaveText('Cidades que viraram no 2º turnoCandidato A virou 2 cidades; Candidato B virou 1')
    for (const title of STUB_TITLES) await expect(rows.filter({ hasText: title }), title).toHaveCount(1)
    await expect(page.locator('[data-report="cidades-que-viraram"]')).toHaveAttribute('href', base + 'relatorios/cidades-que-viraram/')
  })

  test('marks the not-built reports with "Em breve" and no route of their own', async ({ page }) => {
    await page.goto(base + 'relatorios/')
    await expect(page.getByText('Em breve')).toHaveCount(5) // six stubs minus como-cada-grupo-votou, built by ticket #15
    const hrefs = await page.locator('nav[aria-label="Relatórios"] a').evaluateAll((els) => els.map((e) => e.getAttribute('href')))
    expect(hrefs).toEqual([base + 'relatorios/cidades-que-viraram/', base + 'relatorios/como-cada-grupo-votou/'])
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
    await expect(rows.first().locator('a')).toHaveAttribute('href', base + 'rj/cidade-exemplo-d/')
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
    const context = await browser.newContext({ javaScriptEnabled: false })
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