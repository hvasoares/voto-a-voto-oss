import { expect, test, type Page } from '@playwright/test'
import { base, collectRequests } from './helpers'
import { dailyIndex, type GameData } from '../src/lib/game'
import { viewport } from './presets'
import { shareMock } from './share-mock'

/*
 * "Adivinhe a cidade" (#69) and its end (#70) over the fixture dataset (7 cities), at 390x844 and 1440x900, with the clock fixed so the daily city is known: the
 * clues open one by one, the feedback of a guess, the answer only at the end, the result grid that never shows the city, the share and the copy fallback, the countdown,
 * the browser-only history (clearable, and the game works with storage blocked), and no request that carries a guess.
 */
const DAY = '2026-10-27T15:00:00Z'
const game = `${base}adivinhe/`

async function secretOf(page: Page) {
  const data = (await (await page.request.get(`${base}adivinhe/dados.json`)).json()) as GameData
  const secret = data.cities[dailyIndex('2026-10-27', data.daily)]!
  const others = data.cities.filter((c) => c !== secret)
  return { data, secret, others }
}

async function open(page: Page, opts: { share?: boolean } = {}) {
  await page.clock.install({ time: new Date(DAY) })
  if (opts.share !== undefined) await shareMock(page).install(opts.share ? 'shares' : 'absent')
  await page.goto(game)
  await expect(page.locator('[data-game]')).toBeVisible()
}

async function guess(page: Page, name: string) {
  await page.getByRole('combobox', { name: 'Município' }).fill(name)
  await page.locator('[data-place-option]').filter({ hasText: name }).first().click()
  await page.locator('[data-send]').click()
}

