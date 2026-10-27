import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { base, collectRequests } from './helpers'

/*
 * The city page of the shard contract (ticket #49): the city is already in the HTML, so the page requests no
 * shard at all — the real card is #50, and it will load only the city's own shard. Fixture dataset.
 */
test.skip(!existsSync(resolve('../site/fixtures/data/cities.csv')), 'no fixture data')

test.describe('city page: pre-rendered, no data request', () => {
  test('carries the city in its HTML and offers Início and the state', async ({ page }) => {
    const res = await page.goto(`${base}rj/cidade-exemplo/`)
    expect(res!.status()).toBe(200)
    await expect(page.locator('h1')).toHaveText('Cidade Exemplo')
    await expect(page.getByText('RJ')).toBeVisible()
    await expect(page.getByRole('link', { name: '‹ Início' })).toHaveAttribute('href', base)
    await expect(page.getByRole('link', { name: /Ver o estado/ })).toHaveAttribute('href', `${base}rj/`)
  })

  test('makes no /data/ request at all (not even the search index)', async ({ page }) => {
    const seen = collectRequests(page)
    await page.goto(`${base}rj/cidade-exemplo/`)
    await page.waitForLoadState('networkidle')
    const data = seen.map((r) => new URL(r.url).pathname).filter((p) => p.includes('/data/'))
    expect(data).toEqual([])
  })

  test('no page of the built site fetches a CSV', async ({ page }) => {
    const seen = collectRequests(page)
    for (const path of ['', 'rj/cidade-exemplo/']) {
      const res = await page.goto(base + path)
      expect(res!.status()).toBe(200)
      await page.waitForLoadState('networkidle')
    }
    expect(seen.map((r) => new URL(r.url).pathname).filter((p) => p.includes('/data/') && p.endsWith('.csv'))).toEqual([])
  })

  test('an overseas city is pre-rendered too, without a state link', async ({ page }) => {
    await page.goto(`${base}zz/exterior-exemplo/`)
    await expect(page.locator('h1')).toHaveText('Exterior (posto exemplo)')
    await expect(page.getByText('Exterior', { exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: /Ver o estado/ })).toHaveCount(0)
  })

  test('a path the dataset does not pre-render is the 404 fallback', async ({ page }) => {
    const res = await page.goto(`${base}rj/nao-existe/`)
    expect(res!.status()).toBe(404)
    await expect(page.locator('[data-fallback="not-found"]')).toBeVisible()
  })
})