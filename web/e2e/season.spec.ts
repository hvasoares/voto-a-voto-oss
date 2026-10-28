import { expect, test, type Page } from '@playwright/test'
import { base, collectRequests, violations } from './helpers'

/*
 * State season (#42, #43; Sketch frames "13b Temporada do estado" and "13c Temporada de trás para frente"), 390x844, fixture RJ (2018, 2022 and 2026 all have data).
 * Three episodes in reading order, each an anchor; the pivot between the 2nd and the 3rd; the order can be reversed and the choice is kept in this browser.
 */
const rj = `${base}tres-ciclos/rj/`
const KEY = 'voto-a-voto:season'
/** Ready = the script's own attribute (it reorders before it sets it); never a timer. */
const ready = (page: Page) => page.waitForSelector('[data-season][data-season-ready="true"]')
const years = (page: Page) => page.locator('[data-season] > [data-cycle]').evaluateAll((els) => els.map((e) => e.getAttribute('data-cycle')))
const parts = (page: Page) => page.locator('[data-season] > *').evaluateAll((els) => els.map((e) => e.getAttribute('data-cycle') ?? (e.hasAttribute('data-pivot') ? 'pivot' : '?')))

test.describe('state season', () => {
  test('without scripts: three episodes in reading order, each with its anchor, the pivot between the 2nd and the 3rd, and no switch', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 }, locale: 'pt-BR' })
    const page = await context.newPage()
    await page.goto(rj)
    expect(await parts(page)).toEqual(['2018', '2022', 'pivot', '2026'])
    for (const ano of ['2018', '2022', '2026']) await expect(page.locator(`[id="${ano}"][data-episode]`)).toHaveCount(1)
    await expect(page.locator('[id="2022"] .season-ep__head')).toContainText('Episódio 2 · 2022')
    await expect(page.locator('[data-pivot]')).toContainText('Entre 2022 e 2026')
    await expect(page.locator('[data-season-order]')).toBeHidden()
    await context.close()
  })

  test('the pivot says the change of the share and in how many cities the side changed, and links its calculation', async ({ page }) => {
    await page.goto(rj)
    await ready(page)
    const pivot = page.locator('[data-pivot]')
    await expect(pivot).toContainText(/Entre 2022 e 2026, a parcela de .+ nos votos válidos do 2º turno variou [+−-]\d+,\d pp\./)
    await expect(pivot).toContainText(/Em \d+ das \d+ cidades com os três ciclos o lado com mais votos mudou\.|Em nenhuma das \d+ cidades/)
    const href = await pivot.getByRole('link', { name: 'ver cálculo' }).getAttribute('href')
    expect(href).toContain('/fato/estado/rj/tres-ciclos/#2026-viradas')
    await page.goto(`${base}fato/estado/rj/tres-ciclos/`)
    await expect(page.locator('[id="2026-viradas"]')).toContainText('cidades com os três ciclos')
  })

  test('a state with a missing cycle says so in the pivot', async ({ page }) => {
    await page.goto(`${base}tres-ciclos/mt/`)
    await expect(page.locator('[data-pivot="missing"]')).toContainText('não dá para comparar 2022 e 2026')
  })

  test('a link to an anchor opens at that episode at 390x844', async ({ page }) => {
    await page.goto(`${rj}#2026`)
    await ready(page)
    const box = (await page.locator('[id="2026"]').boundingBox())!
    expect(box.y).toBeGreaterThanOrEqual(0)
    expect(box.y + 40).toBeLessThanOrEqual(844)
    await expect(page.locator('[id="2026"]')).toHaveCSS('box-shadow', /rgb/)
  })

  test('the switch is a group of two buttons, keyboard reachable and announced; reversing keeps the same episodes and the pivot between the 3rd and the 2nd', async ({ page }) => {
    await page.goto(rj)
    await ready(page)
    expect(await parts(page)).toEqual(['2018', '2022', 'pivot', '2026'])
    const group = page.getByRole('group', { name: 'Ordem dos episódios' })
    await expect(group.getByRole('button', { name: 'Cronológica' })).toHaveAttribute('aria-pressed', 'true')
    await group.getByRole('button', { name: 'Cronológica' }).focus()
    await page.keyboard.press('Tab')
    await expect(group.getByRole('button', { name: 'De trás para frente' })).toBeFocused()
    await page.keyboard.press('Enter')
    expect(await parts(page)).toEqual(['2026', 'pivot', '2022', '2018'])
    await expect(page.locator('[data-season-status]')).toHaveText('Episódios de trás para frente: 2026, 2022, 2018.')
    await expect(group.getByRole('button', { name: 'De trás para frente' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('[data-season-sub]')).toHaveText('Do mais recente ao mais antigo · de 2026 a 2018')
    // the same anchors in both orders
    for (const ano of ['2018', '2022', '2026']) await expect(page.locator(`[id="${ano}"]`)).toHaveCount(1)
    // reading order is DOM order: the tab order follows what is seen
    expect(await years(page)).toEqual(['2026', '2022', '2018'])
  })

  test('the choice is kept in this browser only, and chronological is one tap away', async ({ page, baseURL }) => {
    const seen = collectRequests(page)
    await page.goto(rj)
    await ready(page)
    await page.getByRole('button', { name: 'De trás para frente' }).click()
    expect(await page.evaluate((k) => localStorage.getItem(k), KEY)).toBe('reverse')
    await page.reload()
    await ready(page)
    expect(await years(page)).toEqual(['2026', '2022', '2018'])
    await page.getByRole('button', { name: 'Cronológica' }).click()
    expect(await years(page)).toEqual(['2018', '2022', '2026'])
    expect(await page.evaluate((k) => localStorage.getItem(k), KEY)).toBe('chronological')
    expect(violations(seen, [new URL(baseURL!).origin])).toEqual([])
  })

  test('a shared link lands on its episode even when the stored order moved it', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('voto-a-voto:season', 'reverse'))
    await page.goto(`${rj}#2018`)
    await ready(page)
    expect(await years(page)).toEqual(['2026', '2022', '2018'])
    const box = (await page.locator('[id="2018"]').boundingBox())!
    expect(box.y).toBeGreaterThanOrEqual(0)
    expect(box.y).toBeLessThan(844)
  })

  test('with storage blocked the switch still works until the page closes, and nothing throws', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new Error('blocked')
        },
      })
    })
    await page.goto(rj)
    await ready(page)
    await page.getByRole('button', { name: 'De trás para frente' }).click()
    expect(await years(page)).toEqual(['2026', '2022', '2018'])
    expect(errors).toEqual([])
  })

  test('nothing is requested for the season: only GETs of the site, no /data/', async ({ page, baseURL }) => {
    const seen = collectRequests(page)
    await page.goto(rj)
    await ready(page)
    await page.getByRole('button', { name: 'De trás para frente' }).click()
    await page.waitForLoadState('networkidle')
    expect(violations(seen, [new URL(baseURL!).origin])).toEqual([])
    expect(seen.filter((r) => /\/data\//.test(r.url))).toEqual([])
  })

  test('at 390 nothing scrolls sideways and the switch is 44 px high', async ({ page }) => {
    await page.goto(rj)
    await ready(page)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect((await page.getByRole('button', { name: 'Cronológica' }).boundingBox())!.height).toBeGreaterThanOrEqual(44)
  })
})
