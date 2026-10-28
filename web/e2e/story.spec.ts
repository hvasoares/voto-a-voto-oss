import { expect, test, type Page } from '@playwright/test'
import { base, collectRequests, violations } from './helpers'

/*
 * State story (#47, the Sketch frame "13d Sequência de Stories do estado"), 390x844, fixture RJ (six cities with the three cycles: seven cards) and SP (one city).
 * Reached by its address only (no entry point yet). Cards: the municipalities, the most surprising fact, the other counts, the recap, the share card.
 */
const rj = `${base}rj/historia/`
/** Ready = the island's own attribute (it has put the row at the card the address names). */
const ready = (page: Page) => page.waitForSelector('[data-story][data-ready="true"]')
/** The text alternatives of the pictures (SVG `<title>`; `innerText` does not read them). */
const titles = (page: Page) => page.locator('[data-card] svg title').evaluateAll((els) => els.map((e) => e.textContent ?? ''))
const on = (page: Page, n: number) => expect(page.locator('[data-story]')).toHaveAttribute('data-current', String(n))
/** The card in the middle of the row is the card on show. */
const centered = (page: Page) =>
  page.evaluate(() => {
    const t = document.querySelector('.story__track')!.getBoundingClientRect()
    const mid = t.left + t.width / 2
    return [...document.querySelectorAll('.story__card')].map((c, i) => [i + 1, Math.abs(c.getBoundingClientRect().left + c.getBoundingClientRect().width / 2 - mid)] as const).sort((a, b) => a[1] - b[1])[0]![0]
  })

