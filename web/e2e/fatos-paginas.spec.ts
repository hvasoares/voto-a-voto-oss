import { expect, test } from '@playwright/test'
import { base, collectRequests, gotoFact, waitStubReady } from './helpers'
import { EXAMPLE_URLS, calcEntryExpectation } from './routes-inventory'

/*
 * Fact records on the other pages (#62): the page's one "De onde vem este número?" (#155) on Brasil e regiões, Comparar com 2022/2018 and Três ciclos por estado, the "conferido" seal
 * written from the build's checks, and the fact pages behind them. On a phone the highlight island is not even requested.
 */
const SEAL_MUNICIPIOS = /Contra a soma dos \d+ municípios e postos do exterior \(2026, 2º turno\): [\d.]+ eleitores aptos, [\d.]+ comparecimentos e [\d.]+ votos válidos, iguais ao total do país\./

test.describe('the way back from the calculation page (#152)', () => {
  test('after the link on Brasil e regiões, the back link returns to the card where the link was left', async ({ page }) => {
    await page.goto(`${base}brasil/`)
    const link = page.locator('a.calc').last()
    await link.scrollIntoViewIfNeeded()
    await link.click()
    await expect(page).toHaveURL(/\/fato\//)
    await waitStubReady(page)
    const back = page.locator('.fact-page a.back')
    await back.focus()
    await expect(back).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/brasil\//)
    // The card is where it was left: the link the visitor tapped is still in view, not the top of the page.
    await expect(page.locator('a.calc').last()).toBeInViewport()
  })

  test('opened directly, the back link is a plain link to the page that prints the figure', async ({ page }) => {
    await page.goto(`${base}brasil/`)
    const target = (await page.locator('a.calc').first().getAttribute('href'))!
    await gotoFact(page, new URL(target, page.url()).href)
    const back = page.locator('.fact-page a.back')
    await expect(back).toHaveAttribute('href', /\/brasil\/$/)
    await back.click()
    await expect(page).toHaveURL(/\/brasil\/$/)
  })
})

test.describe('the one "De onde vem este número?" of every page (#155)', () => {
  // The count goes over the whole route list: a template of CALC_ENTRY_PAGES holds exactly one entry, every other template holds none.
  for (const template of Object.keys(EXAMPLE_URLS)) {
    const { url, count } = calcEntryExpectation(template)
    test(`${template}: ${count} entry`, async ({ page }) => {
      await page.goto(`${base}${url}`)
      // the Meu Brasil story is drawn by its island: the entry exists once the island says it is ready (data-ready)
      if (url.includes('?mora=')) await page.waitForSelector('[data-story][data-ready="yes"]')
      await expect(page.locator('a[data-calc]')).toHaveCount(count)
      await expect(page.locator('a.calc')).toHaveCount(count)
      if (count === 0) return
      // an icon with its own accessible name (the catalog's "fact.link"), a 44 px target, and the page of the calculation behind it
      const entry = page.getByRole('link', { name: 'De onde vem este número?' })
      await expect(entry).toHaveCount(1)
      await expect(entry).toBeVisible()
      const box = (await entry.boundingBox())!
      expect(box.height).toBeGreaterThanOrEqual(44)
      expect(box.width).toBeGreaterThanOrEqual(44)
      await expect(entry).toHaveText('🔍')
      expect(await entry.getAttribute('href')).toContain('/fato/')
    })
  }
})

test.describe('De onde vem este número? and the seal on the other pages', () => {
  for (const [name, path] of [
    ['Brasil e regiões', 'brasil/'],
    ['Comparar com 2022', 'comparar/2022/'],
    ['Comparar com 2018', 'comparar/2018/'],
    ['Três ciclos por estado', 'tres-ciclos/rj/'],
    ['Disputas mais apertadas', 'relatorios/disputas-mais-apertadas/'],
  ] as const) {
    test(`${name}: the entry goes to a record that exists, and the seal names its checks`, async ({ page }) => {
      await page.goto(`${base}${path}`)
      const hrefs = await page.locator('a.calc').evaluateAll((els) => els.map((e) => e.getAttribute('href')!))
      expect(hrefs).toHaveLength(1)
      const seal = page.locator('[data-seal]')
      await expect(seal).toBeVisible()
      await expect(seal.locator('h2')).toContainText('Conferido')
      await expect(seal.locator('li').first()).toContainText(/Contra (o total nacional|a soma dos)/)
      await expect(seal).toContainText('Texto gerado pelas conferências da montagem do site')
      // the record exists: the page the entry opens is a stub, so the record is there once its data file is drawn (data-ready)
      for (const h of new Set(hrefs)) {
        await gotoFact(page, new URL(h, page.url()).href)
        await expect(page.locator(`[id="${h.split('#')[1]}"]`), h).toHaveCount(1)
      }
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
    await gotoFact(page, `${base}fato/brasil/2026-2/`)
    await expect(page.locator('h1')).toHaveText('Cálculo dos números')
    await expect(page.locator('.page__subtitle')).toHaveText('Brasil e regiões · 2º turno de 2026')
    await expect(page.locator('#sudeste-parcela .fact__formula')).toHaveText('votos válidos da região ÷ votos válidos do país × 100')
    await expect(page.locator('[data-seal] li')).toHaveCount(2)
    await expect(page.getByRole('link', { name: /^dicionario\.csv/ })).toBeVisible()
  })

  test('comparison: both cycles are inputs and the change is between cycles', async ({ page }) => {
    await gotoFact(page, `${base}fato/comparar/2022/estados/#rj-a`)
    const rec = page.locator('#rj-a')
    await expect(rec.locator('.fact__inputs')).toContainText('em 2022')
    await expect(rec.locator('.fact__worked li')).toHaveCount(3)
    await expect(rec.locator('.fact__sentence:visible')).toContainText('variação de')
    await expect(page.locator('[data-seal] li')).toHaveCount(2)
    await page.getByRole('link', { name: '‹ Comparar com 2022' }).click()
    await expect(page).toHaveURL(`${base}comparar/2022/`)
  })

  test('state: the change is computed from the unrounded shares, and the way back is the three-cycles page', async ({ page }) => {
    await gotoFact(page, `${base}fato/estado/rj/tres-ciclos/#2022-variacao`)
    await expect(page.locator('[id="2022-variacao"] .fact__worked li')).toContainText('pontos percentuais')
    await expect(page.locator('[data-seal] li')).toHaveCount(3)
    await page.getByRole('link', { name: '‹ Três ciclos por estado' }).click()
    await expect(page).toHaveURL(`${base}tres-ciclos/rj/`)
  })
})
