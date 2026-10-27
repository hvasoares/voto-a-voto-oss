import { expect, test } from '@playwright/test'
import { activateSearch, allowedOrigins, base, collectRequests, violations } from './helpers'

/* Home page at 390x844, fixture dataset (9 cities, states rj, sp, mt). Behaviour spec: site/src/slots/home/CONTRACT.md */
test.describe('home: content', () => {
  test('shows the title, tagline, search prompt, state hint, "Para explorar" and the TSE footer', async ({ page }) => {
    await page.goto(base)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Voto a Voto')
    await expect(page.getByText('Eleição presidencial 2026, cidade por cidade.')).toBeVisible()
    await expect(page.getByText('Compare com 2018 e 2022.')).toBeVisible()
    await expect(page.getByPlaceholder('Busque sua cidade')).toBeVisible()
    await expect(page.getByText('Ou escolha um estado. Toque para ver os municípios.')).toBeVisible()
    await expect(page.getByRole('heading', { level: 2 })).toHaveText('Para explorar')
    await expect(page.locator('footer')).toContainText('Dados oficiais do TSE · Sobre os dados ›')
    await expect(page.locator('#consent-banner')).toHaveCount(1)
  })

  test('draws 27 tiles; states of the dataset are anchors, the others inert; overseas is never a state', async ({ page }) => {
    await page.goto(base)
    await expect(page.locator('[data-uf-grid] [data-uf]')).toHaveCount(27)
    const links = await page.locator('a[data-uf]').evaluateAll((els) => els.map((e) => [e.getAttribute('data-uf'), e.getAttribute('href')]))
    expect(links).toEqual(expect.arrayContaining([['rj', `${base}rj/`], ['sp', `${base}sp/`], ['mt', `${base}mt/`]]))
    expect(links).toHaveLength(3)
    await expect(page.locator('span[data-uf][aria-disabled="true"]')).toHaveCount(24)
    await expect(page.locator('[data-uf="zz"]')).toHaveCount(0)
  })

  test('"Para explorar" and the footer link to the right paths', async ({ page }) => {
    await page.goto(base)
    for (const [label, href] of [
      ['Brasil e regiões', 'brasil/'],
      ['Mapa por estado', 'mapa/'],
      ['Relatórios', 'relatorios/'],
      ['Três ciclos por estado', 'tres-ciclos/mt/'],
    ] as const) {
      await expect(page.getByRole('link', { name: new RegExp(label) })).toHaveAttribute('href', base + href)
    }
    await expect(page.getByRole('link', { name: /Sobre os dados/ })).toHaveAttribute('href', `${base}sobre-os-dados/`)
  })

  test('does not scroll sideways', async ({ page }) => {
    await page.goto(base)
    expect(page.viewportSize()).toEqual({ width: 390, height: 844 })
    const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
    expect(sw).toBeLessThanOrEqual(iw)
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

test.describe('home: only the search is an island, hydrated on interaction', () => {
  test('no JavaScript of the island is requested until the search is used', async ({ page }) => {
    const seen = collectRequests(page)
    await page.goto(base)
    await page.waitForLoadState('networkidle')
    const js = () => seen.map((r) => new URL(r.url).pathname).filter((p) => p.endsWith('.js'))
    expect(js().filter((p) => /CitySearch|client\.|react/i.test(p))).toEqual([])
    expect(seen.map((r) => new URL(r.url).pathname).filter((p) => p.includes('/data/'))).toEqual([])
    await activateSearch(page)
    await page.waitForLoadState('networkidle')
    expect(js().some((p) => /CitySearch/.test(p))).toBe(true)
    await expect.poll(() => seen.some((r) => r.url.endsWith('/search.json'))).toBe(true)
    // the home loads exactly one shard: the search index, when the field gains focus — nothing before that
    expect(seen.map((r) => new URL(r.url).pathname).filter((p) => p.includes('/data/'))).toHaveLength(1)
  })

  test('exactly one copy of React/ReactDOM runs on the page', async ({ page }) => {
    const copies: string[] = []
    page.on('response', async (r) => {
      if (r.request().resourceType() === 'script' && (await r.text().catch(() => '')).includes('react.memo_cache_sentinel')) copies.push(new URL(r.url()).pathname)
    })
    await page.goto(base)
    await (await activateSearch(page)).fill('cidade')
    await page.waitForLoadState('networkidle')
    expect(copies).toHaveLength(1)
  })

  test('what is typed before React takes over is not lost', async ({ page }) => {
    await page.goto(base)
    await page.getByRole('combobox', { name: 'Busque sua cidade' }).pressSequentially('boa esperanca', { delay: 0 })
    await expect(page.locator('a[data-position]')).toHaveCount(1)
    await expect(page.getByRole('combobox')).toHaveValue('boa esperanca')
  })
})

test.describe('home: city search', () => {
  test('finds a city typed without accents or capitals, shows name and UF, and opens it', async ({ page }) => {
    await page.goto(base)
    const box = await activateSearch(page)
    await box.fill('BOA ESPERANCA')
    const hit = page.locator('a[data-position]', { hasText: 'Boa Esperança do Norte' })
    await expect(hit).toHaveCount(1)
    await expect(hit).toContainText('MT')
    await hit.click()
    await expect(page).toHaveURL(new RegExp(`${base}mt/boa-esperanca-do-norte/$`))
  })

  test('result tap targets are at least 44 px high and the page does not scroll sideways', async ({ page }) => {
    await page.goto(base)
    const box = await activateSearch(page)
    await box.fill('cidade exemplo')
    await expect(page.locator('a[data-position]').first()).toBeVisible()
    const heights = await page.locator('a[data-position]').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))
    expect(heights.length).toBeGreaterThan(3)
    for (const h of heights) expect(h).toBeGreaterThanOrEqual(44)
    const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
    expect(sw).toBeLessThanOrEqual(iw)
  })

  test('overseas posts are findable and labelled Exterior', async ({ page }) => {
    await page.goto(base)
    const box = await activateSearch(page)
    await box.fill('exterior')
    await expect(page.locator('a[data-position]').first()).toContainText('Exterior')
  })

  test('says so when nothing matches, and clears when the box is emptied', async ({ page }) => {
    await page.goto(base)
    const box = await activateSearch(page)
    await box.fill('qqqqqq')
    await expect(page.getByText('Nenhuma cidade encontrada')).toBeVisible()
    await box.fill('')
    await expect(page.getByText('Nenhuma cidade encontrada')).toHaveCount(0)
    await expect(page.locator('a[data-position]')).toHaveCount(0)
  })

  test('one letter is not searched', async ({ page }) => {
    await page.goto(base)
    const box = await activateSearch(page)
    await box.fill('c')
    await expect(page.locator('a[data-position]')).toHaveCount(0)
    await expect(page.getByText('Nenhuma cidade encontrada')).toHaveCount(0)
  })

  test('Enter opens the first result', async ({ page }) => {
    await page.goto(base)
    const box = await activateSearch(page)
    await box.fill('boa esperanca')
    await expect(page.locator('a[data-position]')).toHaveCount(1)
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(new RegExp(`${base}mt/boa-esperanca-do-norte/$`))
  })

  test('searching makes no request outside the site and no non-GET request', async ({ page, baseURL }) => {
    const seen = collectRequests(page)
    await page.goto(base)
    const box = await activateSearch(page)
    await box.fill('cidade')
    await expect(page.locator('a[data-position]').first()).toBeVisible()
    await page.waitForLoadState('networkidle')
    expect(violations(seen, await allowedOrigins(new URL(baseURL!).origin))).toEqual([])
    const files = seen.map((r) => new URL(r.url).pathname).filter((p) => p.includes('/data/'))
    expect(files.every((p) => p.endsWith('/search.json'))).toBe(true)
  })
})

test('a state tile opens its state path', async ({ page }) => {
  await page.goto(base)
  await page.getByRole('link', { name: 'SP', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`${base}sp/$`))
})
