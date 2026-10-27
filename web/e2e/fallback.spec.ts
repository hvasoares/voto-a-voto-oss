import { expect, test } from '@playwright/test'
import { base } from './helpers'

/* GitHub Pages: a path without a file gets 404.html; its script tells a valid route from a miss. */
test.describe('404 fallback', () => {
  test('a valid route that is not pre-rendered says so (state of the fixture data)', async ({ page }) => {
    const res = await page.goto(`${base}rj/`)
    expect(res!.status()).toBe(404)
    await expect(page.locator('[data-fallback="valid"]')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Página em construção')
  })

  test('a valid city route is recognised too', async ({ page }) => {
    await page.goto(`${base}rj/cidade-exemplo/`)
    await expect(page.locator('[data-fallback="valid"]')).toBeVisible()
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
