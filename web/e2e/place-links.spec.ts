import { expect, test, type Locator, type Page } from '@playwright/test'
import { base } from './helpers'

/*
 * Every UF and every region mention is a link (#184), fixture build. The guard over every built page is `src/shared/place-links-guard.test.ts`; this spec checks what a browser adds:
 * where the links go, what they are called, that none holds another link, that a finger finds a 44 px target and that the keyboard reaches them in the reading order.
 */

const city = `${base}rj/cidade-exemplo/`

/** How tall the hit area of a link is at its centre, by what `elementFromPoint` finds going up and down (a pseudo-element layer counts, as it does for a finger). */
async function hitHeight(page: Page, link: Locator): Promise<number> {
  await link.scrollIntoViewIfNeeded()
  const box = (await link.boundingBox())!
  return link.evaluate(
    (el, [x, y]) => {
      const hits = (py: number) => {
        const t = document.elementFromPoint(x!, py)
        return !!t && (t === el || el.contains(t))
      }
      let up = 0
      while (up < 60 && hits(y! - up - 1)) up++
      let down = 0
      while (down < 60 && hits(y! + down + 1)) down++
      return up + down + 1
    },
    [box.x + box.width / 2, box.y + box.height / 2],
  )
}

test.describe('city page', () => {
  test('the state under the city name is a link and the footer link to the state is gone', async ({ page }) => {
    await page.goto(city)
    const state = page.locator('.page__subtitle a[data-place="uf"]')
    await expect(state).toHaveText('RJ ›')
    await expect(state).toHaveAttribute('href', `${base}rj/`)
    await expect(state).toHaveAccessibleName('Página do estado RJ · Rio de Janeiro')
    await expect(page.getByRole('link', { name: 'Ver o estado ›' })).toHaveCount(0)
  })

  test('the state link is a 44 px target and comes before the figures in the keyboard order', async ({ page }) => {
    await page.goto(city)
    const state = page.locator('.page__subtitle a[data-place="uf"]')
    expect(await hitHeight(page, state)).toBeGreaterThanOrEqual(44)
    await state.focus()
    await expect(state).toBeFocused()
    const order = await page.evaluate(() => [...document.querySelectorAll<HTMLAnchorElement>('main a[href]')].map((a) => a.getAttribute('data-place') ?? a.getAttribute('data-calc') ?? a.className))
    expect(order.indexOf('uf')).toBeLessThan(order.findIndex((o) => o.includes('city-share')))
  })

  test('no link holds another link', async ({ page }) => {
    await page.goto(city)
    await expect(page.locator('a a')).toHaveCount(0)
  })
})

test.describe('Brasil e regiões and the region page', () => {
  test('each region name is a link to its page with a name that says where it goes', async ({ page }) => {
    await page.goto(`${base}brasil/`)
    const link = page.locator('[data-regiao="sudeste"] a[data-place="regiao"]')
    await expect(link).toHaveText('Sudeste ›')
    await expect(link).toHaveAttribute('href', `${base}brasil/sudeste/`)
    await expect(link).toHaveAccessibleName('Página da região Sudeste')
    expect(await hitHeight(page, link)).toBeGreaterThanOrEqual(44)
    await expect(page.locator('a a')).toHaveCount(0)
  })

  test('the states of a region are rows that link to the state, with the state part of the row link', async ({ page }) => {
    await page.goto(`${base}brasil/sudeste/`)
    await expect(page.locator('[data-region-states] a')).toHaveCount(2)
    await expect(page.locator('[data-region-states] a a')).toHaveCount(0)
    await expect(page.locator('[data-region-states] a[data-uf="rj"]')).toContainText('Rio de Janeiro · RJ')
  })
})

test.describe('sentences of the catalog and the calculation pages', () => {
  test('a state or a region named in a record is a link, never nested, in both registers', async ({ page }) => {
    await page.goto(`${base}fato/regiao/sudeste/2026-2/`)
    const sentences = page.locator('.fact__sentence')
    await expect(sentences.first().locator('a[data-place="regiao"]')).toHaveAttribute('href', `${base}brasil/sudeste/`)
    await expect(page.locator('#estado-rj .fact__sentence[data-register="plain"] a[data-place="uf"]').first()).toHaveAttribute('href', `${base}rj/`)
    await expect(page.locator('a a')).toHaveCount(0)
  })

  test('the reports print the state as part of the city link, and the notes name it as a link', async ({ page }) => {
    await page.goto(`${base}relatorios/como-cada-grupo-votou/`)
    await expect(page.locator('a a')).toHaveCount(0)
    const rows = page.locator('li a[data-place="uf"]')
    expect(await rows.count()).toBeGreaterThan(0)
  })
})

test.describe('a state map panel', () => {
  test('"RJ · selecionado" names the state as a link to its page', async ({ page }) => {
    await page.goto(`${base}mapa/`)
    const panel = page.locator('[data-slot="mapa-selecionado"]')
    await expect(panel.locator('a[data-place="uf"]').first()).toHaveAttribute('href', new RegExp(`^${base}[a-z]{2}/$`))
    await expect(panel).toContainText('· selecionado')
  })
})
