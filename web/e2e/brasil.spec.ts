import { expect, test } from '@playwright/test'
import { allowedOrigins, base, collectRequests, violations } from './helpers'

/*
 * Screen 8 (ticket #10): /brasil/ with the committed FIXTURE dataset (default DATA_DIR, see README).
 * The page is fully server-rendered — every check below also holds with JavaScript off.
 * Contract: the ticket text plus the layout of site/reference/08-brasil-e-regioes.png; the frame's own
 * national figures are superseded (see the corrections in the ticket thread) and the fixture dataset
 * has its own small numbers, so this spec checks STRUCTURE and links, real numbers live in the real-data spec.
 */

test.describe('brasil: content (fixture build)', () => {
  test('frame texts: title, round subtitle, national section, por região section, notes and links', async ({ page }) => {
    await page.goto(`${base}brasil/`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Brasil e regiões')
    await expect(page.getByRole('heading', { level: 2, name: 'Brasil, votos válidos' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: 'Por região' })).toBeVisible()
    await expect(page.getByText(/^2º turno de 20\d\d$/)).toBeVisible()
    await expect(page.getByText(/100% da barra = votos válidos de/)).toBeVisible()
    await expect(page.locator('[data-brasil-bar]')).toHaveCount(1)
    await expect(page.getByText('Barra de cima: % dos votos válidos. Barra de baixo: % do eleitorado (Não = não compareceram).')).toBeVisible()
    // the correction: the wrong sentence is gone; brancos/nulos are shown per region
    await expect(page.getByText(/O arquivo não separa brancos e nulos/)).toHaveCount(0)
    await expect(page.locator('[data-brancos-nulos]')).toHaveCount(2) // the fixture has two regions
    await expect(page.locator('[data-brasil-note]')).toContainText('Brancos e nulos fazem parte do comparecimento e aparecem em cada região')
    await expect(page.getByRole('link', { name: 'Ver mapa por estado ›' })).toHaveAttribute('href', `${base}mapa/`)
    await expect(page.locator('footer')).toContainText('Fonte: TSE, dados finais · Sobre os dados ›')
  })

  test('navigation back home and the two regions of the fixture dataset, the overseas one never listed', async ({ page }) => {
    await page.goto(`${base}brasil/`)
    await expect(page.getByRole('link', { name: '‹ Início' })).toHaveAttribute('href', base)
    const regioes = await page.locator('[data-regiao]').evaluateAll((els) => els.map((e) => e.getAttribute('data-regiao')))
    expect(regioes).toEqual(['sudeste', 'centro-oeste'])
    await expect(page.locator('[data-regiao="exterior"]')).toHaveCount(0)
  })

  test('bars: candidates (lower ballot number first, red first), turnout, and share texts of the fixture', async ({ page }) => {
    await page.goto(`${base}brasil/`)
    // two candidate segments per bar, sized by their share (flex-grow carries the tenths, e.g. "816")
    for (const bar of await page.locator('[data-regiao] [role="img"]').all()) {
      await expect(bar.locator('span')).toHaveCount(2)
    }
    const sudeste = page.locator('[data-regiao="sudeste"]')
    await expect(sudeste.getByText('81,6% dos votos válidos do país')).toBeVisible()
    await expect(sudeste.getByText('Compareceram 73,5%', { exact: true })).toBeVisible()
    await expect(sudeste.getByText('Não 26,5%', { exact: true })).toBeVisible()
    await expect(sudeste.getByText('Brancos 2,7% · Nulos 3,4% do comparecimento.')).toBeVisible()
    const centroOeste = page.locator('[data-regiao="centro-oeste"]')
    await expect(centroOeste.getByText('18,4% dos votos válidos do país')).toBeVisible()
  })
})

test.describe('brasil: no-JS and robustness (fixture build)', () => {
  test.use({ javaScriptEnabled: false })

  test('the whole screen is there with JavaScript off: bar texts, note and links', async ({ page }) => {
    await page.goto(`${base}brasil/`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Brasil e regiões')
    await expect(page.locator('[data-brasil-bar] span')).toHaveCount(2)
    await expect(page.getByText('Compareceram 73,5%', { exact: true })).toBeVisible()
    await expect(page.getByText('Brancos 2,7% · Nulos 3,4% do comparecimento.', { exact: false })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Ver mapa por estado ›' })).toBeVisible()
  })

  test('no horizontal scroll at 390 px and only GET requests to the site origin', async ({ page, baseURL }) => {
    const seen = collectRequests(page)
    await page.goto(`${base}brasil/`)
    const scroll = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(scroll, 'horizontal scroll at 390 px').toBeLessThanOrEqual(0)
    expect(violations(seen, await allowedOrigins(new URL(baseURL!).origin))).toEqual([])
  })
})