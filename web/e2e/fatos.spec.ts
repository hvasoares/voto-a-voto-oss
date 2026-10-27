import { expect, test } from '@playwright/test'
import { base, collectRequests, waitReady } from './helpers'

/*
 * Fact records (#61): a "ver cálculo" link next to every figure of the city card, and the page of the calculation it opens: inputs,
 * formula, source and edition, readable without scripts. Phone first load is asserted in unit/measure terms elsewhere (docs/perf-budgets.md);
 * here: the links, the pages, the ids and the absence of new requests.
 */
const city = `${base}rj/cidade-exemplo/`
const fato = (page: string) => `${base}fato/rj/cidade-exemplo/${page}/`

test.describe('city card: ver cálculo', () => {
  test('every figure of the visible view has its link, and each link lands on the record of that figure', async ({ page }) => {
    await page.goto(`${city}?ciclo=2026&turno=1`)
    await waitReady(page)
    const panel = page.locator('.city-card .city-panel:visible')
    await expect(panel.locator('a.calc')).toHaveCount(7)
    await expect(panel.locator('.legend__row')).toHaveCount(5)
    for (const row of await panel.locator('.legend__row').all()) await expect(row.locator('a.calc')).toHaveCount(1)
    await expect(panel.locator('.turnout__title a.calc')).toHaveCount(2)
    await expect(page.locator('.city-words .city-panel:visible a.calc')).toHaveCount(1)
    const hrefs = await panel.locator('a.calc').evaluateAll((els) => els.map((e) => e.getAttribute('href')))
    expect(hrefs).toEqual(['votaram', 'naoVotaram', 'a', 'b', 'abstencao', 'brancos', 'nulos'].map((a) => `${fato('2026-1')}#${a}`))
  })

  test('the sentence and the margin line have theirs; a city with no curiosities has none for them', async ({ page }) => {
    await page.goto(`${city}?ciclo=2026&turno=1`)
    const hrefs = await page.locator('.city-words .city-panel:visible a.calc').evaluateAll((els) => els.map((e) => e.getAttribute('href')))
    expect(hrefs).toEqual([`${fato('2026-1')}#frase`])
    expect(await page.locator('.city-margin-lines .city-panel:visible a.calc').getAttribute('href')).toBe(`${fato('2026-1')}#margem`)
    await page.goto(`${base}rj/cidade-exemplo-a/?ciclo=2026&turno=1`)
    await expect(page.locator('.curio a.calc')).toHaveCount(0)
  })

  test('the curiosities have a "ver cálculo" each, into the comparisons page of the city', async ({ page }) => {
    await page.goto(`${base}rj/cidade-exemplo/?ciclo=2026&turno=1`)
    const hrefs = await page.locator('.curio a.calc').evaluateAll((els) => els.map((e) => e.getAttribute('href')))
    expect(hrefs.length).toBeGreaterThan(0)
    for (const h of hrefs) expect(h).toContain(`${fato('comparacoes')}#`)
    await page.locator('.curio a.calc').first().click()
    await expect(page.locator('.fact:target .fact__formula')).toBeVisible()
    await expect(page.locator('.fact:target')).toContainText('posição = 1 + as cidades do grupo')
  })

  test('the links add no request and no script on a phone: the page still loads nothing from /data/', async ({ page, baseURL }) => {
    const seen = collectRequests(page)
    await page.goto(`${city}?ciclo=2026&turno=1`)
    await waitReady(page)
    expect(seen.filter((r) => r.url.includes('/data/'))).toEqual([])
    expect(seen.filter((r) => r.url.includes('/fato/'))).toEqual([])
    expect(seen.every((r) => r.url.startsWith(baseURL!))).toBe(true)
  })
})

