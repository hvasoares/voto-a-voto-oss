import { expect, test } from '@playwright/test'
import { base, expectHeaderWayHome } from './helpers'

/* GitHub Pages: a path without a file gets 404.html; its script tells a valid route from a miss. */
test.describe('404 fallback', () => {
  // Since #14 built /tres-ciclos/:uf/ every KNOWN_ROUTES example is pre-rendered in the fixture build; the
  // classifier's "valid" bucket stays covered by the unit tests (src/lib/fallback.test.ts). The region page
  // /brasil/:regiao/ (#183) is built only for the regions the dataset has and is valid only when its page declares the
  // value: the fixtures have no Norte, so /brasil/norte/ falls through to the not-found screen:
  test('a region the dataset does not have is "Página não encontrada"', async ({ page }) => {
    const res = await page.goto(`${base}brasil/norte/`)
    expect(res!.status()).toBe(404)
    await expect(page.locator('[data-fallback="not-found"]')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Página não encontrada')
  })

  test('the state page is pre-rendered now (#50 ported it, no fallback)', async ({ page }) => {
    const res = await page.goto(`${base}rj/`)
    expect(res!.status()).toBe(200)
    await expect(page.locator('h1')).toHaveText('Estado selecionado: RJ')
  })

  test('the state map page is pre-rendered now (issue-17 ported /mapa/:uf/, no fallback)', async ({ page }) => {
    const res = await page.goto(`${base}mapa/rj/`)
    expect(res!.status()).toBe(200)
    await expect(page.locator('h1')).toHaveText('Mapa por município · Rio de Janeiro')
  })

  test('a valid city route is pre-rendered now (city shards since ticket #49, no fallback)', async ({ page }) => {
    const res = await page.goto(`${base}rj/cidade-exemplo/`)
    expect(res!.status()).toBe(200)
    await expect(page.locator('h1')).toHaveText('Cidade Exemplo')
  })

  test('an unknown path is "Página não encontrada" with a way home', async ({ page }) => {
    await page.goto(`${base}xx/yy/`)
    await expect(page.locator('[data-fallback="not-found"]')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Página não encontrada')
    await expectHeaderWayHome(page)
  })

  test('the home page itself is pre-rendered (no fallback)', async ({ page }) => {
    const res = await page.goto(base)
    expect(res!.status()).toBe(200)
  })
})
