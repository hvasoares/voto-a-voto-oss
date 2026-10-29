import { expect, test, type Page } from '@playwright/test'
import { base, collectRequests, violations } from './helpers'
import { PHONE, noJs } from './presets'
import { shareMock } from './share-mock'

/*
 * Meu Brasil as a story (#97, the Sketch frame "16b Meu Brasil em sequência"), 390x844, fixture places: Cidade Exemplo (RJ, changed side in 2022, has a twin and curiosities), Cidade Exemplo C (RJ, never
 * changed), Cidade Exemplo Paulista (SP), Boa Esperança do Norte (MT, only 2026). The places and the card on show live in the address; the only way in is the button of the Meu Brasil card.
 */
const story = (q: string) => `${base}meu-brasil/historia/${q}`
const ONE = '?mora=rj/cidade-exemplo'
const TWO = '?mora=rj/cidade-exemplo&vota=sp/cidade-exemplo-paulista'
const THREE = '?mora=rj/cidade-exemplo&vota=sp/cidade-exemplo-paulista&nasceu=rj/cidade-exemplo-c'
/** Ready = the sequence's own attribute (the places, the twin and the curiosity are in and the row is at the card the address names). */
const ready = (page: Page) => page.waitForSelector('[data-story][data-ready="yes"]')
const count = async (page: Page) => Number(await page.locator('[data-story]').getAttribute('data-count'))
const on = (page: Page, n: number) => expect(page.locator('[data-story]')).toHaveAttribute('data-current', String(n))
const titles = (page: Page) => page.locator('[data-card] svg title').evaluateAll((els) => els.map((e) => e.textContent ?? ''))
const centered = (page: Page) =>
  page.evaluate(() => {
    const t = document.querySelector('.story__track')!.getBoundingClientRect()
    const mid = t.left + t.width / 2
    return [...document.querySelectorAll('.story__card')].map((c, i) => [i + 1, Math.abs(c.getBoundingClientRect().left + c.getBoundingClientRect().width / 2 - mid)] as const).sort((a, b) => a[1] - b[1])[0]![0]
  })

