import { expect, test } from '@playwright/test'
import { activateSearch, base, collectRequests, expectNoHorizontalScroll, resizeTo, WIDTHS } from './helpers'

/* Ticket #51: the desktop shell and Home. Fixture dataset (states rj, sp, mt). */

for (const width of WIDTHS) {
  test(`home at ${width} px does not scroll sideways`, async ({ page }) => {
    await resizeTo(page, width)
    await page.goto(base)
    await expectNoHorizontalScroll(page)
  })
}

test.describe('top bar', () => {
  test('at 1440 it carries the wordmark, the search and the three links, in order', async ({ page }) => {
    await page.goto(base)
    const bar = page.locator('[data-component="top-bar"]')
    await expect(bar).toBeVisible()
    await expect(bar.getByRole('link', { name: 'Voto a Voto' })).toHaveAttribute('href', base)
    await expect(bar.locator('[data-city-search="bar"] input')).toBeVisible()
    const links = await bar.getByRole('navigation', { name: 'Principal' }).getByRole('link').evaluateAll((els) => els.map((e) => [e.textContent, e.getAttribute('href')]))
    expect(links).toEqual([
      ['Relatórios', `${base}relatorios/`],
      ['Mapa por estado', `${base}mapa/`],
      ['Sobre os dados', `${base}sobre-os-dados/`],
    ])
  })

  test('below 1024 px it is not drawn (a phone and a tablet keep their own header)', async ({ page }) => {
    for (const width of [390, 768, 1023]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(base)
      await expect(page.locator('[data-component="top-bar"]')).toBeHidden()
    }
  })

  test('marks the current page', async ({ page }) => {
    await page.goto(`${base}relatorios/`)
    await expect(page.locator('[data-component="top-bar"]').getByRole('link', { name: 'Relatórios' })).toHaveAttribute('aria-current', 'page')
    await expect(page.locator('[data-component="top-bar"]').getByRole('link', { name: 'Mapa por estado' })).not.toHaveAttribute('aria-current', 'page')
  })

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false })
    test('the bar and its links are pre-rendered and usable', async ({ page }) => {
      await page.goto(base)
      const bar = page.locator('[data-component="top-bar"]')
      await expect(bar.getByRole('link', { name: 'Sobre os dados' })).toBeVisible()
      await bar.getByRole('link', { name: 'Relatórios' }).click()
      await expect(page).toHaveURL(`${base}relatorios/`)
    })
  })

  test('the search island loads on first interaction only, and is the existing one', async ({ page }) => {
    const seen = collectRequests(page)
    await page.goto(base)
    await page.waitForLoadState('networkidle')
    expect(seen.filter((r) => /CitySearch|client\.|react|search\.json/.test(r.url))).toEqual([])
    const box = page.locator('[data-component="top-bar"] [data-city-search="bar"] input')
    await box.click()
    // The existing CitySearch (React, cmdk) takes the field over: it is a combobox now, focused, and the cities were fetched.
    const live = page.locator('[data-component="top-bar"]').getByRole('combobox', { name: 'Busque sua cidade' })
    await expect(live).toBeFocused()
    expect(seen.some((r) => /search\.json/.test(r.url))).toBe(true)
    await live.fill('cidade')
    await expect(page.locator('[data-component="top-bar"] a[data-position]').first()).toBeVisible()
    // Floating results: the page below does not move when they open.
    const bar = await page.locator('[data-component="top-bar"]').boundingBox()
    expect(bar?.height).toBe(64)
    const tapped = await page.locator('[data-component="top-bar"] a[data-position]').first().getAttribute('href')
    expect(tapped).toMatch(new RegExp(`^${base}rj/cidade-exemplo`))
  })
})

