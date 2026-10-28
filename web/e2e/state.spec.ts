import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { base, collectRequests, expectNoHorizontalScroll, resizeTo, violations, waitReady, WIDTHS } from './helpers'

/*
 * State page (:uf/, #50, reorganised by #83): the search box comes FIRST and filters the ONE list of municipalities below it, the
 * coloured rows of the municipality island's Lista view (colour chip, name, margin in pp, valid votes). The rows are pre-rendered
 * links, so the filter reads them from the page and makes no request; a tap on a row opens the City card.
 * The search box tells tests when its filter is drawn: `data-filtered` is "off", "none" or the number of rows shown.
 */
const rj = `${base}rj/`
const rows = (page: Page) => page.locator('[data-map-area] nav a[data-cd]')
const shown = (page: Page) => page.locator('[data-map-area] nav a[data-cd]:visible')
const box = (page: Page) => page.locator('[data-state-search]')
const input = (page: Page) => page.getByRole('searchbox', { name: /^Busque sua cidade em/ })
const status = (page: Page) => page.locator('[data-state-results]')
/** The island's component chunk: holding it back keeps the island un-hydrated while the page script runs. */
const ISLAND_JS = /\/_astro\/CityMapMap\..*\.js/

async function filteredTo(page: Page, value: string) {
  await expect(box(page)).toHaveAttribute('data-filtered', value)
}

