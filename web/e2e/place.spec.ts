import { expect, test, type Page } from '@playwright/test'
import { activateSearch, base } from './helpers'
import { useNoJs } from './presets'

/*
 * Ticket #35: the site remembers the place the visitor picked (in this browser only) and Home offers it back as
 * "Sua cidade". Fixture dataset: rj (Cidade Exemplo ...), sp, mt. The state tiles and the search results are
 * the two ways of picking; opening a page any other way picks nothing.
 */
const KEY = 'voto-a-voto:place'
const stored = (page: Page) => page.evaluate((k) => localStorage.getItem(k), KEY)
const shortcut = (page: Page) => page.locator('[data-place-shortcut]')

async function pickState(page: Page, uf: string) {
  await page.goto(base)
  await page.waitForFunction(() => document.documentElement.dataset.ready !== undefined)
  await page.locator(`a[data-uf="${uf}"]`).click()
  await expect(page).toHaveURL(new RegExp(`/${uf}/$`))
}

test.describe('home: the Sua cidade shortcut', () => {
  test('a first-time visitor sees no shortcut and nothing is stored', async ({ page }) => {
    await page.goto(base)
    await page.waitForFunction(() => document.documentElement.dataset.ready !== undefined)
    await expect(shortcut(page)).toBeHidden()
    expect(await stored(page)).toBeNull()
  })

  test('picking a state saves it, and the shortcut opens it', async ({ page }) => {
    await pickState(page, 'mt')
    expect(JSON.parse((await stored(page))!)).toEqual({ kind: 'state', uf: 'mt', nome: 'Mato Grosso' })
    await page.goto(base)
    await expect(shortcut(page)).toBeVisible()
    await expect(shortcut(page)).toContainText('Seu estado')
    await shortcut(page).getByRole('link').click()
    await expect(page).toHaveURL(`${base}mt/`)
  })

  test('picking a city from the search saves it, and the shortcut opens it', async ({ page }) => {
    await page.goto(base)
    const box = await activateSearch(page)
    await box.fill('paulista')
    await page.locator('a[data-position="1"]').click()
    await expect(page).toHaveURL(`${base}sp/cidade-exemplo-paulista/`)
    expect(JSON.parse((await stored(page))!)).toEqual({ kind: 'city', uf: 'sp', slug: 'cidade-exemplo-paulista', nome: 'Cidade Exemplo Paulista' })
    await page.goto(base)
    await expect(shortcut(page)).toContainText('Sua cidade')
    await expect(shortcut(page).getByRole('link')).toHaveText('Cidade Exemplo Paulista · SP ›')
    await shortcut(page).getByRole('link').click()
    await expect(page).toHaveURL(`${base}sp/cidade-exemplo-paulista/`)
  })

  test('the last pick replaces the earlier one', async ({ page }) => {
    await pickState(page, 'mt')
    await pickState(page, 'rj')
    await page.goto(base)
    await expect(shortcut(page).getByRole('link')).toHaveText('Rio de Janeiro ›')
  })

  test('"esquecer meus dados" clears the place, the language choice and the notice, and hides the shortcut', async ({ page }) => {
    await pickState(page, 'mt')
    await page.evaluate(() => {
      localStorage.setItem('voto-a-voto:register', 'plain')
      localStorage.setItem('voto-a-voto:notice', 'acknowledged')
      localStorage.setItem('other-site-key', 'kept')
    })
    await page.goto(base)
    await shortcut(page).getByRole('button', { name: 'esquecer meus dados' }).click()
    await expect(shortcut(page)).toBeHidden()
    expect(await page.evaluate(() => Object.keys(localStorage).sort())).toEqual(['other-site-key'])
    await page.reload()
    await expect(shortcut(page)).toBeHidden()
  })

  test('the forget control is a real tap target', async ({ page }) => {
    await pickState(page, 'rj')
    await page.goto(base)
    const box = (await shortcut(page).getByRole('button').boundingBox())!
    expect(box.height).toBeGreaterThanOrEqual(44)
  })
})