test.describe('state story', () => {
  test('without scripts the cards are a stacked list in order, each with its anchor, picture and caption', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 }, locale: 'pt-BR' })
    const page = await context.newPage()
    await page.goto(rj)
    const ids = await page.locator('[data-card]').evaluateAll((els) => els.map((e) => e.id))
    expect(ids).toEqual(['1', '2', '3', '4', '5', '6', '7'])
    await expect(page.locator('[data-card] svg')).toHaveCount(7)
    await expect(page.locator('[data-card="2"] .story__cap')).toHaveText('Cartão 2 de 7 · o fato mais surpreendente')
    await expect(page.locator('[data-card="1"] .story__cap')).toHaveText('Cartão 1 de 7')
    await expect(page.locator('[data-card="3"] .story__link')).toHaveText(/\/rj\/historia#3$/)
    await expect(page.locator('.story__dot')).toHaveCount(0)
    await context.close()
  })

  test('the first card is the municipalities, the second the most surprising fact, the recap is reused, the share card is last', async ({ page }) => {
    await page.goto(rj)
    await ready(page)
    const t = await titles(page)
    expect(t[0]).toMatch(/^6 municípios em Rio de Janeiro/)
    expect(t[1]).toMatch(/^\d+ de \d+ cidades de Rio de Janeiro, com os três ciclos, tiveram mudança do lado com mais votos/)
    expect(t[5]).toMatch(/^Em Rio de Janeiro, no 2º turno, os votos válidos foram/)
    expect(t[6]).toMatch(/^7 cartões sobre o 2º turno de Rio de Janeiro/)
  })

  test('arrow keys, Home and End move the row, the progress follows and the address names the card on show', async ({ page }) => {
    await page.goto(rj)
    await ready(page)
    await on(page, 1)
    await page.locator('.story__track').focus()
    await page.keyboard.press('ArrowRight')
    await on(page, 2)
    await expect(page).toHaveURL(/#2$/)
    await expect(page.locator('[data-caption]')).toHaveText('Cartão 2 de 7 · o fato mais surpreendente')
    await expect(page.locator('.story__dot[aria-current="true"]')).toHaveCount(1)
    await page.keyboard.press('End')
    await on(page, 7)
    await page.keyboard.press('ArrowRight')
    await on(page, 7)
    await page.keyboard.press('Home')
    await on(page, 1)
    await page.keyboard.press('ArrowLeft')
    await on(page, 1)
    await expect.poll(() => centered(page)).toBe(1)
  })

  test('a tap on a dot goes to its card, and a swipe (the row scrolled by hand) makes the card it rests on the one on show', async ({ page }) => {
    await page.goto(rj)
    await ready(page)
    await page.getByRole('button', { name: 'Ir ao cartão 4' }).click()
    await on(page, 4)
    await expect.poll(() => centered(page)).toBe(4)
    await page.evaluate(() => {
      const t = document.querySelector('.story__track') as HTMLElement
      const c = document.querySelector('[data-card="6"]') as HTMLElement
      t.scrollTo({ left: c.offsetLeft - (t.clientWidth - c.offsetWidth) / 2, behavior: 'instant' })
    })
    await on(page, 6)
    await expect(page).toHaveURL(/#6$/)
  })

  test('the address names the card: reloading or forwarding the link opens that card', async ({ page }) => {
    await page.goto(`${rj}#3`)
    await ready(page)
    await on(page, 3)
    await expect.poll(() => centered(page)).toBe(3)
    await page.reload()
    await ready(page)
    await on(page, 3)
    await page.goto(`${rj}#99`)
    await page.reload()
    await ready(page)
    await on(page, 1)
  })

  test('each card is a standalone picture shared through the existing share flow: the picture of the card on show, its file name and its link', async ({ page }) => {
    await page.goto(`${rj}#3`)
    await ready(page)
    await expect(page.locator('[data-share-actions][data-png="ready"]')).toHaveCount(1)
    await expect(page.getByRole('button', { name: 'Compartilhar este cartão' }).or(page.getByRole('button', { name: 'Copiar link' }))).toBeVisible()
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Baixar imagem' }).click()
    expect((await download).suggestedFilename()).toBe('voto-a-voto-rj-historia-3.png')
    await expect(page.locator('.story__note').last()).toContainText('/rj/historia#3')
    await page.keyboard.press('Escape')
    await page.locator('.story__track').focus()
    await page.keyboard.press('ArrowRight')
    await on(page, 4)
    await expect(page.locator('[data-share-actions][data-png="ready"]')).toHaveCount(1)
    await expect(page.locator('.story__note').last()).toContainText('/rj/historia#4')
  })

  test('a key pressed while an older scroll is still settling wins: the card is the one asked for, and it stays', async ({ page }) => {
    await page.goto(`${rj}#3`)
    await ready(page)
    await on(page, 3)
    await page.locator('.story__track').focus()
    // an older scroll event (its settle timer is pending) and, right after it, a key: the newer choice must not be replaced by where the row was
    await page.evaluate(() => document.querySelector('.story__track')!.dispatchEvent(new Event('scroll')))
    await page.keyboard.press('ArrowRight')
    await on(page, 4)
    await page.waitForTimeout(1300)
    await on(page, 4)
    await expect.poll(() => centered(page)).toBe(4)
  })

  test('with reduced motion the row moves at once', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(rj)
    await ready(page)
    await page.locator('.story__track').focus()
    await page.keyboard.press('End')
    await on(page, 7)
    await expect.poll(() => centered(page)).toBe(7)
  })

  test('a state with one city says "1 cidade", and a state with a missing cycle has no story', async ({ page }) => {
    await page.goto(`${base}sp/historia/`)
    await ready(page)
    expect((await titles(page)).join(' ')).toContain('de 1 cidade de São Paulo')
    const gone = await page.goto(`${base}mt/historia/`)
    expect(gone!.status()).toBe(404)
  })

  test('every card says only what the data shows: no winner, no why', async ({ page }) => {
    await page.goto(rj)
    await ready(page)
    const text = (await titles(page)).slice(0, 5).concat(await page.locator('[data-card] svg text').allTextContents()).join(' ')
    expect(text).not.toMatch(/venc|ganh|perd|porque|lider|culpa/i)
  })

  test('nothing is requested for the story: only GETs of the site, no /data/', async ({ page, baseURL }) => {
    const seen = collectRequests(page)
    await page.goto(rj)
    await ready(page)
    await page.locator('.story__track').focus()
    await page.keyboard.press('ArrowRight')
    await page.waitForLoadState('networkidle')
    expect(violations(seen, [new URL(baseURL!).origin])).toEqual([])
    expect(seen.filter((r) => /\/data\//.test(r.url))).toEqual([])
  })

  test('at 390 nothing scrolls sideways (the row scrolls inside itself) and the card on show is in the first screen', async ({ page }) => {
    await page.goto(rj)
    await ready(page)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const box = (await page.locator('[data-card="1"]').boundingBox())!
    expect(box.y).toBeLessThan(300)
  })
})