test.describe('state: one list, search first', () => {
  test('on a phone the search comes first and the municipalities are ONE list below it', async ({ page }) => {
    await page.goto(rj)
    await waitReady(page)
    await expect(rows(page)).toHaveCount(6)
    const [field, firstRow] = await Promise.all([input(page).boundingBox(), rows(page).first().boundingBox()])
    expect(field!.y + field!.height).toBeLessThanOrEqual(firstRow!.y)
    // no second, plain list of names: one list of municipalities in the whole page
    await expect(page.getByRole('navigation', { name: 'Municípios' })).toHaveCount(1)
    await expect(page.locator('[data-state-list], a.state-row')).toHaveCount(0)
    expect(await page.locator('a[href*="/rj/cidade-exemplo"]').count()).toBe(6)
  })

  test('the rows are the coloured rows: chip, name, margin in pp, valid votes, each a link to the City card', async ({ page }) => {
    await page.goto(rj)
    await waitReady(page)
    const row = page.locator('a[data-cd="99001"]')
    await expect(row).toHaveAttribute('href', `${base}rj/cidade-exemplo/`)
    await expect(row).toContainText('Cidade Exemplo')
    await expect(row).toContainText('+0,9 pp')
    await expect(row).toContainText('68.434')
    expect(await row.locator('span[aria-hidden="true"]').first().evaluate((e) => (e as HTMLElement).style.background)).not.toBe('')
    // the order is the island's: round-2 valid votes
    expect(await rows(page).evaluateAll((els) => els.map((e) => e.getAttribute('data-cd')))).toEqual(['99001', '99006', '99005', '99004', '99003', '99002'])
  })

  test('typing filters that list (accents, capitals, partial words), tells how many are left, and erasing restores it', async ({ page }) => {
    await page.goto(rj)
    await waitReady(page)
    await filteredTo(page, 'off')
    await expect(status(page)).toBeHidden()
    // the matching is the Home search's (shared/city-search): only B has a "b" that is not inside "cidade exemplo"
    await input(page).fill('CIDADE EXEMPLO b')
    await filteredTo(page, '1')
    await expect(shown(page)).toHaveCount(1)
    await expect(shown(page).first()).toContainText('Cidade Exemplo B')
    await expect(status(page)).toHaveText('1 município encontrado')
    // a filtered row looks the same and carries the same link
    await expect(shown(page).first()).toContainText('-6,4 pp')
    await expect(shown(page).first()).toContainText('38.320')
    await expect(shown(page).first()).toHaveAttribute('href', `${base}rj/cidade-exemplo-b/`)
    await input(page).fill('exe')
    await filteredTo(page, '6')
    await expect(status(page)).toHaveText('6 municípios encontrados')
    await input(page).fill('')
    await filteredTo(page, 'off')
    await expect(shown(page)).toHaveCount(6)
    await expect(status(page)).toBeHidden()
  })

  test('accents do not matter: "esperanca" finds Boa Esperança do Norte', async ({ page }) => {
    await page.goto(`${base}mt/`)
    await waitReady(page)
    for (const text of ['esperanca', 'ESPERANÇA', 'boa esperança do']) {
      await input(page).fill(text)
      await filteredTo(page, '1')
      await expect(shown(page).first()).toContainText('Boa Esperança do Norte')
    }
  })

  test('nothing matching says so, and never finds a city of another state', async ({ page }) => {
    await page.goto(rj)
    await waitReady(page)
    await input(page).fill('paulista')
    await filteredTo(page, 'none')
    await expect(status(page)).toHaveText('Nenhuma cidade encontrada em RJ. Confira a grafia.')
    await expect(shown(page)).toHaveCount(0)
    await input(page).fill('')
    await filteredTo(page, 'off')
    await expect(shown(page)).toHaveCount(6)
  })

  test('a tap on a row opens the City card, filtered or not (the D1 bug: it used to stay on the page)', async ({ page }) => {
    await page.goto(rj)
    await waitReady(page)
    await rows(page).nth(3).tap()
    await expect(page).toHaveURL(new RegExp(`${rj}cidade-exemplo-c/$`))
    await page.goBack()
    await waitReady(page)
    await input(page).fill('exemplo b')
    await filteredTo(page, '1')
    await shown(page).first().tap()
    await expect(page).toHaveURL(new RegExp(`${rj}cidade-exemplo-b/$`))
  })

  test('Enter opens the city when exactly one is left, otherwise nothing happens', async ({ page }) => {
    await page.goto(rj)
    await waitReady(page)
    await input(page).fill('exemplo')
    await filteredTo(page, '6')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(rj)
    await input(page).fill('exemplo b')
    await filteredTo(page, '1')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/rj\/cidade-exemplo-b\/$/)
  })

  test('keyboard: the search box is reached before the first city, and Tab then lands on the visible rows only', async ({ page }) => {
    await page.goto(rj)
    await waitReady(page)
    await input(page).focus()
    await input(page).fill('exemplo b')
    await filteredTo(page, '1')
    // Tab: the Lista and Mapa toggles first, then the one city left (the hidden rows are skipped)
    for (let i = 0; i < 3; i++) await page.keyboard.press('Tab')
    await expect(page.locator(':focus')).toHaveAttribute('data-cd', '99003')
  })

  test('searching makes no request at all beyond the page load (rows come from the page)', async ({ page, baseURL }) => {
    const seen = collectRequests(page)
    await page.goto(rj)
    await waitReady(page)
    await page.waitForLoadState('networkidle')
    const before = seen.length
    await input(page).fill('cidade')
    await filteredTo(page, '6')
    expect(seen.length).toBe(before)
    expect(violations(seen, [new URL(baseURL!).origin])).toEqual([])
  })
})