test.describe('Meu Brasil story', () => {
  test('the way in is the button "Ver como história" of the Meu Brasil card, and it carries the places', async ({ page }) => {
    await page.goto(`${base}meu-brasil/${TWO}`)
    const button = page.locator('[data-story-link]')
    await expect(button).toHaveText('Ver como história')
    await expect(button).toHaveAttribute('href', `${base}meu-brasil/historia/${TWO}`)
    await button.click()
    await ready(page)
    expect(await count(page)).toBeGreaterThanOrEqual(6)
    // and nothing else points at the story: not the home, not the top bar
    for (const path of ['', 'meu-brasil/']) {
      await page.goto(`${base}${path}`)
      await expect(page.locator('a[href*="meu-brasil/historia"]')).toHaveCount(0)
    }
  })

  test('one place: six to eight cards, the places first, the most surprising fact second, the share card last, one number each', async ({ page }) => {
    await page.goto(story(ONE))
    await ready(page)
    const n = await count(page)
    expect(n).toBeGreaterThanOrEqual(6)
    expect(n).toBeLessThanOrEqual(8)
    const t = await titles(page)
    expect(t[0]).toBe('1 Cidade Exemplo · RJ.')
    expect(t[1]).toMatch(/^2022 foi o ano em que o lado com mais votos no 2º turno mudou em Cidade Exemplo · RJ\./)
    await expect(page.locator('[data-card="2"] .story__cap')).toHaveText(`Cartão 2 de ${n} · o fato mais surpreendente`)
    expect(t.at(-1)).toMatch(new RegExp(`^${n} cartões sobre Cidade Exemplo\\.`))
    expect(t.some((x) => /^\d+% do eleitorado de Boa Esperança do Norte · MT, a cidade parecida de Cidade Exemplo · RJ, votou/.test(x))).toBe(true)
    expect(t.some((x) => /^\d+ª /.test(x))).toBe(true)
  })

  test('two and three places stay between six and eight cards, every place is told, and the order of the places breaks ties', async ({ page }) => {
    for (const q of [TWO, THREE]) {
      await page.goto(story(q))
      await ready(page)
      const n = await count(page)
      expect(n).toBeGreaterThanOrEqual(6)
      expect(n).toBeLessThanOrEqual(8)
      const t = (await titles(page)).join(' | ')
      expect(t).toContain('Cidade Exemplo · RJ')
      expect(t).toContain('Cidade Exemplo Paulista · SP')
    }
    await page.goto(story(TWO))
    await ready(page)
    // both places changed side in 2022: the tie goes to the first place
    expect((await titles(page))[1]).toMatch(/mudou em Cidade Exemplo · RJ\./)
  })

  test('a place with no change between cycles has no "most surprising" card but still six to eight', async ({ page }) => {
    await page.goto(story('?mora=rj/cidade-exemplo-c'))
    await ready(page)
    const n = await count(page)
    expect(n).toBeGreaterThanOrEqual(6)
    expect(n).toBeLessThanOrEqual(8)
    await expect(page.locator('.story__cap', { hasText: 'o fato mais surpreendente' })).toHaveCount(0)
    expect((await titles(page)).join(' ')).toContain('ciclos seguidos (2018, 2022 e 2026) com o mesmo lado com mais votos')
  })

  test('a place missing cycles skips the cards of the cycles it lacks, and the sequence says only what it has', async ({ page }) => {
    await page.goto(story('?mora=mt/boa-esperanca-do-norte'))
    await ready(page)
    const t = (await titles(page)).join(' ')
    expect(t).not.toContain('2018')
    expect(t).not.toContain('2022')
    expect(t).toContain('no 2º turno de 2026')
  })

  test('the places and the card on show are in the address: reload and forwarding reproduce the same card', async ({ page }) => {
    await page.goto(`${story(TWO)}#3`)
    await ready(page)
    await on(page, 3)
    await expect.poll(() => centered(page)).toBe(3)
    await page.locator('.story__track').focus()
    await page.keyboard.press('ArrowRight')
    await on(page, 4)
    await expect(page).toHaveURL(new RegExp(`${TWO.replace(/[?&=/]/g, (c) => `\\${c}`)}#4$`))
    await page.reload()
    await ready(page)
    await on(page, 4)
    expect(await page.evaluate(() => localStorage.length)).toBe(0)
  })

  test('keys, dots and swipe move the row, and Escape goes back to the Meu Brasil card', async ({ page }) => {
    await page.goto(story(ONE))
    await ready(page)
    const n = await count(page)
    await page.locator('.story__track').focus()
    await page.keyboard.press('End')
    await on(page, n)
    await page.keyboard.press('Home')
    await on(page, 1)
    await page.getByRole('button', { name: 'Ir ao cartão 3' }).click()
    await on(page, 3)
    await page.evaluate(() => {
      const t = document.querySelector('.story__track') as HTMLElement
      const c = document.querySelector('[data-card="5"]') as HTMLElement
      t.scrollTo({ left: c.offsetLeft - (t.clientWidth - c.offsetWidth) / 2, behavior: 'instant' })
    })
    await on(page, 5)
    // Escape closes the story and goes back to the Meu Brasil card of the same places
    await page.locator('.story__track').focus()
    await page.keyboard.press('Escape')
    await expect(page).toHaveURL(new RegExp(`${base}meu-brasil/\\${ONE}$`))
  })

  test('with reduced motion the row moves at once', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(story(ONE))
    await ready(page)
    await page.locator('.story__track').focus()
    await page.keyboard.press('End')
    await expect.poll(() => centered(page)).toBe(await count(page))
  })

  test('each card shares as its own picture through the existing share flow, with the link to its position and the places', async ({ page }) => {
    await shareMock(page).install('shares')
    await page.goto(`${story(TWO)}#3`)
    await ready(page)
    await expect(page.locator('[data-share-actions][data-png="ready"]')).toHaveCount(1)
    await page.getByRole('button', { name: 'Compartilhar este cartão' }).click()
    const [shared] = await shareMock(page).waitForCalls(1)
    expect(shared!.files.map((f) => f.name)).toEqual(['voto-a-voto-meu-brasil-historia-3.png'])
    expect(shared!.text).toContain('/meu-brasil/historia/?mora=rj/cidade-exemplo&vota=sp/cidade-exemplo-paulista#3')
  })

  test('the story has the one "De onde vem este número?", and the page it names exists and has that record', async ({ page, request }) => {
    await page.goto(story(ONE))
    await ready(page)
    await expect(page.locator('.story__card a.calc')).toHaveCount(0)
    const links = await page.locator('a.calc').evaluateAll((els) => els.map((e) => e.getAttribute('href')!))
    expect(links).toHaveLength(1)
    const [path, id] = links[0]!.split('#')
    const res = await request.get(path!)
    expect(res.status(), links[0]).toBe(200)
    expect(await res.text(), links[0]).toContain(`id="${id}"`)
  })

  test('the picture of a card says one idea about places and nothing about the visitor, a winner or a why', async ({ page }) => {
    await page.goto(story(THREE))
    await ready(page)
    const text = (await titles(page)).join(' | ') + (await page.locator('[data-card] svg text').allTextContents()).join(' ')
    expect(text).not.toMatch(/você|mora|moro|nasc|votou em|venc|ganh|perd|porque|lider|culpa/i)
  })

  test('sends only GETs of the site (the places\' shards, peers and curiosities), no CDN, and the Meu Brasil page does not load them', async ({ page, baseURL }) => {
    const seen = collectRequests(page)
    await page.goto(story(TWO))
    await ready(page)
    await page.waitForLoadState('networkidle')
    expect(violations(seen, [new URL(baseURL!).origin])).toEqual([])
    expect(seen.some((r) => /peers\.json|curiosities\.json/.test(r.url))).toBe(true)
    const meu = collectRequests(page)
    await page.goto(`${base}meu-brasil/${TWO}`)
    await page.waitForLoadState('networkidle')
    expect(meu.filter((r) => /peers\.json|curiosities\.json|historia/.test(r.url))).toEqual([])
  })

  test('without places, or with a place that does not exist, it says so; without scripts there is a notice', async ({ page, browser }) => {
    await page.goto(story(''))
    await expect(page.locator('[data-placeholder]')).toContainText('Escolha ao menos um lugar')
    await page.goto(story('?mora=rj/nao-existe'))
    await expect(page.locator('[data-placeholder][data-ready="failed"]')).toContainText('Não foi possível carregar a sequência')
    const context = await browser.newContext({ ...noJs(), viewport: PHONE })
    const p = await context.newPage()
    await p.goto(story(ONE))
    await expect(p.locator('[data-nojs]')).toContainText('precisa de JavaScript')
    await context.close()
  })

  test('at 390 nothing scrolls sideways and the card on show is in the first screen', async ({ page }) => {
    await page.goto(story(THREE))
    await ready(page)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const box = (await page.locator('[data-card="1"]').boundingBox())!
    expect(box.y).toBeLessThan(300)
  })
})
