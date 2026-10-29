import { expect, test, type Page } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { base, collectRequests, resizeTo } from './helpers'
import { useNoJs } from './presets'
import { appHeaderPagesOnDisk } from './routes-inventory'

/*
 * Ticket #153: every public page carries the app header: the Voto a Voto name as a link home and the city search, readable without scripts,
 * the search loading on the first interaction. The route list is derived (e2e/routes-inventory.ts): every page template minus the reasoned
 * APP_HEADER_EXCLUSIONS, at its fixture URL, so a page that grows without the header fails here naming its URL. Phone frame (390 px) for the
 * header, 1440 px for the top bar that replaces it from 1024 px.
 */
const PAGES = appHeaderPagesOnDisk(fileURLToPath(new URL('..', import.meta.url)))
const MIN = 44

const header = (page: Page) => page.locator('[data-app-header]').first()
const field = (page: Page) => page.locator('[data-topbar-search]:visible').first()

test.describe('the app header on every public page (phone)', () => {
  test('the derived route list is not empty', () => {
    expect(PAGES.length).toBeGreaterThanOrEqual(30)
  })

  for (const path of PAGES) {
    test(`${path || '/'}: the wordmark links home and the search field is there`, async ({ page }) => {
      await page.goto(`${base}${path}`)
      await expect(header(page), `${path} has no app header`).toBeVisible()
      await expect(header(page).getByRole('link', { name: 'Voto a Voto' })).toHaveAttribute('href', base)
      await expect(field(page).locator('input')).toBeVisible()
      await expect(field(page).locator('input')).toHaveAttribute('aria-label', 'Ver minha cidade')
    })
  }

  test('the wordmark link is a 44 px target on a report page and on a Usar os dados page', async ({ page }) => {
    for (const path of ['relatorios/cidades-que-viraram/', 'sobre-os-dados/', 'api/']) {
      await page.goto(`${base}${path}`)
      const box = (await header(page).getByRole('link', { name: 'Voto a Voto' }).boundingBox())!
      expect(box.height, path).toBeGreaterThanOrEqual(MIN)
    }
  })

  test('on a report page the search loads on the first touch only, answers, and its result opens the city', async ({ page }) => {
    const seen = collectRequests(page)
    await page.goto(`${base}relatorios/cidades-que-viraram/`)
    await page.waitForLoadState('networkidle')
    expect(seen.filter((r) => /desktop-shell|topbar-search|search\.json/.test(r.url)), 'nothing of the search before the first touch').toEqual([])
    await field(page).locator('input').click()
    const live = field(page).locator('[data-city-search="bar"]')
    await expect(live).toHaveAttribute('data-ready', 'yes')
    await page.keyboard.type('Exemplo')
    const hit = field(page).locator('a[data-position="1"]')
    await expect(hit).toBeVisible()
    await hit.click()
    await expect(page).toHaveURL(/\/rj\/cidade-exemplo\//)
  })

  test('a Usar os dados page and a quiet page search too', async ({ page }) => {
    for (const path of ['edicoes/', 'fale-sem-errar/']) {
      await page.goto(`${base}${path}`)
      await field(page).locator('input').click()
      await expect(field(page).locator('[data-city-search="bar"]'), path).toHaveAttribute('data-ready', 'yes')
    }
  })

  test.describe('without JavaScript', () => {
    useNoJs()
    test('a report page and a Usar os dados page keep the wordmark link and the field', async ({ page }) => {
      for (const path of ['relatorios/disputas-mais-apertadas/', 'imprensa/']) {
        await page.goto(`${base}${path}`)
        await expect(header(page).getByRole('link', { name: 'Voto a Voto' }), path).toHaveAttribute('href', base)
        await expect(field(page).locator('input'), path).toBeVisible()
      }
    })
  })
})

test.describe('the top bar replaces it from 1024 px, and "/" works from every page', () => {
  test('every route of the list shows the top bar with the wordmark and the search at 1440 px', async ({ page }) => {
    await resizeTo(page, 1440)
    for (const path of PAGES) {
      await page.goto(`${base}${path}`)
      await expect(page.locator('[data-component="top-bar"]'), path).toBeVisible()
      await expect(page.locator('[data-component="top-bar"] input'), path).toBeVisible()
    }
  })

  test('"/" focuses the live search on a report page, a Usar os dados page and the fact record', async ({ page }) => {
    await resizeTo(page, 1440)
    for (const path of ['relatorios/maiores-viradas/', 'api/', 'fato/brasil/2026-2/']) {
      await page.goto(`${base}${path}`)
      await page.keyboard.press('/')
      await expect(page.locator('[data-component="top-bar"]').getByRole('combobox', { name: 'Ver minha cidade' }), path).toBeFocused()
    }
  })
})
