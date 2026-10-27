import { expect, test, type Page } from '@playwright/test'
import { activateSearch, base } from './helpers'

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
  test.use({ javaScriptEnabled: false })
  test('the shortcut stays out of the page', async ({ page }) => {
    await page.goto(base)
    await expect(shortcut(page)).toBeHidden()
  })
})
