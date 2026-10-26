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

/* ---- state (#4): every state page against cities.csv ---- */
const byUf = new Map<string, number>()
for (const c of cities) if (c.uf !== 'zz') byUf.set(c.uf, (byUf.get(c.uf) ?? 0) + 1)

test.describe('state pages on the real dataset', () => {
  test('there are 27 states and every one lists exactly the cities of cities.csv, as anchors to existing city pages', async ({ page, baseURL }) => {
    expect(byUf.size).toBe(27)
    for (const [uf, n] of byUf) {
      await page.goto(`/${uf}/`)
      await waitReady(page)
      await expect(page.locator('h1')).toHaveText(`Estado selecionado: ${uf.toUpperCase()}`)
      await expect(page.locator('.page__subtitle')).toHaveText(n === 1 ? "1 município" : `${n} municípios`)
      expect(await page.locator('[data-state-list] a.state-row').count(), uf).toBe(n)
      const hrefs = await page.locator('[data-state-list] a.state-row').evaluateAll((els) => els.map((e) => e.getAttribute('href')!))
      expect(new Set(hrefs).size, uf).toBe(n)
      expect(hrefs.every((h) => h.startsWith(`/${uf}/`))).toBe(true)
    }
  })

  test('RJ shows 92 and SP 645; the list is plain anchors without JavaScript', async ({ page, browser }) => {
    expect(byUf.get('rj')).toBe(92)
    expect(byUf.get('sp')).toBe(645)
    await page.goto('/rj/')
    await waitReady(page)
    await expect(page.locator('.page__subtitle')).toHaveText('92 municípios')
    const ctx = await browser.newContext({ javaScriptEnabled: false, baseURL: page.url().replace(/\/rj\/$/, '') })
    const plain = await ctx.newPage()
    await plain.goto('/sp/')
    await expect(plain.locator('[data-state-list] a.state-row')).toHaveCount(645)
    await ctx.close()
  })

  test('sampled links resolve to the right city page', async ({ page, baseURL }) => {
    await page.goto('/sp/')
    await waitReady(page)
    const hrefs = await page.locator('[data-state-list] a.state-row').evaluateAll((els) => els.filter((_, i) => i % 40 === 0).map((e) => e.getAttribute('href')!))
    expect(hrefs.length).toBeGreaterThan(10)
    for (const h of hrefs) expect((await page.request.get(new URL(h, baseURL!).toString())).status(), h).toBe(200)
    const first = page.locator('[data-state-list] a.state-row').first()
    const href = await first.getAttribute('href')
    await first.click()
    await expect(page).toHaveURL(new RegExp(`${href}$`))
  })

  test('scoped search returns only cities of that state, ignoring accents', async ({ page }) => {
    await page.goto('/sp/')
    await waitReady(page)
    await page.getByRole('searchbox').fill('sao')
    await expect(page.locator('[data-state-results] a.state-row').first()).toBeVisible()
    const hrefs = await page.locator('[data-state-results] a.state-row').evaluateAll((els) => els.map((e) => e.getAttribute('href')!))
    expect(hrefs.length).toBeGreaterThan(5)
    expect(hrefs.every((h) => h.startsWith('/sp/'))).toBe(true)
    await page.getByRole('searchbox').fill('belem')
    await expect(page.getByText('Nenhuma cidade encontrada em SP.')).toBeVisible()
    await page.goto('/pa/')
    await waitReady(page)
    await page.getByRole('searchbox').fill('belem')
    await expect(page.locator('[data-state-results] a.state-row').first()).toContainText('Belém')
  })

  test('overseas has no state page', async ({ page }) => {
    expect((await page.goto('/zz/'))?.status()).toBe(404)
  })

  test('the largest state makes no foreign request and does not scroll sideways', async ({ page, baseURL }) => {
    const seen = collectRequests(page)
    await page.goto('/sp/')
    await waitReady(page)
    await page.getByRole('searchbox').fill('campinas')
    await page.waitForLoadState('networkidle')
    expect(violations(seen, new URL(baseURL!).origin)).toEqual([])
    const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
    expect(sw).toBeLessThanOrEqual(iw)
  })
})