test.describe('home: nothing leaves the device and nothing breaks without storage', () => {
  test('picking a place sends no request other than the page navigation', async ({ page }) => {
    const posts: string[] = []
    page.on('request', (r) => r.method() !== 'GET' && posts.push(r.url()))
    await pickState(page, 'sp')
    await page.goto(base)
    expect(posts).toEqual([])
  })

  test('with browser storage blocked the home page, the tiles and the search work, without errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new DOMException('blocked', 'SecurityError')
        },
      })
    })
    await page.goto(base)
    await page.waitForFunction(() => document.documentElement.dataset.ready !== undefined)
    await expect(shortcut(page)).toBeHidden()
    const box = await activateSearch(page)
    await box.fill('paulista')
    await page.locator('a[data-position="1"]').click()
    await expect(page).toHaveURL(`${base}sp/cidade-exemplo-paulista/`)
    await page.goto(base)
    await page.locator('a[data-uf="mt"]').click()
    await expect(page).toHaveURL(`${base}mt/`)
    expect(errors).toEqual([])
  })
})

test.describe('home without JavaScript', () => {
  useNoJs()
  test('the shortcut stays out of the page', async ({ page }) => {
    await page.goto(base)
    await expect(shortcut(page)).toBeHidden()
  })
})

/* #105: with a chosen destination ("?para="), the shortcut of a remembered city goes there, and the sub-lines that ask for a city name the remembered one. */
test.describe('home: the remembered city and the chosen destination', () => {
  const CITY = { kind: 'city', uf: 'sp', slug: 'cidade-exemplo-paulista', nome: 'Cidade Exemplo Paulista' }
  const asks = (page: Page) => page.locator('[data-ask-city]')
  const remember = (page: Page, place: object = CITY) => page.addInitScript(([k, v]) => localStorage.setItem(k, v), [KEY, JSON.stringify(place)] as const)
  const waitHome = (page: Page) => page.waitForFunction(() => document.documentElement.dataset.ready === 'home')
  const shortcutHref = (page: Page) => expect(shortcut(page).getByRole('link'))

  for (const [para, path] of [['compartilhar', 'compartilhar/'], ['tres-ciclos', 'tres-ciclos/']] as const) {
    test(`?para=${para} sends the shortcut to that page of the remembered city`, async ({ page }) => {
      await remember(page)
      await page.goto(`${base}?para=${para}`)
      await waitHome(page)
      await shortcutHref(page).toHaveAttribute('href', `${base}sp/cidade-exemplo-paulista/${path}`)
    })
  }

  test('without a destination, or with an unknown one, the shortcut opens the city card', async ({ page }) => {
    await remember(page)
    for (const query of ['', '?para=outra-coisa']) {
      await page.goto(base + query)
      await waitHome(page)
      await shortcutHref(page).toHaveAttribute('href', `${base}sp/cidade-exemplo-paulista/`)
    }
  })

  test('a remembered state keeps its own page whatever the destination', async ({ page }) => {
    await remember(page, { kind: 'state', uf: 'mt', nome: 'Mato Grosso' })
    await page.goto(`${base}?para=compartilhar`)
    await waitHome(page)
    await shortcutHref(page).toHaveAttribute('href', `${base}mt/`)
  })

  test('a remembered city is named in the sub-lines that ask for a city', async ({ page }) => {
    await remember(page)
    await page.goto(base)
    await waitHome(page)
    await expect(asks(page)).toHaveText(Array(3).fill('Cidade lembrada: Cidade Exemplo Paulista'))
  })

  test('with no remembered city the sub-lines are unchanged', async ({ page }) => {
    await page.goto(base)
    await waitHome(page)
    await expect(asks(page)).toHaveText(['Escolha a cidade e toque em Compartilhar', 'Escolha a cidade e veja os três ciclos', 'Escolha a primeira cidade; a outra vem depois'])
  })

  test('forgetting the data brings the original sub-lines back', async ({ page }) => {
    await remember(page)
    await page.goto(base)
    await waitHome(page)
    await shortcut(page).getByRole('button', { name: 'esquecer meus dados' }).click()
    await expect(asks(page).first()).toHaveText('Escolha a cidade e toque em Compartilhar')
  })
})
