import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { base, selected, waitReady } from './helpers'

test.describe('route smoke test: every slot opens at its real path', () => {
  for (const r of selected) {
    test(`${r.slotId} ${r.path}`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(String(e)))
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
      const res = await page.goto(r.path)
      expect(res?.status()).toBe(200)
      await waitReady(page)
      await expect(page.locator('h1')).toBeVisible()
      await expect(page.locator('footer.source-footer')).toBeVisible()
      const marker = page.locator(`[data-not-hydrated="${r.slotId}"]`)
      await (r.hydrated ? expect(marker).toHaveCount(0) : expect(marker).toContainText('not yet hydrated'))
      expect(errors).toEqual([])
    })
  }
})

test.describe('real paths and GitHub Pages behaviour', () => {
  test('a refresh on a fixture city path does not 404', async ({ page }) => {
    const path = `${base}rj/cidade-exemplo/`
    expect((await page.goto(path))?.status()).toBe(200)
    expect((await page.reload())?.status()).toBe(200)
    await waitReady(page)
    await expect(page.locator('h1')).toHaveText('Cidade Exemplo')
    expect(new URL(page.url()).hash).toBe('')
  })

  test('an unknown path gets the 404 page, not a blank screen', async ({ page }) => {
    const res = await page.goto(`${base}rj/cidade-que-nao-existe/`)
    expect(res?.status()).toBe(404)
    await waitReady(page)
    await expect(page.locator('[data-not-found]')).toBeVisible()
  })

  test('the 404.html fallback renders a valid route that was not pre-rendered', async ({ page }) => {
    // Same bytes GitHub Pages would serve for a path with no file; the client script resolves the path itself.
    const body = readFileSync(resolve('dist/404.html'), 'utf8')
    await page.route('**/rj/cidade-exemplo-b/qr/', (route) => route.fulfill({ status: 404, contentType: 'text/html; charset=utf-8', body }))
    await page.goto(`${base}rj/cidade-exemplo-b/qr/`)
    await waitReady(page)
    await expect(page.locator('#app')).toHaveAttribute('data-slot', 'qr')
    await expect(page.locator('h1')).toHaveText('Mostrar QR')
    await expect(page.locator('[data-not-hydrated="qr"]')).toBeVisible()
  })

  test('links navigate by real path (no hash routes)', async ({ page }) => {
    await page.goto(base)
    await page.getByRole('link', { name: 'RJ', exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`${base}rj/$`))
    await page.goto(`${base}rj/cidade-exemplo/`)
    await page.getByRole('link', { name: 'Compartilhar' }).click()
    await expect(page).toHaveURL(/\/compartilhar\/(\?ciclo=\d{4}&turno=[12])?$/)
    expect(new URL(page.url()).hash).toBe('')
  })

  test('the fixture=sketch switch re-renders client side without leaving the page', async ({ page }) => {
    await page.goto(`${base}relatorios/?fixture=sketch`)
    await waitReady(page)
    await expect(page.locator('h1')).toHaveText('Relatórios')
  })
})