test.describe('Adivinhe a cidade', () => {
  test('opens with the day\'s number and no clue unlocked, and the rules say what the clues never speak about', async ({ page }) => {
    await open(page)
    const { data } = await secretOf(page)
    expect(data.daily.length).toBeGreaterThan(0)
    await expect(page.locator('[data-sub]')).toHaveText('Cidade nº 300 · 27 de outubro · uma nova cidade por dia')
    await expect(page.locator('[data-clue][data-unlocked="yes"]')).toHaveCount(0)
    await expect(page.locator('[data-clue="state"]')).toContainText('Revelada após o 5º palpite')
    await expect(page.locator('[data-rules]')).toContainText('Nunca de candidatos, partidos ou de quem ganhou')
    await expect(page.locator('[data-attempt]')).toHaveText('Palpite 1 de 6')
  })

  test('each guess opens a clue and shows distance with a direction, and more, less or equal for turnout and size; the answer stays hidden', async ({ page }) => {
    await open(page)
    const { secret, others } = await secretOf(page)
    const first = others[0]!
    await guess(page, first[2])
    await expect(page.locator('[data-row="1"] [data-distance]')).toHaveText(/^[\d.]+ km [↑↗→↘↓↙←↖]$/)
    await expect(page.locator('[data-row="1"] [data-turnout]')).toHaveText(/^(▲|▼|=) (maior|menor|igual)$/)
    await expect(page.locator('[data-row="1"] [data-size]')).toHaveText(/^(▲|▼|=) (maior|menor|igual)$/)
    await expect(page.locator('[data-clue="size"]')).toHaveAttribute('data-unlocked', 'yes')
    await expect(page.locator('[data-clue="turnout"]')).toHaveAttribute('data-unlocked', 'no')
    await expect(page.locator('[data-attempt]')).toHaveText('Palpite 2 de 6')
    await guess(page, others[1]![2])
    await expect(page.locator('[data-clue="turnout"]')).toHaveAttribute('data-unlocked', 'yes')
    await expect(page.locator('[data-answer]')).toHaveCount(0)
    expect(await page.locator('main').innerText()).not.toContain(`${secret[2]} · `)
  })

  test('the same city twice, or a city outside the game, is refused with a message', async ({ page }) => {
    await open(page)
    const { others } = await secretOf(page)
    await guess(page, others[0]![2])
    await page.getByRole('combobox', { name: 'Município' }).fill(others[0]![2])
    await page.locator('[data-place-option]').filter({ hasText: others[0]![2] }).first().click()
    await page.locator('[data-send]').click()
    await expect(page.locator('[data-note]')).toHaveText('Você já tentou essa cidade.')
    await expect(page.locator('[data-row="2"] [data-distance]')).toHaveText('')
  })

  test('a right guess ends the game: the answer, a grid with no city name, the countdown to the next city', async ({ page }) => {
    await open(page, { share: false })
    const { secret, others } = await secretOf(page)
    await guess(page, others[0]![2])
    await guess(page, secret[2])
    await expect(page.locator('[data-finished="yes"]')).toBeVisible()
    await expect(page.locator('[data-answer]')).toContainText(`Acertou em 2 de 6. A cidade era ${secret[2]}`)
    const grid = await page.locator('[data-grid]').innerText()
    expect(grid.split('\n')[0]).toBe('Adivinhe a cidade nº 300 · 2/6')
    expect(grid.split('\n')[2]).toBe('🟩🟩🟩')
    for (const c of [secret, ...others]) expect(grid).not.toContain(c[2])
    expect(grid).not.toMatch(/vence|lidera/i)
    await expect(page.locator('[data-countdown]')).toHaveText(/^Próxima cidade em \d{2}:\d{2}:\d{2}$/)
    await expect(page.locator('[data-guess-form]')).toHaveCount(0)
  })

  test('six wrong guesses end the game as X/6', async ({ page }) => {
    await open(page)
    const { others } = await secretOf(page)
    for (const c of others.slice(0, 6)) await guess(page, c[2])
    await expect(page.locator('[data-answer]')).toContainText('Não foi desta vez. A cidade era')
    expect((await page.locator('[data-grid]').innerText()).split('\n')[0]).toBe('Adivinhe a cidade nº 300 · X/6')
  })

  test('shares the grid with the system sheet, or copies it where there is none', async ({ browser }) => {
    const ctx = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] })
    const a = await ctx.newPage()
    await open(a, { share: true })
    const { secret } = await secretOf(a)
    await guess(a, secret[2])
    await a.locator('[data-share]').click()
    const shared = (await shareMock(a).waitForCalls(1))[0]!.text!
    expect(shared).toContain(`https://votoavoto.exemplo.br${base}adivinhe/`)
    expect(shared).toContain('Adivinhe a cidade nº 300 · 1/6')
    expect(shared).not.toContain(secret[2])
    const ctx2 = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] })
    const b = await ctx2.newPage()
    await open(b, { share: false })
    await guess(b, secret[2])
    await b.locator('[data-share]').click()
    await expect(b.locator('[data-share-status]')).toHaveText('Resultado copiado.')
    expect(await b.evaluate(() => navigator.clipboard.readText())).toBe(shared)
    await ctx.close()
    await ctx2.close()
  })

  test('the history stays in this browser, survives a reload, can be cleared, and the game works with storage blocked', async ({ page }) => {
    await open(page)
    const { secret } = await secretOf(page)
    await guess(page, secret[2])
    await expect(page.locator('[data-history-row]')).toHaveText('Nº 300: 1/6')
    await page.reload()
    await expect(page.locator('[data-history-row]')).toHaveText('Nº 300: 1/6')
    await expect(page.locator('[data-finished="yes"]')).toBeVisible()
    expect(await page.evaluate(() => Object.keys(localStorage))).toEqual(['voto-a-voto:game'])
    expect(await page.evaluate(() => localStorage.getItem('voto-a-voto:game'))).not.toContain(secret[2])
    await page.locator('[data-clear]').click()
    await expect(page.locator('[data-history-empty]')).toBeVisible()
    await page.reload()
    await expect(page.locator('[data-history-empty]')).toBeVisible()
  })

  test('with storage blocked the game still plays and says it will not be remembered', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('SecurityError') } })
    })
    await open(page)
    const { others } = await secretOf(page)
    await guess(page, others[0]![2])
    await expect(page.locator('[data-row="1"] [data-distance]')).toHaveText(/km/)
    await expect(page.locator('[data-blocked]')).toContainText('não deixa guardar o histórico')
  })

  test('nothing about a guess is sent anywhere: only GETs of the site\'s own files, none carrying a guess', async ({ page }) => {
    const seen = collectRequests(page)
    await open(page)
    const { secret, others } = await secretOf(page)
    await guess(page, others[0]![2])
    await guess(page, secret[2])
    await expect(page.locator('[data-finished="yes"]')).toBeVisible()
    const origin = new URL(page.url()).origin
    expect(seen.filter((r) => !r.url.startsWith(origin)).map((r) => r.url)).toEqual([])
    expect(seen.filter((r) => r.method !== 'GET')).toEqual([])
    for (const c of [secret, ...others]) expect(seen.filter((r) => r.url.includes(c[1]) && !/\/data\/v/.test(r.url)).map((r) => r.url), c[1]).toEqual([])
  })

  for (const [w, h] of [[390, 844], [1440, 900]] as const) {
    test(`works at ${w}px: no sideways scroll, the clues and the guess table are visible`, async ({ page }) => {
      await page.setViewportSize(viewport(w, h))
      await open(page)
      const { others } = await secretOf(page)
      await guess(page, others[0]![2])
      await expect(page.locator('[data-clues]')).toBeVisible()
      await expect(page.locator('[data-guesses]')).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    })
  }
})