test.describe('state: typing while the island is still hydrating', () => {
  test('what is typed before the island hydrates keeps its filter through hydration, and later typing still works', async ({ page }) => {
    let release!: () => void
    const gate = new Promise<void>((r) => (release = r))
    await page.route(ISLAND_JS, async (route) => {
      await gate
      await route.continue()
    })
    await page.goto(rj, { waitUntil: 'domcontentloaded' })
    await waitReady(page)
    await expect(page.locator('astro-island')).toHaveAttribute('ssr', '')
    await input(page).fill('exemplo b')
    await filteredTo(page, '1')
    // the first tap lands on the island's markup (a toggle tap while React is not attached): kept, not lost
    await page.getByRole('link', { name: 'Mapa', exact: true }).click()
    release()
    await expect(page.locator('[data-slot="mapa-municipios"]')).toBeVisible()
    // the map view is on, with the text still in the box ...
    await expect(input(page)).toHaveValue('exemplo b')
    // ... and typing more brings the list back, filtered by the NEW text only (the latest wins)
    await input(page).fill('paulista')
    await expect(page.locator('[data-slot="mapa-municipios"]')).toHaveCount(0)
    await filteredTo(page, 'none')
    await expect(shown(page)).toHaveCount(0)
  })

  test('hydration alone never undoes a filter: the rows stay hidden and no result flickers back', async ({ page }) => {
    let release!: () => void
    const gate = new Promise<void>((r) => (release = r))
    await page.route(ISLAND_JS, async (route) => {
      await gate
      await route.continue()
    })
    await page.goto(rj, { waitUntil: 'domcontentloaded' })
    await waitReady(page)
    await input(page).fill('exemplo b')
    await filteredTo(page, '1')
    // watch every change of the rows' hidden state from now on: no row may come back once hidden
    await page.evaluate(() => {
      const w = window as unknown as { unhid: number }
      w.unhid = 0
      new MutationObserver((records) => {
        for (const r of records) if (r.attributeName === 'hidden' && !(r.target as HTMLElement).hidden) w.unhid++
      }).observe(document.querySelector('[data-map-area]')!, { attributes: true, subtree: true, attributeFilter: ['hidden'] })
    })
    // a tap on the island (the legend) starts hydration; the filter must survive it
    await page.locator('[data-slot="mapa-escala"]').first().tap()
    release()
    await page.waitForFunction(() => !document.querySelector('astro-island')?.hasAttribute('ssr'))
    await expect(shown(page)).toHaveCount(1)
    expect(await page.evaluate(() => (window as unknown as { unhid: number }).unhid)).toBe(0)
    await expect(input(page)).toHaveValue('exemplo b')
  })

  test('typing before the page script runs is not lost: the box value is read when the script starts', async ({ page }) => {
    let release!: () => void
    const gate = new Promise<void>((r) => (release = r))
    await page.route(/\/_astro\/.*\.js/, async (route) => {
      await gate
      await route.continue()
    })
    // module scripts hold back DOMContentLoaded too: the page is usable as soon as the HTML is committed
    await page.goto(rj, { waitUntil: 'commit' })
    await expect(input(page)).toBeVisible()
    await expect(box(page)).not.toHaveAttribute('data-filtered', /.*/)
    await input(page).fill('exemplo b')
    release()
    await filteredTo(page, '1')
    await expect(shown(page).first()).toContainText('Cidade Exemplo B')
  })
})

test.describe('state: Lista | Mapa', () => {
  test('the Mapa view keeps its panel and the filter waits on the list: back on Lista the same text is still applied', async ({ page }) => {
    await page.goto(rj)
    await waitReady(page)
    await input(page).fill('exemplo b')
    await filteredTo(page, '1')
    await page.getByRole('link', { name: 'Mapa', exact: true }).click()
    await expect(page.locator('[data-slot="mapa-municipios"]')).toBeVisible()
    const panel = page.locator('[data-slot="mapa-selecionado"]')
    await expect(panel).toContainText('Cidade Exemplo · selecionado')
    await expect(panel.getByRole('link', { name: 'Abrir cidade' })).toHaveAttribute('href', `${base}rj/cidade-exemplo/`)
    await page.getByRole('link', { name: 'Lista', exact: true }).click()
    await expect(rows(page)).toHaveCount(6)
    await expect(shown(page)).toHaveCount(1)
    await expect(shown(page).first()).toContainText('Cidade Exemplo B')
    await expect(input(page)).toHaveValue('exemplo b')
  })

  test('typing while the map shows switches back to the list (the filter only exists there)', async ({ page }) => {
    await page.goto(`${rj}?vista=mapa`)
    await waitReady(page)
    await expect(page.locator('[data-slot="mapa-municipios"]')).toBeVisible()
    await input(page).fill('exemplo b')
    await expect(page.locator('[data-slot="mapa-municipios"]')).toHaveCount(0)
    await filteredTo(page, '1')
    await expect(shown(page).first()).toContainText('Cidade Exemplo B')
    expect(new URL(page.url()).searchParams.get('vista')).toBeNull()
  })
})

