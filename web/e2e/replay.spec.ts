import { expect, test, type Page } from '@playwright/test'
import { base, collectRequests, violations } from './helpers'

/*
 * City replay (#46, the Sketch frame "9b Replay da cidade"), 390x844, fixture Cidade Exemplo (round 2, the default: A 47%/B 53% in 2018, 58/42 in 2022, 50/50 in 2026; round 1: 55/45, 49/51, 52/48).
 * The replay is drawn in the browser from the numbers the page's static blocks hold; those blocks are the static card.
 */
const page9 = `${base}rj/cidade-exemplo/tres-ciclos/`
/** Ready = the replay's own attribute; finished = its own state, never a timer. */
const ready = (page: Page) => expect(page.locator('html')).toHaveAttribute('data-replay', 'ready')
const state = (page: Page, s: string) => expect(page.locator('.replay')).toHaveAttribute('data-replay-state', s, { timeout: 15_000 })

test.describe('city replay', () => {
  test('plays 2018, 2022, 2026 by itself, stops at the last, and "Ver de novo" plays it again', async ({ page }) => {
    await page.goto(page9)
    await ready(page)
    await expect(page.locator('.replay__tag')).toHaveText('REPLAY · 2018 → 2022 → 2026')
    await state(page, 'done')
    await expect(page.locator('.replay')).toHaveAttribute('data-replay-year', '2026')
    await expect(page.locator('.replay__seg--a')).toHaveText('A 50%')
    await expect(page.locator('.replay__btn')).toHaveText('Ver de novo')
    await page.locator('.replay__btn').click()
    await expect(page.locator('.replay')).toHaveAttribute('data-replay-year', '2018')
    await state(page, 'done')
  })

  test('has a text alternative with the results of the three cycles', async ({ page }) => {
    await page.goto(page9)
    await ready(page)
    await expect(page.locator('.replay')).toHaveAttribute('aria-label', 'Replay do 2º turno em Cidade Exemplo: 2018, Candidato A 47% e Candidato B 53% dos votos válidos; 2022, Candidato A 58% e Candidato B 42% dos votos válidos; 2026, Candidato A 50% e Candidato B 50% dos votos válidos.')
  })

  test('pausing stops it where it is, and a cycle can be picked by tap or keyboard and stays', async ({ page }) => {
    await page.goto(page9)
    await ready(page)
    await page.getByRole('button', { name: 'Pausar' }).click()
    await state(page, 'paused')
    await page.getByRole('button', { name: '2022', exact: true }).focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('.replay')).toHaveAttribute('data-replay-year', '2022')
    await expect(page.locator('.replay__seg--a')).toHaveText('A 58%')
    await expect(page.getByRole('button', { name: '2022', exact: true })).toHaveAttribute('aria-current', 'true')
    // a later step must not override a pick: still 2022 after a step has passed
    await page.waitForTimeout(2200)
    await expect(page.locator('.replay')).toHaveAttribute('data-replay-year', '2022')
  })

  test('the static card stays: the three blocks are in the page with and without the replay', async ({ page }) => {
    await page.goto(page9)
    await ready(page)
    await expect(page.locator('.cycles__round:not([hidden]) .cycle')).toHaveCount(3)
  })

  test('with reduced motion there is no replay and the static card is shown', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(page9)
    await page.waitForFunction(() => document.documentElement.dataset.ready === 'city-cycles')
    await expect(page.locator('.replay')).toHaveCount(0)
    await expect(page.locator('.cycles__round:not([hidden]) .cycle')).toHaveCount(3)
  })

  test('without scripts there is no replay and the static card is shown', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } })
    const page = await context.newPage()
    await page.goto(page9)
    await expect(page.locator('.replay')).toHaveCount(0)
    await expect(page.locator('.cycle')).toHaveCount(6)
    await context.close()
  })

  test('a city missing cycles shows the one that exists, says which are missing, and offers no play', async ({ page }) => {
    await page.goto(`${base}mt/boa-esperanca-do-norte/tres-ciclos/?turno=1`)
    await ready(page)
    await expect(page.locator('.replay__missing')).toHaveText('Sem dados de 2018 e 2022: o replay mostra só o que existe.')
    await expect(page.locator('.replay')).toHaveAttribute('data-replay-year', '2026')
    await expect(page.locator('.replay__btn')).toHaveCount(0)
    await expect(page.getByRole('button', { name: '2018', exact: true })).toBeDisabled()
    await expect(page.getByRole('button', { name: '2022', exact: true })).toBeDisabled()
    await expect(page.locator('.replay')).toHaveAttribute('aria-label', /^Replay do 1º turno em Boa Esperança do Norte: 2026, /)
  })

  test('switching the round draws one replay again, from that round', async ({ page }) => {
    await page.goto(page9)
    await ready(page)
    await page.getByRole('link', { name: /Ver o 1º turno/ }).click()
    await expect(page.locator('.replay')).toHaveCount(1)
    await expect(page.locator('.replay')).toHaveAttribute('aria-label', /^Replay do 1º turno em Cidade Exemplo/)
    await expect(page.locator('.replay__seg')).toHaveCount(2)
    await page.getByRole('button', { name: '2018', exact: true }).click()
    await expect(page.locator('.replay__seg--a')).toHaveText('A 55%')
  })

  test('draws everything from the page: no request, and nothing but the site\'s own files', async ({ page, baseURL }) => {
    const seen = collectRequests(page)
    await page.goto(page9)
    await ready(page)
    await state(page, 'done')
    await page.waitForLoadState('networkidle')
    expect(violations(seen, [new URL(baseURL!).origin])).toEqual([])
    expect(seen.filter((r) => /\/data\//.test(r.url))).toEqual([])
  })

  test('at 390 the replay is in the first screen and nothing scrolls sideways', async ({ page }) => {
    await page.goto(page9)
    await ready(page)
    const box = (await page.locator('.replay').boundingBox())!
    expect(box.y + box.height).toBeLessThanOrEqual(844)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
})
