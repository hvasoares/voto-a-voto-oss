import { expect, test } from '@playwright/test'
import { allowedOrigins, base, collectRequests, violations } from './helpers'

/*
 * The cohort report (/relatorios/como-cada-grupo-votou/), ticket #15. Static page, no island: the
 * whole report is baked at build time from the dataset (default build: the committed fixtures, so
 * these are the FIXTURE numbers — three groups, one city without earlier data). The real numbers
 * are pinned by src/lib/cohorts.test.ts and checked in cohorts-real-data.spec.ts.
 */
const path = base + 'relatorios/como-cada-grupo-votou/'

test.describe('cohort report page', () => {
  test('carries the sketch frame: back link, title, lead and the footer', async ({ page }) => {
    await page.goto(path)
    await expect(page, 'title').toHaveTitle(/Como cada grupo votou/)
    await expect(page.locator('#main h1')).toHaveText('Como cada grupo votou')
    await expect(page.locator('#main').getByRole('link', { name: '‹ Relatórios' })).toHaveAttribute('href', `${base}relatorios/`)
    await expect(page.locator('[data-component="lead"]')).toContainText('Presidente 2026')
    const footer = page.locator('footer[data-component="source-footer"]')
    await expect(footer).toContainText('Fonte: TSE, dados finais')
    await expect(footer.getByRole('link', { name: 'Sobre os dados' })).toHaveAttribute('href', `${base}sobre-os-dados/`)
  })

  test('the fixture build says the numbers are not real', async ({ page }) => {
    await page.goto(path)
    await expect(page.locator('[data-component="fixture-banner"]')).toHaveText('EXEMPLO · DADOS FICTÍCIOS, NÃO SÃO RESULTADOS REAIS')
  })

  test('one card per cohort, with cities, valid votes and the 2026 outcome per candidate', async ({ page }) => {
    await page.goto(path)
    const cards = page.locator('[data-component="group-card"]')
    await expect(cards).toHaveCount(3)
    const first = cards.first()
    await expect(first.locator('h2')).toHaveText('Venceu em 2018: PB. Em 2022: PA')
    await expect(first.locator('[data-component="group-meta"]')).toHaveText('5 cidades · 265.326 votos válidos (2º turno 2026)')
    // The bar and its text legend; the swatch pair is cand-a/cand-b (neutral), with names and counts in text.
    await expect(first.locator('[role="img"]')).toHaveAttribute('aria-label', 'Candidato A 60%, Candidato B 40%')
    const parts = first.locator('[data-component="group-part"]')
    await expect(parts).toHaveCount(2)
    await expect(parts.first()).toContainText('Candidato A 60% (3)')
    await expect(parts.nth(1)).toContainText('Candidato B 40% (2)')
  })

  test('the totals close and the 2026-only city is reported by name', async ({ page }) => {
    await page.goto(path)
    await expect(page.locator('[data-component="total-line"]')).toHaveText(
      '8 cidades do 2º turno de 2026 (sem os postos do exterior) = 7 em grupos + 1 sem dados.',
    )
    const outside = page.locator('[data-component="outside-list"] li')
    await expect(outside).toHaveCount(1)
    await expect(outside.first()).toHaveText('Boa Esperança do Norte/MT — sem dados de 2018 e 2022 (existe só no 2º turno de 2026); em 2026, vencida por Candidato A.')
    await expect(page.locator('[data-component="definition"]')).toContainText('maior resto')
  })

  test('does not scroll sideways and only asks the site itself', async ({ page, baseURL }) => {
    const seen = collectRequests(page)
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
    expect(sw).toBeLessThanOrEqual(iw)
    expect(violations(seen, await allowedOrigins(new URL(baseURL!).origin))).toEqual([])
    // Static page, no island: it must not ship any JavaScript at all.
    expect(seen.some((r) => new URL(r.url).pathname.endsWith('.js'))).toBe(false)
  })
})

test.describe('cohort report without JavaScript', () => {
  test.use({ javaScriptEnabled: false })
  test('the pre-rendered report is complete: same text, same bar, same notes', async ({ page }) => {
    await page.goto(path)
    await expect(page.locator('[data-component="group-card"]')).toHaveCount(3)
    await expect(page.locator('[data-component="total-line"]')).toContainText('= 7 em grupos')
    const first = page.locator('[data-component="group-card"]').first()
    await expect(first.locator('[data-component="group-part"]').first()).toContainText('Candidato A 60% (3)')
    // A static page: nothing behind a toggle, no noscript apology needed.
    await expect(page.locator('noscript')).toHaveCount(0)
  })
})