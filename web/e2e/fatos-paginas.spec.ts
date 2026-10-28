import { expect, test } from '@playwright/test'
import { base, collectRequests } from './helpers'

/*
 * Fact records on the other pages (#62): "De onde vem este número?" on Brasil e regiões, Comparar com 2022/2018 and Três ciclos por estado, the "conferido" seal written from the
 * build's checks, and the fact pages behind them. On a phone the highlight island is not even requested.
 */
const SEAL_MUNICIPIOS = /Contra a soma dos \d+ municípios e postos do exterior \(2026, 2º turno\): [\d.]+ eleitores aptos, [\d.]+ comparecimentos e [\d.]+ votos válidos, iguais ao total do país\./

test.describe('De onde vem este número? and the seal on the other pages', () => {
  for (const [name, path, links] of [
    ['Brasil e regiões', 'brasil/', 2],
    ['Comparar com 2022', 'comparar/2022/', 2],
    ['Comparar com 2018', 'comparar/2018/', 2],
    ['Três ciclos por estado', 'tres-ciclos/rj/', 3],
    ['Disputas mais apertadas', 'relatorios/disputas-mais-apertadas/', 1],
  ] as const) {
    test(`${name}: every group of figures has its link, to a record that exists, and the seal names its checks`, async ({ page, request }) => {
      await page.goto(`${base}${path}`)
      const hrefs = await page.locator('a.calc').evaluateAll((els) => els.map((e) => e.getAttribute('href')!))
      expect(hrefs.length).toBeGreaterThanOrEqual(links)
      for (const h of new Set(hrefs)) {
        const [target, fragment] = h.split('#')
        const res = await request.get(target!)
        expect(res.status(), h).toBe(200)
        expect(await res.text(), h).toContain(`id="${fragment}"`)
      }
      const seal = page.locator('[data-seal]')
      await expect(seal).toBeVisible()
      await expect(seal.locator('h2')).toContainText('Conferido')
      await expect(seal.locator('li').first()).toContainText(/Contra (o total nacional|a soma dos)/)
      await expect(seal).toContainText('Texto gerado pelas conferências da montagem do site')
    })
  }

  test('Brasil is checked against the national totals and against the municipalities', async ({ page }) => {
    await page.goto(`${base}brasil/`)
    const lines = await page.locator('[data-seal] li').allInnerTexts()
    expect(lines).toHaveLength(2)
    expect(lines[0]).toMatch(/^Contra o total nacional da edição de \d\d\/\d\d\/\d{4} \(2026, 2º turno\): [\d.]+ comparecimentos e [\d.]+ votos válidos, iguais\.$/)
    expect(lines[1]).toMatch(SEAL_MUNICIPIOS)
  })

  test('the phone loads no highlight code and no fact page for the three-cycles page', async ({ page, baseURL }) => {
    const seen = collectRequests(page)
    await page.goto(`${base}tres-ciclos/rj/`)
    expect(seen.filter((r) => /FactHighlight|\/fato\//.test(r.url))).toEqual([])
    expect(seen.filter((r) => r.url.includes('/data/'))).toEqual([])
    expect(seen.every((r) => r.url.startsWith(baseURL!))).toBe(true)
    await expect(page.locator('[data-fact-highlight]')).toHaveCount(0)
  })
})

test.describe('the fact pages of the other pages', () => {
  test('Brasil: records of the national bar and a region, with the seal and the source', async ({ page }) => {
    await page.goto(`${base}fato/brasil/2026-2/`)
    await expect(page.locator('h1')).toHaveText('Cálculo dos números')
    await expect(page.locator('.page__subtitle')).toHaveText('Brasil e regiões · 2º turno de 2026')
    await expect(page.locator('#sudeste-parcela .fact__formula')).toHaveText('votos válidos da região ÷ votos válidos do país × 100')
    await expect(page.locator('[data-seal] li')).toHaveCount(2)
    await expect(page.getByRole('link', { name: /^dicionario\.csv/ })).toBeVisible()
  })

  test('comparison: both cycles are inputs and the change is between cycles', async ({ page }) => {
    await page.goto(`${base}fato/comparar/2022/estados/#rj-a`)
    const rec = page.locator('#rj-a')
    await expect(rec.locator('.fact__inputs')).toContainText('em 2022')
    await expect(rec.locator('.fact__worked li')).toHaveCount(3)
    await expect(rec.locator('.fact__sentence:visible')).toContainText('variação de')
    await expect(page.locator('[data-seal] li')).toHaveCount(2)
    await page.getByRole('link', { name: '‹ Comparar com 2022' }).click()
    await expect(page).toHaveURL(`${base}comparar/2022/`)
  })

  test('state: the change is computed from the unrounded shares, and the way back is the three-cycles page', async ({ page }) => {
    await page.goto(`${base}fato/estado/rj/tres-ciclos/#2022-variacao`)
    await expect(page.locator('[id="2022-variacao"] .fact__worked li')).toContainText('pontos percentuais')
    await expect(page.locator('[data-seal] li')).toHaveCount(3)
    await page.getByRole('link', { name: '‹ Três ciclos por estado' }).click()
    await expect(page).toHaveURL(`${base}tres-ciclos/rj/`)
  })
})