/* ---- home (#3): search over the real 5,760 cities ---- */
const results = (page: import('@playwright/test').Page) => page.locator('a.home-result').evaluateAll((els) => els.map((e) => e.textContent!.trim()))

test.describe('home search on the real dataset', () => {
  test('finds cities typed without accents, with their UF', async ({ page }) => {
    await page.goto('/')
    await waitReady(page)
    const box = page.getByRole('searchbox')
    for (const [typed, first] of [['sao paulo', 'São PauloSP'], ['brasilia', 'BrasíliaDF'], ['Belém', 'BelémAL']] as const) {
      await box.fill(typed)
      await expect(page.locator('a.home-result').first()).toBeVisible()
      const found = await results(page)
      expect(found, typed).toContain(first)
    }
  })

  test('shows every state of a name that exists in several states', async ({ page }) => {
    await page.goto('/')
    await waitReady(page)
    await page.getByRole('searchbox').fill('belem')
    await expect(page.locator('a.home-result').first()).toBeVisible()
    const found = await results(page)
    for (const uf of ['AL', 'PA', 'PB']) expect(found).toContain(`Belém${uf}`)
    await page.getByRole('searchbox').fill('bom jesus')
    const bj = await page.locator('a.home-result .home-result__uf').allTextContents()
    expect(new Set(bj).size).toBeGreaterThanOrEqual(5)
  })

  test('opens the right city from a result', async ({ page }) => {
    await page.goto('/')
    await waitReady(page)
    await page.getByRole('searchbox').fill('sao paulo')
    await page.locator('a.home-result', { hasText: 'SP' }).first().click()
    await expect(page).toHaveURL(/\/sp\/sao-paulo\/$/)
  })

  test('all 27 state tiles link to an existing state page; overseas is not a state', async ({ page, baseURL }) => {
    await page.goto('/')
    await waitReady(page)
    const hrefs = await page.locator('a.uf-tile').evaluateAll((els) => els.map((e) => e.getAttribute('href')!))
    expect(hrefs).toHaveLength(27)
    expect(hrefs).not.toContain('/zz/')
    for (const h of hrefs) expect((await page.request.get(new URL(h, baseURL!).toString())).status(), h).toBe(200)
  })

  test('typing makes no request beyond the site own cities.csv, and answers fast', async ({ page, baseURL }) => {
    const seen = collectRequests(page)
    await page.goto('/')
    await waitReady(page)
    const box = page.getByRole('searchbox')
    await box.focus()
    await box.fill('sa')
    await expect(page.locator('a.home-result').first()).toBeVisible()
    // latency of one search + render over all cities, measured inside the page
    const ms = await page.evaluate(async () => {
      const input = document.querySelector<HTMLInputElement>('.home-search__input')!
      const box = document.querySelector('[data-home-results]')!
      const times: number[] = []
      for (const q of ['sao', 'sao paulo', 'belem', 'bom jesus', 'santa luzia', 'a', 'brasilia']) {
        const t0 = performance.now()
        const done = new Promise<void>((r) => new MutationObserver((_, o) => (o.disconnect(), r())).observe(box, { childList: true, subtree: true }))
        input.value = q
        input.dispatchEvent(new Event('input'))
        await done
        times.push(performance.now() - t0)
      }
      return times
    })
    console.log('search latency ms (7 queries, 5,760 cities):', ms.map((m) => m.toFixed(1)).join(' '))
    expect(Math.max(...ms)).toBeLessThan(250)
    await page.waitForLoadState('networkidle')
    expect(violations(seen, new URL(baseURL!).origin)).toEqual([])
    const files = seen.map((r) => new URL(r.url).pathname).filter((p) => p.includes('/data/'))
    expect(files.every((p) => p.endsWith('/cities.csv') || p.endsWith('/manifest.json'))).toBe(true)
  })
})
