import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { base, collectRequests } from './helpers'
import { useNoJs } from './presets'

/*
 * Ticket #103: the desktop top bar names tasks. At 1440 px it is the same on every kind of page: the wordmark, the search
 * ("Ver minha cidade") and three anchors (Comparar, Conferir, Usar os dados). Relatórios and Mapa por estado moved to Home's
 * "Entender" block and to the footer line. Fixture dataset (rj, sp, mt).
 */
const PAGES = {
  Home: base,
  'cartão da cidade': `${base}rj/cidade-exemplo/`,
  Estado: `${base}rj/`,
  Brasil: `${base}brasil/`,
  relatório: `${base}relatorios/cidades-que-viraram/`,
  'Sobre os dados': `${base}sobre-os-dados/`,
  'Dados para nerds': `${base}dados-para-nerds/`,
  'API (Usar os dados)': `${base}api/`,
  Edições: `${base}edicoes/`,
  Imprensa: `${base}imprensa/`,
} as const

const TASKS: [string, string][] = [
  ['Comparar', `${base}#comparar`],
  ['Conferir', `${base}sobre-os-dados/#confira-voce-mesmo`],
  ['Usar os dados', `${base}sobre-os-dados/#usar-os-dados`],
]

const bar = (page: Page) => page.locator('[data-component="top-bar"]')
const barLinks = (page: Page) => bar(page).locator('a').evaluateAll((els) => els.map((e) => [e.textContent, e.getAttribute('href')]))

test.describe('the task-named bar', () => {
  test('is identical on every page type', async ({ page }) => {
    const seen: Record<string, unknown> = {}
    for (const [name, url] of Object.entries(PAGES)) {
      await page.goto(url)
      await expect(bar(page)).toBeVisible()
      seen[name] = { links: await barLinks(page), placeholder: await bar(page).locator('input').getAttribute('placeholder'), label: await bar(page).locator('input').getAttribute('aria-label') }
    }
    const expected = { links: [['Voto a Voto', base], ...TASKS], placeholder: 'Ver minha cidade', label: 'Ver minha cidade' }
    for (const [name, got] of Object.entries(seen)) expect(got, name).toEqual(expected)
  })

  test('keyboard order is wordmark, search, then the three links, each with a visible focus ring', async ({ page }) => {
    await page.goto(base)
    // The search island loads on the first interaction and re-renders its input then, taking the focus with it:
    // touch the input first, wait until the island answered, and only then walk the Tab order.
    await page.locator('[data-component="top-bar"] input').focus()
    await expect(page.locator('[data-component="top-bar"] [data-city-search="bar"]')).toHaveAttribute('data-ready', 'yes')
    await page.keyboard.press('Shift+Tab')
    await expect(page.locator('[data-component="top-bar"] [data-wordmark]')).toBeFocused()
    const order: (string | null)[] = []
    for (let i = 0; i < 5; i++) {
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement
        const s = getComputedStyle(el)
        const outline = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0
        // Once the island hydrated, the search draws its ring on the input group around the field (a box-shadow), not as an outline.
        const group = el.closest('[data-slot="input-group"]')
        const groupRing = group ? getComputedStyle(group).boxShadow !== 'none' : false
        return { name: el.matches('input') ? 'search' : el.textContent, ring: outline || groupRing }
      })
      expect(info.ring, String(info.name)).toBe(true)
      order.push(info.name)
      if (i < 4) await page.keyboard.press('Tab')
    }
    expect(order).toEqual(['Voto a Voto', 'search', 'Comparar', 'Conferir', 'Usar os dados'])
  })

  test('every link is at least 44 px high and 44 px wide', async ({ page }) => {
    await page.goto(base)
    for (const a of await bar(page).locator('a').all()) {
      const box = (await a.boundingBox())!
      expect(box.height, (await a.textContent()) ?? '').toBeGreaterThanOrEqual(44)
      expect(box.width).toBeGreaterThanOrEqual(44)
      // The hit area is the link itself: the middle of its box reaches it.
      const hit = await a.evaluate((el) => {
        const r = el.getBoundingClientRect()
        return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest('a') === el
      })
      expect(hit).toBe(true)
    }
  })

  test('the three anchors reach their sections', async ({ page }) => {
    for (const [label, href] of TASKS) {
      await page.goto(`${base}relatorios/`)
      await bar(page).getByRole('link', { name: label }).click()
      await expect(page).toHaveURL(href)
      await expect(page.locator(href.slice(href.indexOf('#'))).first()).toBeVisible()
    }
  })

  test('Relatórios and Mapa por estado are not in the bar, but the footer line on every page type reaches them', async ({ page }) => {
    for (const [name, url] of Object.entries(PAGES)) {
      await page.goto(url)
      await expect(bar(page).getByRole('link', { name: /Relatórios|Mapa por estado/ }), name).toHaveCount(0)
      const line = page.locator('[data-component="consent-footer"]')
      await expect(line.getByRole('link', { name: 'Relatórios' }), name).toHaveAttribute('href', `${base}relatorios/`)
      await expect(line.getByRole('link', { name: 'Mapa por estado' }), name).toHaveAttribute('href', `${base}mapa/`)
    }
  })

  test('the footer line links are at least 44 px high', async ({ page }) => {
    await page.goto(base)
    for (const a of await page.locator('[data-component="consent-footer"] a').all()) {
      expect((await a.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    }
  })

  test('the search still loads on first interaction only and "/" still focuses it', async ({ page }) => {
    const seen = collectRequests(page)
    await page.goto(`${base}sobre-os-dados/`)
    await page.waitForLoadState('networkidle')
    expect(seen.filter((r) => /CitySearch|search\.json/.test(r.url))).toEqual([])
    await page.keyboard.press('/')
    const live = bar(page).getByRole('combobox', { name: 'Ver minha cidade' })
    await expect(live).toBeFocused()
    await expect(live).toHaveAttribute('placeholder', 'Ver minha cidade')
    expect(seen.some((r) => /search\.json/.test(r.url))).toBe(true)
  })

  test('has no axe violations (contrast included)', async ({ page }) => {
    await page.goto(base)
    const results = await new AxeBuilder({ page }).include('[data-component="top-bar"]').analyze()
    expect(results.violations).toEqual([])
  })

  test.describe('without JavaScript', () => {
    useNoJs()
    test('the bar is readable and its links work', async ({ page }) => {
      await page.goto(`${base}brasil/`)
      expect(await barLinks(page)).toEqual([['Voto a Voto', base], ...TASKS])
      await bar(page).getByRole('link', { name: 'Comparar' }).click()
      await expect(page).toHaveURL(`${base}#comparar`)
      await expect(page.locator('#comparar')).toBeVisible()
    })
  })
})
