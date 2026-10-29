import { expect, test, type Page } from '@playwright/test'
import { base, collectRequests, violations, waitReady } from './helpers'
import { shareMock } from './share-mock'

/*
 * Guess result share card (#45, the Sketch frame "3b Cartão do palpite"), 390x844, fixture Cidade Exemplo (the right guess is "Sim").
 * With a guess kept in this browser the share sheet draws the guess card; with none it draws the normal card.
 */
const city = `${base}rj/cidade-exemplo/`
const sheet = `${city}compartilhar/`
const picture = (page: Page, card = 'guess') => page.locator(`[data-share-picture][data-card="${card}"]`)
/** The sheet is ready when the picture says which card it is and the PNG of the actions is made (the island's own attribute, never a timer). */
const ready = async (page: Page, card: 'city' | 'guess') => {
  await expect(picture(page, card)).toHaveCount(1)
  await expect(page.locator('[data-share-actions][data-png="ready"]')).toHaveCount(card === 'guess' ? 2 : 1)
}
const texts = (page: Page, card = 'guess') => picture(page, card).locator('svg text').evaluateAll((els) => els.map((e) => e.textContent ?? ''))

test.describe('share sheet: the guess card', () => {
  test('without a guess the sheet keeps the normal card, and nothing of a guess is in it', async ({ page }) => {
    await page.goto(sheet)
    await ready(page, 'city')
    expect((await texts(page, 'city')).join(' ')).not.toMatch(/Palpite|Resposta/)
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
    await expect(page.locator('[data-card-block="guess"] [data-text-body]')).toContainText('O palpite estava certo.')
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

  test('with the palpite answered, the guess card and the city card each share their own picture', async ({ page }) => {
    const share = shareMock(page)
    await share.install('shares')
    await page.addInitScript(() => localStorage.setItem('voto-a-voto:guess', '{"rj/cidade-exemplo":"yes"}'))
    await page.goto(sheet)
    await share.ready()
    await ready(page, 'guess')
    await expect(picture(page, 'city')).toHaveCount(1)
    const block = (kind: string) => page.locator(`[data-card-block="${kind}"]`)
    await block('guess').locator('[data-act="share"]').click()
    await block('city').locator('[data-act="share"]').click()
    const calls = await share.waitForCalls(2)
    expect(calls.map((c) => c.files[0]?.name)).toEqual(['voto-a-voto-rj-cidade-exemplo-palpite.png', expect.stringMatching(/^voto-a-voto-rj-cidade-exemplo-2026-turno-\d\.png$/)])
    // no share state of one card shows on the other: the status line of each is its own
    await expect(block('guess').locator('[data-status]')).toHaveText('')
    await expect(block('city').locator('[data-status]')).toHaveText('')
  })

  test('with the palpite answered, "Baixar imagem" on the city card saves the city picture, not the guess card', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('voto-a-voto:guess', '{"rj/cidade-exemplo":"yes"}'))
    await page.goto(sheet)
    await ready(page, 'guess')
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('[data-card-block="city"] [data-act="download"]').click()])
    expect(download.suggestedFilename()).toMatch(/^voto-a-voto-rj-cidade-exemplo-2026-turno-\d\.png$/)
  })
})
