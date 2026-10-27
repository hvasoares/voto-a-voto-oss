import { expect, test } from '@playwright/test'
import { base, collectRequests, violations, waitReady } from './helpers'

/*
 * State page (:uf/, ported from site/src/slots/state by #50): the cities are already in the HTML, so the
 * search reads them from the page and makes no request. Behaviour spec of the old slot's e2e.
 */
const rj = `${base}rj/`
const rows = (page: import('@playwright/test').Page) => page.locator('[data-state-list] a.state-row')

test.describe('state: scoped search', () => {
  test('lists the cities of the state, then ranks the typed name first without accents or capitals', async ({ page }) => {
    await page.goto(rj)
    await waitReady(page)
    await expect(rows(page)).toHaveCount(6)
    await page.getByRole('searchbox', { name: 'Busque sua cidade em RJ' }).fill('CIDADE EXEMPLO d')
    const hits = page.locator('[data-state-results] a.state-row')
    await expect(hits.first()).toContainText('Cidade Exemplo D')
    await expect(page.locator('[data-state-list]')).toBeHidden()
    await hits.first().click()
    await expect(page).toHaveURL(new RegExp(`${rj}cidade-exemplo-d/$`))
  })

  test('never finds a city of another state', async ({ page }) => {
    await page.goto(rj)
    await waitReady(page)
    await page.getByRole('searchbox').fill('paulista')
    await expect(page.getByText('Nenhuma cidade encontrada em RJ.')).toBeVisible()
    await page.getByRole('searchbox').fill('')
    await expect(rows(page)).toHaveCount(6)
  })

  test('Enter opens the first result; rows are at least 44 px tall; no sideways scroll', async ({ page }) => {
    await page.goto(rj)
    await waitReady(page)
    const heights = await rows(page).evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))
    for (const h of heights) expect(h).toBeGreaterThanOrEqual(44)
    await page.getByRole('searchbox').fill('exemplo b')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/rj\/cidade-exemplo-b\/$/)
    await page.goBack()
    const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
    expect(sw).toBeLessThanOrEqual(iw)
  })

  test('searching makes no request at all beyond the page load (rows come from the page)', async ({ page, baseURL }) => {
    const seen = collectRequests(page)
    await page.goto(rj)
    await waitReady(page)
    await page.waitForLoadState('networkidle')
    const before = seen.length
    await page.getByRole('searchbox').fill('cidade')
    await expect(page.locator('[data-state-results] a.state-row').first()).toBeVisible()
    expect(seen.length).toBe(before)
    expect(violations(seen, [new URL(baseURL!).origin])).toEqual([])
  })
})

test.describe('state links and map area', () => {
  test('offers the map-by-state and three-cycles links, back to home, and reserves the map area', async ({ page }) => {
    await page.goto(rj)
    await waitReady(page)
    await expect(page.getByRole('link', { name: 'Ver mapa por estado ›' })).toHaveAttribute('href', `${base}mapa/`)
    await expect(page.getByRole('link', { name: 'Ver os três ciclos do estado ›' })).toHaveAttribute('href', `${base}tres-ciclos/rj/`)
    await expect(page.getByRole('link', { name: '‹ Início' })).toHaveAttribute('href', base)
    await expect(page.locator('[data-placeholder="state-map"][data-uf="rj"]')).toBeVisible()
  })

  test('overseas has no state page', async ({ page }) => {
    expect((await page.goto(`${base}zz/`))?.status()).toBe(404)
  })

  test('a UF the dataset has no state shard for is the 404 fallback', async ({ page }) => {
    const res = await page.goto(`${base}nao-existe/`)
    expect(res!.status()).toBe(404)
  })
})

test.describe('state without JavaScript', () => {
  test.use({ javaScriptEnabled: false })
  test('the full list and the links are plain anchors', async ({ page }) => {
    await page.goto(rj)
    await expect(rows(page)).toHaveCount(6)
    await expect(rows(page).first()).toHaveAttribute('href', `${base}rj/cidade-exemplo/`)
    await expect(page.getByRole('link', { name: 'Ver mapa por estado ›' })).toBeVisible()
    expect(await page.locator('noscript').first().textContent()).toContain('A busca precisa de JavaScript')
  })
})