import { expect, test } from '@playwright/test'
import { base, collectRequests, violations, waitReady } from './helpers'

/* Home search behaviour in a real browser at 390x844 (fixture dataset: 9 cities). */
test.describe('home: city search', () => {
  test('finds a city typed without accents or capitals, shows name and UF, and opens it', async ({ page }) => {
    await page.goto(base)
    await waitReady(page)
    await page.getByRole('searchbox', { name: 'Busque sua cidade' }).fill('BOA ESPERANCA')
    const hit = page.locator('a.home-result', { hasText: 'Boa Esperança do Norte' })
    await expect(hit).toHaveCount(1)
    await expect(hit.locator('.home-result__uf')).toHaveText('MT')
    await hit.click()
    await expect(page).toHaveURL(new RegExp(`${base}mt/boa-esperanca-do-norte/$`))
  })

  test('result tap targets are at least 44 px high and the page does not scroll sideways', async ({ page }) => {
    await page.goto(base)
    await waitReady(page)
    await page.getByRole('searchbox').fill('cidade exemplo')
    const boxes = await page.locator('a.home-result').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))
    expect(boxes.length).toBeGreaterThan(3)
    for (const h of boxes) expect(h).toBeGreaterThanOrEqual(44)
    const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
    expect(sw).toBeLessThanOrEqual(iw)
  })

  test('overseas posts are findable and labelled Exterior, never offered as a state', async ({ page }) => {
    await page.goto(base)
    await waitReady(page)
    await page.getByRole('searchbox').fill('exterior')
    await expect(page.locator('a.home-result .home-result__uf').first()).toHaveText('Exterior')
    await expect(page.locator('a.uf-tile[data-uf="zz"], .uf-tile[data-uf="zz"]')).toHaveCount(0)
  })

  test('says so when nothing matches, and clears when the box is emptied', async ({ page }) => {
    await page.goto(base)
    await waitReady(page)
    const box = page.getByRole('searchbox')
    await box.fill('qqqqqq')
    await expect(page.getByText('Nenhuma cidade encontrada')).toBeVisible()
    await box.fill('')
    await expect(page.locator('[data-home-results]')).toBeEmpty()
  })

  test('Enter opens the first result', async ({ page }) => {
    await page.goto(base)
    await waitReady(page)
    await page.getByRole('searchbox').fill('boa esperanca')
    await expect(page.locator('a.home-result')).toHaveCount(1)
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/mt\/boa-esperanca-do-norte\/$/)
  })

  test('searching makes no request outside the site and no non-GET request', async ({ page, baseURL }) => {
    const seen = collectRequests(page)
    await page.goto(base)
    await waitReady(page)
    await page.getByRole('searchbox').fill('cidade')
    await expect(page.locator('a.home-result').first()).toBeVisible()
    await page.waitForLoadState('networkidle')
    expect(violations(seen, new URL(baseURL!).origin)).toEqual([])
    const own = seen.map((r) => new URL(r.url).pathname)
    expect(own.filter((p) => p.endsWith('.csv') && !p.endsWith('/cities.csv'))).toEqual([])
  })
})

test.describe('home without JavaScript', () => {
  test.use({ javaScriptEnabled: false })
  test('the pre-rendered page still offers the state tiles and the explore links as plain anchors', async ({ page }) => {
    await page.goto(base)
    await expect(page.getByRole('link', { name: 'RJ', exact: true })).toHaveAttribute('href', `${base}rj/`)
    await expect(page.getByRole('link', { name: /Brasil e regiões/ })).toHaveAttribute('href', `${base}brasil/`)
    expect(await page.locator('noscript').first().textContent()).toContain('A busca precisa de JavaScript')
  })
})

test('a state tile opens its state page', async ({ page }) => {
  await page.goto(base)
  await waitReady(page)
  await page.getByRole('link', { name: 'SP', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`${base}sp/$`))
})
