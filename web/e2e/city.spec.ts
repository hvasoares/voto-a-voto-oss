import { expect, test, type Page } from '@playwright/test'
import { base, collectRequests, violations, waitReady } from './helpers'

/*
 * City card (the approved Sketch frame "2 Cartão da cidade", ported by #50) in a real browser at
 * 390x844 over the fixture dataset (Cidade Exemplo = the frame figures). All six panels are pre-rendered;
 * the script only shows them — so switching makes no request, and the page as a whole never fetches /data/.
 */
const city = `${base}rj/cidade-exemplo/`
const card = (page: Page) => page.locator('[data-city-card] [data-view]:not([hidden])')
const cardText = async (page: Page) => (await card(page).innerText()).replace(/\s+/g, ' ')

test.describe('city card: fixture route is the frame', () => {
  test('?turno=1 shows round 1 with the numbers of the Sketch frame', async ({ page }) => {
    await page.goto(`${city}?turno=1`)
    await waitReady(page)
    await expect(page.locator('h1')).toHaveText('Cidade Exemplo')
    await expect(page.getByRole('link', { name: '1º turno' })).toHaveAttribute('aria-current', 'true')
    await expect(page.getByRole('link', { name: '2026', exact: true })).toHaveAttribute('aria-current', 'true')
    const t = await cardText(page)
    expect(t).toContain('Votaram · 70% do eleitorado')
    expect(t).toContain('Não votaram · 30% do eleitorado')
    expect(t).toContain('Candidato A 36.400 · 52% dos votos')
    expect(t).toContain('Nulos 3.600 · 12% dos que não votaram')
    expect(t).toContain('Em Cidade Exemplo, no 1º turno de 2026, 30% do eleitorado não votou, quase tanto quanto o Candidato B recebeu (33,6%).')
  })
  test('without a query the latest round of the latest cycle is shown', async ({ page }) => {
    await page.goto(city)
    await waitReady(page)
    await expect(page.getByRole('link', { name: '2º turno' })).toHaveAttribute('aria-current', 'true')
    expect(await cardText(page)).toContain('no 2º turno de 2026')
  })
  test('the fixture banner is shown for fixture data', async ({ page }) => {
    await page.goto(`${city}?turno=1`)
    await expect(page.locator('.banner')).toContainText('DADOS FICTÍCIOS')
  })
})

test.describe('city card: switching', () => {
  test('round and cycle tabs switch the card without any request, update the address and the back button works', async ({ page, baseURL }) => {
    await page.goto(`${city}?turno=1`)
    await waitReady(page)
    await page.waitForLoadState('networkidle')
    const seen = collectRequests(page)
    await page.getByRole('link', { name: '2º turno' }).click()
    await expect(page).toHaveURL(`${city}?ciclo=2026&turno=2`)
    expect(await cardText(page)).toContain('no 2º turno de 2026')
    await page.getByRole('link', { name: '2018', exact: true }).click()
    await expect(page).toHaveURL(`${city}?ciclo=2018&turno=2`)
    expect(await cardText(page)).toContain('no 2º turno de 2018')
    await expect(page.getByRole('link', { name: 'Compartilhar' })).toHaveAttribute('href', `${city}compartilhar/?ciclo=2018&turno=2`)
    await page.goBack()
    await expect(page).toHaveURL(`${city}?ciclo=2026&turno=2`)
    expect(await cardText(page)).toContain('no 2º turno de 2026')
    expect(seen).toEqual([])
    expect(violations(seen, [new URL(baseURL!).origin])).toEqual([])
  })
  test('opening an address with a query shows that view', async ({ page }) => {
    await page.goto(`${city}?ciclo=2022&turno=1`)
    await waitReady(page)
    expect(await cardText(page)).toContain('no 1º turno de 2022')
    await expect(page.getByRole('link', { name: '2022', exact: true })).toHaveAttribute('aria-current', 'true')
  })
  test('a cycle without data (Boa Esperança do Norte, 2026 only) says so and the page does not break', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto(`${base}mt/boa-esperanca-do-norte/`)
    await waitReady(page)
    expect(await cardText(page)).toContain('Votaram')
    await page.getByRole('link', { name: '2022', exact: true }).click()
    await expect(page.locator('[data-nodata]:visible')).toHaveText('Sem dados nesse ciclo.')
    await expect(page.locator('.bar:visible')).toHaveCount(0)
    await page.getByRole('link', { name: '2º turno' }).click()
    await expect(page.locator('[data-nodata]:visible')).toBeVisible()
    await page.getByRole('link', { name: '2026', exact: true }).click()
    await expect(page.locator('[data-nodata]:visible')).toHaveCount(0)
    expect(errors).toEqual([])
  })
})

