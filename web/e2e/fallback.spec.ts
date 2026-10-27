import { expect, test } from '@playwright/test'
import { base } from './helpers'

/* GitHub Pages: a path without a file gets 404.html; its script tells a valid route from a miss. */
test.describe('404 fallback', () => {
  test('a valid route that is not pre-rendered says so (state of the fixture data)', async ({ page }) => {
    // The routes list carries /:uf/:slug/qr/ but only the demo /qr/ page is ported so far;
    // /tres-ciclos/:uf/ became pre-rendered by #14 and /mapa/:uf/ by #17 (this spec used to pin
    // /tres-ciclos/rj/ as the still-missing page), so the city QR is what keeps the contract demoable.
    const res = await page.goto(`${base}rj/cidade-exemplo/qr/`)
    expect(res!.status()).toBe(404)
    await expect(page.locator('[data-fallback="valid"]')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Página em construção')
  })

  test('the state map page is pre-rendered now (#17 ported /mapa/:uf/, no fallback)', async ({ page }) => {
    const res = await page.goto(`${base}mapa/rj/`)
    expect(res!.status()).toBe(200)
    await expect(page.locator('h1')).toHaveText('Mapa por município · Rio de Janeiro')
  })

  test('the state page is pre-rendered now (#50 ported it, no fallback)', async ({ page }) => {
    const res = await page.goto(`${base}rj/`)
    expect(res!.status()).toBe(200)
    await expect(page.locator('h1')).toHaveText('Estado selecionado: RJ')
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
    await expect(page.getByRole('link', { name: /Início/ })).toHaveAttribute('href', base)
  })

  test('the home page itself is pre-rendered (no fallback)', async ({ page }) => {
    const res = await page.goto(base)
    expect(res!.status()).toBe(200)
  })
})
