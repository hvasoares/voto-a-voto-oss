import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { createStore } from '../src/data'
import { diskSource } from '../src/data/node'
import { computePeers } from '../src/lib/peers'
import { computeOutliers, pickOutliers } from '../src/lib/reports/outliers'
import { formatInt as intPt } from '../src/lib/reports/format'
import { displayName, ufLabel } from '../src/shared/city-search'
import { base, collectRequests, gotoFact, maybeThrottleCpu, violations } from './helpers'
import { PHONE, noJs } from './presets'
import { shareMock } from './share-mock'

/*
 * #34 "Cidades fora da curva" at 390x844, fixture dataset (rj, sp, mt). The expected list is computed here from the fixture's own CSVs with the pure
 * module (the unit tests pin the method), so the page is compared with the dataset, not with typed numbers.
 */
const PATH = `${base}relatorios/cidades-fora-da-curva/`
const store = createStore(diskSource(resolve('fixtures/data')))
const outliers = (async () => {
  const [cities, turnout, votes, candidates] = await Promise.all([store.cities(), store.turnout(), store.votes(), store.candidates()])
  return computeOutliers({ cities, turnout, votes, candidates, peers: computePeers({ cities, turnout, votes }) })
})()
const SCREENING = 'Lista de triagem, não uma conclusão: cidades mais distantes de cidades parecidas no comparecimento e na virada desde 2022.'

// #122 flake-hunt repeats: E2E_CPU_RATE slows the CPU of every page in this file.
test.beforeEach(async ({ page }) => maybeThrottleCpu(page))