test.describe('city card: pre-rendered, no data request (the #49 contract, kept)', () => {
  test('carries the city in its HTML and offers Início, compare, cycles and the state', async ({ page }) => {
    const res = await page.goto(city)
    expect(res!.status()).toBe(200)
    await expect(page.locator('h1')).toHaveText('Cidade Exemplo')
    await expect(page.getByRole('link', { name: '‹ Início' })).toHaveAttribute('href', base)
    await expect(page.getByRole('link', { name: 'Comparar com 2022 ›' })).toHaveAttribute('href', `${base}comparar/2022/`)
    await expect(page.getByRole('link', { name: 'Ver os três ciclos ›' })).toHaveAttribute('href', `${city}tres-ciclos/`)
    await expect(page.getByRole('link', { name: 'Ver o estado ›' })).toHaveAttribute('href', `${base}rj/`)
  })

  test('makes no /data/ request at all (not even the search index)', async ({ page }) => {
    const seen = collectRequests(page)
    await page.goto(city)
    await waitReady(page)
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
    await waitReady(page)
    await expect(page.locator('h1')).toHaveText('Exterior (posto exemplo)')
    await expect(page.getByText('Voto no exterior')).toBeVisible()
    await expect(page.getByRole('link', { name: /Ver o estado/ })).toHaveCount(0)
  })

  test('a path the dataset does not pre-render is the 404 fallback', async ({ page }) => {
    const res = await page.goto(`${base}rj/nao-existe/`)
    expect(res!.status()).toBe(404)
    await expect(page.locator('[data-fallback="not-found"]')).toBeVisible()
  })
})

test.describe('city card: layout and links', () => {
  test('no sideways scroll, bars fill the card, every request stays on the site', async ({ page, baseURL }) => {
    const seen = collectRequests(page)
    await page.goto(`${city}?turno=1`)
    await waitReady(page)
    await page.waitForLoadState('networkidle')
    const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
    expect(sw).toBeLessThanOrEqual(iw)
    const widths = await page.locator('.bar:visible').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().width))
    expect(widths).toHaveLength(2)
    expect(Math.abs(widths[0]! - 318)).toBeLessThan(4)
    expect(violations(seen, [new URL(baseURL!).origin])).toEqual([])
  })
  test('tab and share targets are at least 44 px tall', async ({ page }) => {
    await page.goto(`${city}?turno=1`)
    await waitReady(page)
    const hs = await page.locator('.tabs__tab, .city-share').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))
    for (const h of hs) expect(h).toBeGreaterThanOrEqual(44)
  })
})

test.describe('city card without JavaScript', () => {
  test.use({ javaScriptEnabled: false })
  test('the default view, the legend and the sentence are in the page', async ({ page }) => {
    await page.goto(city)
    await expect(page.locator('h1')).toHaveText('Cidade Exemplo')
    await expect(card(page).locator('.legend__row')).toHaveCount(5)
    await expect(card(page).locator('.city-takeaway')).toContainText('no 2º turno de 2026')
    await expect(page.getByRole('link', { name: 'Compartilhar' })).toBeVisible()
    await expect(page.locator('[data-view][hidden]')).toHaveCount(5)
  })
})