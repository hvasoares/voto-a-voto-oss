import { expect, test, type Page } from '@playwright/test'
import { base, collectRequests, violations, waitReady } from './helpers'

/*
 * Guess result share card (#45, the Sketch frame "3b Cartão do palpite"), 390x844, fixture Cidade Exemplo (the right guess is "Sim").
 * With a guess kept in this browser the share sheet draws the guess card; with none it draws the normal card.
 */
const city = `${base}rj/cidade-exemplo/`
const sheet = `${city}compartilhar/`
const picture = (page: Page) => page.locator('[data-share-picture]')
/** The sheet is ready when the picture says which card it is and the PNG of the actions is made (the island's own attribute, never a timer). */
const ready = async (page: Page, card: 'city' | 'guess') => {
  await expect(picture(page)).toHaveAttribute('data-card', card)
  await expect(page.locator('[data-share-actions][data-png="ready"]')).toHaveCount(1)
}
const texts = (page: Page) => picture(page).locator('svg text').evaluateAll((els) => els.map((e) => e.textContent ?? ''))

test.describe('share sheet: the guess card', () => {
  test('without a guess the sheet keeps the normal card, and nothing of a guess is in it', async ({ page }) => {
    await page.goto(sheet)
    await ready(page, 'city')
    expect((await texts(page)).join(' ')).not.toMatch(/Palpite|Resposta/)
    await expect(page.locator('[data-share-sheet]')).toHaveAttribute('data-filename', /turno-\d\.png$/)
  })

  test('a right guess made on the city page says it matched, with the question, the answer, the address and the text alternative', async ({ page }) => {
    await page.goto(`${city}?turno=1`)
    await waitReady(page)
    await expect(page.locator('[data-question][data-guess-ready="true"]')).toHaveCount(1)
    await page.getByRole('button', { name: 'Sim', exact: true }).click()
    await page.locator('[data-share]').click()
    await ready(page, 'guess')
    const t = (await texts(page)).join(' ')
    expect(t).toContain('Palpite certo: Sim')
    expect(t).toContain('Cidade Exemplo mudou de lado em 2022?')
    expect(t).toContain('Resposta: Sim · Mudou de lado em 2022')
    // the address may break over two lines under a long base path: compare it without the spaces
    expect(t.replace(/ /g, '')).toContain(`${base}rj/cidade-exemplo`)
    await expect(picture(page).locator('svg title')).toHaveText('Cidade Exemplo mudou de lado em 2022? Palpite: Sim. Resposta: Sim. O palpite estava certo. Mudou de lado em 2022.')
    await expect(page.locator('[data-text-body]')).toContainText('O palpite estava certo.')
    await expect(page.locator('[data-share-sheet]')).toHaveAttribute('data-filename', 'voto-a-voto-rj-cidade-exemplo-palpite.png')
  })

  test('a wrong guess says it did not match, and taking the guess back returns the normal card', async ({ page }) => {
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('seeded')) {
        sessionStorage.setItem('seeded', '1')
        localStorage.setItem('voto-a-voto:guess', '{"rj/cidade-exemplo":"no"}')
      }
    })
    await page.goto(sheet)
    await ready(page, 'guess')
    expect((await texts(page)).join(' ')).toContain('Palpite errado: Não')
    await page.evaluate(() => localStorage.removeItem('voto-a-voto:guess'))
    await page.reload()
    await ready(page, 'city')
  })

  test('another city\'s guess is not shown on this city', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('voto-a-voto:guess', '{"sp/cidade-exemplo-paulista":"yes"}'))
    await page.goto(sheet)
    await ready(page, 'city')
  })

  test('the sheet does not wait for the browser to be idle: with an idle callback that never fires the card is still drawn from the kept guess', async ({ page }) => {
    // A busy runner delays idle time without bound; the sheet is the reason the visitor came, so it hydrates on load (this was a 5 s "pending" on slow runners).
    await page.addInitScript(() => {
      window.requestIdleCallback = () => 0
      localStorage.setItem('voto-a-voto:guess', '{"rj/cidade-exemplo":"yes"}')
    })
    await page.goto(sheet)
    await ready(page, 'guess')
  })

  test('the card needs no request of its own: only GETs of the site, none carrying the guess', async ({ page, baseURL }) => {
    const seen = collectRequests(page)
    await page.addInitScript(() => localStorage.setItem('voto-a-voto:guess', '{"rj/cidade-exemplo":"yes"}'))
    await page.goto(sheet)
    await ready(page, 'guess')
    await page.waitForLoadState('networkidle')
    expect(violations(seen, [new URL(baseURL!).origin])).toEqual([])
    // no request carries the guess: every one is a GET (violations() above), and none has a query or a fragment at all
    expect(seen.filter((r) => new URL(r.url).search !== '' || new URL(r.url).hash !== '')).toEqual([])
    expect(seen.filter((r) => /\/data\//.test(r.url))).toEqual([])
  })
})