test.describe('"/" shortcut', () => {
  test('focuses the page search on Home', async ({ page }) => {
    await page.goto(base)
    await page.waitForLoadState('networkidle')
    await page.keyboard.press('/')
    await expect(page.locator('[data-city-search="main"] input')).toBeFocused()
  })

  test('focuses the top bar search on a page without its own', async ({ page }) => {
    await page.goto(`${base}relatorios/`)
    await page.waitForLoadState('networkidle')
    await page.keyboard.press('/')
    await expect(page.locator('[data-city-search="bar"] input')).toBeFocused()
    await page.keyboard.type('cidade')
    await expect(page.locator('[data-component="top-bar"] a[data-position]').first()).toBeVisible()
  })

  test('typing "/" inside a field is left alone', async ({ page }) => {
    await page.goto(base)
    await page.waitForLoadState('networkidle')
    const box = await activateSearch(page)
    await box.fill('a')
    await page.keyboard.type('/b')
    await expect(box).toHaveValue('a/b')
  })

  test('the desktop-only module is not fetched by a phone, and is fetched by the desktop', async ({ page }) => {
    const phone = collectRequests(page)
    await resizeTo(page, 390)
    await page.goto(base)
    await page.waitForLoadState('networkidle')
    expect(phone.filter((r) => /desktop-shell/.test(r.url))).toEqual([])
    const desktop = collectRequests(page)
    await resizeTo(page, 1440)
    await page.goto(base)
    await page.waitForLoadState('networkidle')
    expect(desktop.filter((r) => /desktop-shell/.test(r.url)).length).toBeGreaterThan(0)
  })
})

test.describe('layout', () => {
  test('at 1440 the state picker sits right of the title, search and "Para explorar"', async ({ page }) => {
    await page.goto(base)
    const left = await page.getByRole('heading', { name: 'Para explorar' }).boundingBox()
    const picker = await page.locator('[data-uf-grid]').boundingBox()
    const title = await page.getByText('Eleição presidencial 2026, cidade por cidade.').boundingBox()
    expect(picker!.x).toBeGreaterThan(left!.x + 560)
    expect(picker!.y).toBeLessThan(left!.y)
    expect(title!.width).toBeLessThanOrEqual(560)
  })

  test('the content column is 1200 px wide and centered above 1440', async ({ page }) => {
    await page.setViewportSize({ width: 1800, height: 900 })
    await page.goto(base)
    const main = await page.locator('#main').boundingBox()
    expect(main!.width).toBeLessThanOrEqual(1240)
    expect(Math.round(main!.x * 2 + main!.width)).toBe(1800)
  })

  test('at 768 Home is one column and the tile grid shows', async ({ page }) => {
    await resizeTo(page, 768)
    await page.goto(base)
    const grid = await page.locator('[data-uf-grid]').boundingBox()
    const explore = await page.getByRole('heading', { name: 'Para explorar' }).boundingBox()
    expect(grid!.y).toBeLessThan(explore!.y)
    await expect(page.locator('[data-uf-grid]')).toBeVisible()
  })

  test('at 1440 the picker still offers every state of the dataset as a link, with the desktop wording', async ({ page }) => {
    await page.goto(base)
    await expect(page.getByText('Ou escolha um estado. Clique para ver os municípios.')).toBeVisible()
    await expect(page.locator('a[data-uf]')).toHaveCount(3)
  })
})

test.describe('keyboard and pointer', () => {
  test('every link and tile shows a visible focus ring', async ({ page }) => {
    await page.goto(base)
    for (const loc of [page.locator('a[data-uf="rj"]'), page.getByRole('link', { name: /Brasil e regiões/ }).last(), page.locator('[data-component="top-bar"] [data-wordmark]'), page.locator('[data-component="top-bar"] nav a').first()]) {
      await loc.focus()
      await page.keyboard.press('Shift+Tab')
      await page.keyboard.press('Tab')
      const ring = await loc.evaluate((el) => {
        const s = getComputedStyle(el)
        return { outline: s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0, shadow: s.boxShadow !== 'none' }
      })
      expect(ring.outline || ring.shadow).toBe(true)
    }
  })

  test('hover only changes style: nothing appears that a keyboard or touch visitor could not read', async ({ page }) => {
    await page.goto(base)
    const before = await page.locator('main').innerText()
    await page.locator('a[data-uf="rj"]').hover()
    expect(await page.locator('main').innerText()).toBe(before)
  })
})

test('no analytics property is added: the page has no device or viewport property in its script', async ({ page }) => {
  const html = await (await page.request.get(base)).text()
  expect(html).not.toMatch(/viewport_width|screen_width|device_type|desktop_or_mobile/)
})
