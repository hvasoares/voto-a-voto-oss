import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { createNodeStore } from '../src/data/node'
import { collectRequests, violations, waitReady } from './helpers'

/*
 * Real-data checks. Run with `npm run test:real` (builds with DATA_DIR=../data). Skipped when ../data is missing.
 * Samples: first and last city, the 2026-only Boa Esperança do Norte, an overseas post, a non-ASCII name.
 */
const dir = resolve('../data')
const present = existsSync(resolve(dir, 'cities.csv'))
const cities = present ? await createNodeStore(dir).cities() : []
const pick = (f: (c: (typeof cities)[number]) => boolean) => cities.find(f)
const samples = [
  cities[0], cities[cities.length - 1],
  pick((c) => c.slug === 'boa-esperanca-do-norte'),
  pick((c) => c.uf === 'zz'),
  pick((c) => c.uf !== 'zz' && /[^\x00-\x7f]/.test(c.nome)),
].filter((c): c is NonNullable<typeof c> => !!c)
const subs = ['', 'compartilhar/', 'qr/', 'tres-ciclos/']

test.skip(!present, 'no ../data')
for (const c of samples) {
  for (const sub of subs) {
    const path = `/${c.uf}/${c.slug}/${sub}`
    test(`real ${path} (${c.nome})`, async ({ page, baseURL }) => {
      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(String(e)))
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
      const seen = collectRequests(page)
      expect((await page.goto(path))?.status()).toBe(200)
      await waitReady(page)
      await page.waitForLoadState('networkidle')
      if (sub === '') await expect(page.locator('h1')).toHaveText(c.nome)
      await expect(page.locator('[data-not-hydrated]')).toBeVisible()
      expect(errors).toEqual([])
      expect(violations(seen, new URL(baseURL!).origin)).toEqual([])
      const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
      expect(sw).toBeLessThanOrEqual(iw)
    })
  }
}

test('the 404.html fallback works with the real dataset (client loads the real CSVs)', async ({ page }) => {
  await page.goto('/rj/rj-inexistente/')
  await waitReady(page)
  await expect(page.locator('[data-not-found]')).toBeVisible()
})

test('state pages of the real dataset list their municipalities', async ({ page }) => {
  await page.goto('/rj/')
  await waitReady(page)
  await expect(page.locator('h1')).toHaveText('Estado selecionado: RJ')
  await expect(page.locator('ul[aria-label="Municípios"] li')).toHaveCount(92)
})
