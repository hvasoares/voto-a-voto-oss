import { expect, test } from '@playwright/test'
import { base, collectRequests } from './helpers'

/*
 * Fact records on the rest of the reports, the hub, the state page and the state recap (#62): "De onde vem este número?" beside every listed figure, to a record
 * that exists, the "conferido" seal written from the build's checks, and the neutrality of "Como cada grupo votou" (it counts cities).
 */
const linksOf = async (page: import('@playwright/test').Page) => page.locator('a.calc').evaluateAll((els) => els.map((e) => e.getAttribute('href')!))

test.describe('De onde vem este número? and the seal on the reports, the hub, the state page and the recap', () => {
  for (const [name, path, min] of [
    ['Cidades que viraram', 'relatorios/cidades-que-viraram/', 0],
    ['Maiores viradas', 'relatorios/maiores-viradas/', 2],
    ['Comparecimento', 'relatorios/comparecimento/', 3],
    ['Votos ganhos e perdidos', 'relatorios/votos-ganhos-e-perdidos/', 2],
    ['Como cada grupo votou', 'relatorios/como-cada-grupo-votou/', 2],
    ['Relatórios (hub)', 'relatorios/', 4],
    ['página do estado', 'rj/', 1],
    ['resumo do estado', 'rj/resumo/', 1],
  ] as const) {
    test(`${name}: every link goes to a record that exists and the seal names its checks`, async ({ page, request }) => {
      await page.goto(`${base}${path}`)
      const hrefs = await linksOf(page)
      expect(hrefs.length).toBeGreaterThanOrEqual(min)
      for (const h of new Set(hrefs)) {
        const [target, fragment] = h.split('#')
        const res = await request.get(target!)
        expect(res.status(), h).toBe(200)
        expect(await res.text(), h).toContain(`id="${fragment}"`)
      }
      const seal = page.locator('[data-seal]')
      await expect(seal).toBeVisible()
      await expect(seal.locator('li').first()).toContainText(/Contra (o total nacional|a soma dos)/)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    })
  }

  test('the phone fetches no data and no script for any of them', async ({ page, baseURL }) => {
    for (const path of ['relatorios/', 'relatorios/comparecimento/', 'relatorios/como-cada-grupo-votou/']) {
      const seen = collectRequests(page)
      await page.goto(`${base}${path}`)
      expect(seen.filter((r) => /\/fato\//.test(r.url))).toEqual([])
      expect(seen.filter((r) => r.url.includes('/data/'))).toEqual([])
      expect(seen.every((r) => r.url.startsWith(baseURL!))).toBe(true)
    }
  })
})

test.describe('Como cada grupo votou counts cities and says what it does not say', () => {
  test('the page and its fact page state the limits in plain words, with no cause and no ranking of groups', async ({ page }) => {
    await page.goto(`${base}relatorios/como-cada-grupo-votou/`)
    const limits = page.locator('[data-component="limits"]')
    await expect(limits).toContainText('Cada número desta página conta cidades')
    await expect(limits).toContainText('Isso não diz quem votou em quem nem por quê')
    await expect(limits).toContainText('os grupos não estão em ordem de importância')
    const href = (await linksOf(page))[0]!
    await page.goto(href)
    await expect(page.locator('[data-limits]')).toContainText('Cada número desta página conta cidades')
    const text = (await page.locator('.facts').innerText()).toLowerCase()
    expect(text).toContain('a conta é de cidades, não de pessoas')
    expect(text).not.toMatch(/porque|por causa|culpa|devido|merec|melhor|pior/)
  })
})

test.describe('the fact pages of the reports', () => {
  test('a report row: inputs from the dataset fields, the formula and the worked lines, and the way back to the report', async ({ page }) => {
    await page.goto(`${base}relatorios/comparecimento/`)
    const first = (await linksOf(page)).find((h) => h.includes('#alto-'))!
    await page.goto(first)
    const rec = page.locator('.fact:target')
    await expect(rec.locator('.fact__inputs')).toContainText('turnout.csv · comparecimento')
    await expect(rec.locator('.fact__formula')).toBeVisible()
    await expect(rec.locator('.fact__worked li')).toHaveCount(1)
    await page.getByRole('link', { name: /^‹ Comparecimento/ }).click()
    await expect(page).toHaveURL(`${base}relatorios/comparecimento/`)
  })
  test('the state page counts the municipalities from cities.csv', async ({ page }) => {
    await page.goto(`${base}fato/estado/rj/municipios/#municipios`)
    await expect(page.locator('#municipios .fact__inputs')).toContainText('cities.csv · cd_municipio')
    await expect(page.locator('#municipios .fact__sentence:visible')).toContainText('Municípios do estado Rio de Janeiro')
  })
})