test.describe('the page of the calculation', () => {
  test('shows the record the card pointed at: sentence, inputs with their dataset field, formula, worked line, id', async ({ page }) => {
    await page.goto(`${fato('2026-1')}#a`)
    const rec = page.locator('#a')
    await expect(rec).toBeVisible()
    await expect(rec.locator('.fact__sentence:visible')).toHaveText('Em Cidade Exemplo, no 1º turno de 2026, Candidato A: 36.400 de 70.000 votos válidos, 52%.')
    await expect(rec.locator('.fact__inputs')).toContainText('Votos de Candidato A')
    await expect(rec.locator('.fact__inputs')).toContainText('votes.csv · votos')
    await expect(rec.locator('.fact__inputs')).toContainText('70.000')
    await expect(rec.locator('.fact__formula')).toHaveText('votos da linha ÷ votos válidos × 100')
    await expect(rec.locator('.fact__worked')).toHaveText('36.400 ÷ 70.000 × 100 = 52%')
    await expect(rec.locator('.fact__id code')).toHaveText('rj/cidade-exemplo/2026-1/a')
    await expect(rec).toHaveCSS('border-top-color', 'rgb(20, 80, 92)')
  })

  test('names the source and the edition, and links the dictionary of that edition', async ({ page }) => {
    await page.goto(fato('2026-1'))
    await expect(page.getByRole('link', { name: /^EXEMPLO: números fictícios/ })).toHaveAttribute('href', 'https://dadosabertos.tse.jus.br/')
    await expect(page.locator('[data-edition-link]').first()).toHaveAttribute('href', new RegExp(`${base}edicoes/[0-9-]+/$`))
    await expect(page.getByRole('link', { name: /^dicionario\.csv/ })).toHaveAttribute('href', new RegExp(`${base}edicoes/[0-9-]+/dados/dicionario\\.csv$`))
    await expect(page.getByRole('link', { name: /Nota do método: não votantes e margem/ })).toHaveAttribute('href', /docs\/nonvoters-vs-margin\.md$/)
  })

  test('the margin and the curiosities cite the notes of their methods', async ({ page }) => {
    await page.goto(fato('comparacoes'))
    await expect(page.getByRole('link', { name: /Nota do método: curiosidades/ })).toHaveAttribute('href', /web\/docs\/curiosities\.md$/)
  })

  test('is readable without scripts, in the standard register, with the plain sentence in the page for the other', async ({ browser, baseURL }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false, baseURL })
    const page = await ctx.newPage()
    await page.goto(fato('2026-2'))
    await expect(page.locator('h1')).toHaveText('Cálculo dos números')
    await expect(page.locator('.fact')).toHaveCount(9)
    await expect(page.locator('#votaram .fact__sentence:visible')).toContainText('votaram')
    expect(await page.locator('#votaram .fact__sentence[data-register="plain"]').count()).toBe(1)
    await ctx.close()
  })

  test('goes back to the card on the same cycle and round, and has no sideways scroll at 390', async ({ page }) => {
    await page.goto(`${fato('2026-1')}#votaram`)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.getByRole('link', { name: '‹ Cartão da cidade' }).click()
    await expect(page).toHaveURL(`${city}?ciclo=2026&turno=1`)
  })

  test('the earlier cycles have no page per city: their "ver cálculo" opens the one page of the rules, with every kind of figure', async ({ page }) => {
    expect((await page.goto(fato('2022-1')))!.status()).toBe(404)
    await page.goto(`${city}?ciclo=2022&turno=1`)
    const links = await page.locator('[data-view="2022-1"] a.calc').evaluateAll((els) => els.map((e) => e.getAttribute('href')))
    expect(links.length).toBeGreaterThan(5)
    for (const href of links) expect(href).toMatch(new RegExp(`^${base}fato/metodo/ciclos-anteriores/#(frase|votaram|naoVotaram|candidato|parte|margem)$`))
    await page.goto(links[0]!)
    await expect(page.locator('.fact')).toHaveCount(6)
    await expect(page.locator('.fact__formula').first()).toBeVisible()
    await expect(page.locator('.fact__worked').first()).toContainText('Troque cada quantidade')
  })

  test('a cycle with no data has no page, and an id keeps the same address across the rounds', async ({ page }) => {
    expect((await page.goto(`${base}fato/mt/boa-esperanca-do-norte/2018-1/`))!.status()).toBe(404)
    await page.goto(fato('2026-1'))
    const first = await page.locator('.fact').evaluateAll((els) => els.map((e) => e.getAttribute('data-fact')))
    await page.goto(fato('2026-1'))
    expect(await page.locator('.fact').evaluateAll((els) => els.map((e) => e.getAttribute('data-fact')))).toEqual(first)
    expect(first[1]).toBe('rj/cidade-exemplo/2026-1/votaram')
  })
})