test.describe('state links and map area', () => {
  test('offers the map-by-state and three-cycles links, back to home, and keeps the map area under the search', async ({ page }) => {
    await page.goto(rj)
    await waitReady(page)
    await expect(page.getByRole('link', { name: 'Ver mapa por estado ›' })).toHaveAttribute('href', `${base}mapa/`)
    await expect(page.getByRole('link', { name: 'Ver os três ciclos do estado ›' })).toHaveAttribute('href', `${base}tres-ciclos/rj/`)
    await expect(page.getByRole('link', { name: '‹ Início' })).toHaveAttribute('href', base)
    await expect(page.locator('[data-placeholder="state-map"][data-uf="rj"]')).toBeVisible()
  })

  test('the count of municipalities, its "De onde vem este número?" link and the seal stay on the page', async ({ page }) => {
    await page.goto(rj)
    await expect(page.locator('.page__subtitle')).toHaveText('6 municípios')
    await expect(page.locator('a.calc')).toBeVisible()
    await expect(page.locator('[data-seal]')).toBeVisible()
  })

  test('overseas has no state page', async ({ page }) => {
    expect((await page.goto(`${base}zz/`))?.status()).toBe(404)
  })

  test('a UF the dataset has no state shard for is the 404 fallback', async ({ page }) => {
    const res = await page.goto(`${base}nao-existe/`)
    expect(res!.status()).toBe(404)
  })
})

test.describe('state: layout and accessibility', () => {
  for (const width of WIDTHS) {
    test(`no horizontal scroll at ${width} px, search box and rows at least 44 px high`, async ({ page }) => {
      await resizeTo(page, width)
      await page.goto(rj)
      await waitReady(page)
      await expectNoHorizontalScroll(page)
      expect((await input(page).boundingBox())!.height).toBeGreaterThanOrEqual(44)
      for (const h of await rows(page).evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) expect(h).toBeGreaterThanOrEqual(44)
      await input(page).fill('exemplo')
      await filteredTo(page, '6')
      await expectNoHorizontalScroll(page)
    })
  }

  test('the new text sits on the #86 scale: rows 16 and 13 px, the search box 16 px, the count 13 px, weights 400', async ({ page }) => {
    await page.goto(rj)
    await waitReady(page)
    await input(page).fill('exemplo')
    await filteredTo(page, '6')
    const sizes = await page.evaluate(() => {
      const px = (el: Element | null) => (el ? getComputedStyle(el).fontSize : 'missing')
      const row = document.querySelector('[data-map-area] nav a')!
      return { name: px(row.querySelectorAll('span')[1]!), pp: px(row.querySelectorAll('span')[2]!), votes: px(row.querySelectorAll('span')[4] ?? row.querySelectorAll('span')[3]!), input: px(document.querySelector('[data-state-search] input')), note: px(document.querySelector('[data-state-results]')), weight: getComputedStyle(row.querySelectorAll('span')[1]!).fontWeight }
    })
    expect(sizes).toMatchObject({ name: '16px', pp: '13px', input: '16px', note: '13px', weight: '400' })
  })

  test('axe finds no violations, with the list unfiltered and filtered', async ({ page }) => {
    await page.goto(rj)
    await waitReady(page)
    for (const text of ['', 'exemplo b', 'zzzz']) {
      await input(page).fill(text)
      await filteredTo(page, text === '' ? 'off' : text === 'zzzz' ? 'none' : '1')
      const { violations: found } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).disableRules(['target-size']).analyze()
      expect(found.map((v) => `${v.id} [${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(', ')}]`), `text "${text}"`).toEqual([])
    }
  })
})

test.describe('state without JavaScript', () => {
  test.use({ javaScriptEnabled: false })
  test('the full coloured list is there, every row a native anchor, and the search is said to need JavaScript', async ({ page }) => {
    await page.goto(rj)
    await expect(rows(page)).toHaveCount(6)
    await expect(rows(page).first()).toHaveAttribute('href', `${base}rj/cidade-exemplo/`)
    await expect(rows(page).first()).toContainText('+0,9 pp')
    await expect(rows(page).first()).toContainText('68.434')
    await expect(page.getByRole('link', { name: 'Ver mapa por estado ›' })).toBeVisible()
    expect(await page.locator('noscript').first().textContent()).toContain('A busca precisa de JavaScript')
  })

  test('a native tap on a row navigates to the City card', async ({ page }) => {
    await page.goto(rj)
    await rows(page).nth(4).click()
    await expect(page).toHaveURL(new RegExp(`${rj}cidade-exemplo-b/$`))
  })
})