test.describe('Cidades fora da curva: the hub', () => {
  test('lists the report as a row with a computed headline and its record, and links through', async ({ page }) => {
    const { rows } = await outliers
    const n = pickOutliers(rows, { uf: undefined, min: 5_000 }).compared
    await page.goto(`${base}relatorios/`)
    const row = page.locator('[data-report="cidades-fora-da-curva"]')
    await expect(row).toHaveAttribute('href', PATH)
    await expect(row).toContainText('Cidades fora da curva')
    await expect(row).toContainText(`Lista de triagem: ${n} cidades comparadas com cidades parecidas`)
    await expect(page.locator('a.calc')).toHaveCount(1)
    await expect(page.locator('a.calc')).toHaveAttribute('href', /\/fato\/relatorios\/resumo\/#/)
  })
})

test.describe('Cidades fora da curva: the list', () => {
  test('the screening text is the first thing under the title, above the filters and the list', async ({ page }) => {
    await page.goto(PATH)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cidades fora da curva')
    await expect(page.locator('[data-screening]')).toHaveText(SCREENING)
    const order = await page.evaluate(() => {
      const y = (s: string) => document.querySelector(s)!.getBoundingClientRect().top
      return [y('[data-screening]'), y('[data-filters]'), y('[data-outliers]')]
    })
    expect(order[0]).toBeLessThan(order[1]!)
    expect(order[1]).toBeLessThan(order[2]!)
  })

  test('lists the cities furthest from their peers first, with the valid-vote count next to the rate, each linking to the city card', async ({ page }) => {
    const { rows } = await outliers
    const want = pickOutliers(rows, { uf: undefined, min: 5_000 }).shown
    await page.goto(PATH)
    const items = page.locator('[data-outliers] > li')
    await expect(items).toHaveCount(want.length)
    for (const [i, r] of want.entries()) {
      const item = items.nth(i)
      await expect(item.locator('a').first()).toHaveAttribute('href', `${base}${r.uf}/${r.slug}/`)
      await expect(item).toContainText(`${displayName(r.nome)}/${ufLabel(r.uf)}`)
      await expect(item.locator('[class*="lg:hidden"]').first()).toContainText(`${intPt(r.validos)} votos válidos`)
      await expect(item.locator('[class*="lg:hidden"]').first()).toContainText('típico')
      await expect(item.locator('[class*="lg:hidden"]').nth(1)).toContainText('virada desde 2022')
      await expect(item).toContainText(String(i + 1))
    }
  })

  test('the page has the one "De onde vem este número?", and the records of every row are on the page it opens, with the peers and the calculation', async ({ page }) => {
    const { rows } = await outliers
    const first = pickOutliers(rows, { uf: undefined, min: 5_000 }).shown[0]!
    await page.goto(PATH)
    await expect(page.locator('[data-outliers] a.calc')).toHaveCount(0)
    await expect(page.locator('a.calc')).toHaveCount(1)
    await gotoFact(page, `${base}fato/relatorios/cidades-fora-da-curva/${first.uf}/#${first.uf}-${first.slug}`)
    const record = page.locator(`#${first.uf}-${first.slug}`)
    await expect(record).toContainText('cidade parecida')
    await expect(record).toContainText('mediana de')
    await expect(page.getByRole('link', { name: 'Nota do método: cidades fora da curva' }).first()).toHaveAttribute('href', /cidades-fora-da-curva\.md$/)
    await expect(page.locator('[data-seal]')).toBeVisible()
  })

  test('the page carries the seal and the notes: a starting point to check the data, the sign convention and the method', async ({ page }) => {
    await page.goto(PATH)
    await expect(page.locator('[data-seal]')).toBeVisible()
    await expect(page.locator('[data-notice]')).toContainText('Pontos de partida para checar os dados, não conclusões.')
    await expect(page.locator('[data-sign]')).toContainText('O sinal +')
    await expect(page.locator('[data-method]')).toContainText('mediana')
  })

  test('says nothing that accuses, explains or concludes about a city', async ({ page }) => {
    await page.goto(PATH)
    const text = (await page.locator('main').innerText()).toLowerCase()
    expect(text).not.toMatch(/irregular|suspeit|fraude|manipul|errad|culpa|porque|devido|explica|conclusão:? (a|o) /)
  })
})

test.describe('Cidades fora da curva: the filters', () => {
  test('the default hides the cities below the minimum of valid votes; a bigger minimum hides more', async ({ page }) => {
    const { rows } = await outliers
    const small = rows.find((r) => r.validos < 50_000)!
    const name = `${displayName(small.nome)}/${ufLabel(small.uf)}`
    await page.goto(PATH)
    await expect(page.locator('[data-outliers]')).toContainText(name) // 5 mil by default: the fixture cities are all above it
    await page.goto(`${PATH}todos/50000/`)
    await expect(page.locator('[data-outliers]')).not.toContainText(name)
    const want = pickOutliers(rows, { uf: undefined, min: 50_000 })
    await expect(page.locator('[data-count]')).toContainText(`Mostrando ${want.shown.length} de ${want.compared} cidades com 50 mil ou mais votos válidos`)
    for (const r of want.shown) await expect(page.locator(`[data-outlier="${r.uf}-${r.slug}"]`)).toHaveCount(1)
  })

  test('a minimum above every city says so instead of showing an empty list', async ({ page }) => {
    await page.goto(`${PATH}todos/50000/`)
    const { rows } = await outliers
    if (pickOutliers(rows, { uf: undefined, min: 50_000 }).compared === 0) await expect(page.locator('[data-empty]')).toContainText('Nenhuma cidade com 50 mil ou mais votos válidos')
  })

  test('the state filter keeps one state, and the options are plain links that keep the other filter', async ({ page }) => {
    await page.goto(`${PATH}todos/20000/`)
    const uf = page.locator('[data-filter="uf"]')
    await uf.locator('summary').click()
    await expect(uf.getByRole('link', { name: 'São Paulo' })).toHaveAttribute('href', `${PATH}sp/20000/`)
    await uf.getByRole('link', { name: 'Rio de Janeiro' }).click()
    await expect(page).toHaveURL(`${PATH}rj/20000/`)
    await expect(page.locator('[data-filter="uf"] summary')).toContainText('Estado: Rio de Janeiro')
    await expect(page.locator('[data-filter="min"] summary')).toContainText('Mínimo: 20 mil votos')
    const ufs = await page.locator('[data-outliers] > li a[href]:not(.calc)').evaluateAll((els) => els.map((e) => e.getAttribute('href')!.split('/').filter(Boolean).slice(-2)[0]))
    expect(new Set(ufs)).toEqual(new Set(['rj']))
    await expect(page.locator('[data-count]')).toContainText('em Rio de Janeiro')
  })

  test('works without JavaScript: the list is pre-rendered and the filters are links', async ({ browser }) => {
    const ctx = await browser.newContext({ ...noJs(), viewport: PHONE })
    const page = await ctx.newPage()
    await page.goto(PATH)
    await expect(page.locator('[data-outliers] > li').first()).toBeVisible()
    await page.locator('[data-filter="min"] summary').click()
    await page.locator('[data-filter="min"]').getByRole('link', { name: '1 mil' }).click()
    await expect(page).toHaveURL(`${PATH}todos/1000/`)
    await ctx.close()
  })
})

test.describe('Cidades fora da curva: share, phone, requests', () => {
  test('the share carries the screening text and the link, and no city', async ({ page }) => {
    await shareMock(page).install('shares')
    await page.goto(PATH)
    await page.getByRole('button', { name: 'Compartilhar' }).click()
    const [d] = await shareMock(page).waitForCalls(1)
    expect(d!.text).toBe(SCREENING)
    expect(d!.url).toContain(`${base}relatorios/cidades-fora-da-curva/`)
    expect(d!.text).not.toMatch(/Cidade Exemplo/)
  })

  test('no horizontal scroll, 44 px targets for the filters and the rows, and no request leaves the site', async ({ page, baseURL }) => {
    const seen = collectRequests(page)
    await page.goto(PATH)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    for (const el of await page.locator('[data-filters] summary, [data-outliers] > li > div > div > a').all()) expect((await el.boundingBox())!.height, (await el.textContent()) ?? '').toBeGreaterThanOrEqual(43)
    expect(violations(seen, [new URL(page.url()).origin])).toEqual([])
  })

  test('the phone loads no script of the report beyond the shared analytics and the report script', async ({ page }) => {
    const seen = collectRequests(page)
    await page.goto(PATH)
    await page.waitForLoadState('networkidle')
    expect(seen.filter((r) => r.type === 'script' && /fragmentos|react|client\./i.test(r.url))).toEqual([])
  })
})
