import { expect, test } from '@playwright/test'
import { base, collectRequests } from './helpers'

/*
 * "Fale sem errar" (#67) at 390x844 and 1440x900 over the fixture dataset: the ready phrases for the city in the address (plain register toggle, copy), the "Não diga"
 * list, the wording rules, the citation line with the current edition, and no ad and no analytics call.
 */
const guide = `${base}fale-sem-errar/?mora=rj/cidade-exemplo`

test.describe('Fale sem errar', () => {
  test('shows the three phrases of the city in the address, from the card\'s own words', async ({ page }) => {
    await page.goto(guide)
    await expect(page.locator('h1')).toHaveText('Fale sem errar')
    await expect(page.locator('[data-phrase="turnout"] [data-phrase-text]')).toContainText('Em Cidade Exemplo, no 2º turno de 2026,')
    await expect(page.locator('[data-phrase="result"] [data-phrase-text]')).toContainText('dos votos válidos')
    await expect(page.locator('[data-phrase="sequence"] [data-phrase-text]')).toContainText('não a causa')
  })

  test('the plain-language switch changes the words, and a copy button copies the phrase', async ({ browser }) => {
    const ctx = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] })
    const page = await ctx.newPage()
    await page.goto(guide)
    const result = page.locator('[data-phrase="result"] [data-phrase-text]')
    await expect(result).toBeVisible()
    const standard = await result.innerText()
    await page.locator('[data-register-toggle]').click()
    await expect(page.locator('[data-register-toggle]')).toHaveAttribute('aria-checked', 'true')
    await expect(result).not.toHaveText(standard)
    await page.locator('[data-copy="result"]').click()
    await expect(page.locator('[data-status]')).toHaveText('Copiado.')
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(await result.innerText())
    await ctx.close()
  })

  test('without a city it asks for one; the Não diga list, the rules and the citation with the edition are there', async ({ page }) => {
    await page.goto(`${base}fale-sem-errar/`)
    await expect(page.locator('[data-placeholder]')).toHaveText('Escolha uma cidade para ver as frases prontas.')
    await expect(page.locator('[data-never] li')).toHaveCount(4)
    await expect(page.locator('[data-never]')).toContainText('Que a abstenção foi protesto.')
    const rules = await page.locator('[data-rules]').innerText()
    expect(rules).toContain('nunca mostram por que as pessoas votaram')
    expect(rules).toContain('como uma pessoa ou um grupo votou')
    expect(rules).toContain('abstenção foi protesto')
    expect(rules).toContain('Um ciclo sem dados não é zero')
    await expect(page.locator('[data-citation]')).toHaveText(/^Fonte: TSE, dados finais, edição \d{2}\/\d{2}\/\d{4}$/)
  })

  test('the citation names the city address once a city is chosen', async ({ page }) => {
    await page.goto(guide)
    await expect(page.locator('[data-citation]')).toContainText('votoavoto.exemplo.br')
    await expect(page.locator('[data-citation]')).toContainText('/rj/cidade-exemplo')
  })

  test('has no ads and makes no analytics call: no request beyond the site, no tag, no notice banner', async ({ page }) => {
    const seen = collectRequests(page)
    await page.goto(guide)
    await expect(page.locator('[data-phrase="turnout"]')).toBeVisible()
    const origin = new URL(page.url()).origin
    expect(seen.filter((r) => !r.url.startsWith(origin)).map((r) => r.url)).toEqual([])
    expect(seen.filter((r) => /gtag|googletagmanager|google-analytics|collect/.test(r.url))).toEqual([])
    expect(await page.evaluate(() => 'dataLayer' in window)).toBe(false)
    expect(await page.locator('[data-component="consent-banner"], ins.adsbygoogle, iframe').count()).toBe(0)
    await expect(page.locator('[data-noads]')).toContainText('não tem anúncios nem rastreamento')
  })

  test('links to the overlay and to the game now that both exist, and they open', async ({ page }) => {
    await page.goto(guide)
    await expect(page.locator('[data-link-overlay]')).toHaveAttribute('href', `${base}overlay/`)
    await expect(page.locator('[data-link-game]')).toHaveAttribute('href', `${base}adivinhe/`)
    await page.locator('[data-link-overlay]').click()
    await expect(page.locator('h1')).toHaveText('Overlay para live')
    await page.goto(guide)
    await page.locator('[data-link-game]').click()
    await expect(page.locator('h1')).toHaveText('Adivinhe a cidade')
  })

  test('fits the screen: no sideways scroll', async ({ page }) => {
    await page.goto(guide)
    await expect(page.locator('[data-phrase="turnout"]')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })
})
