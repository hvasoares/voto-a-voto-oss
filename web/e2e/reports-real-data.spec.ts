import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { allowedOrigins, base, collectRequests, violations } from './helpers'
import { dataGuard } from './presets'
import { cityBySlug, closestRaces, cityVotes, dec1, flips, int, latestRound, placeLabel, signedDec1, signedInt, swingRows, turnoutRanking, votesChange } from './real-data-oracle'

/*
 * Real-data checks of the report screens (tickets #12 and #13), run with `npm run test:real` (builds
 * with DATA_DIR=../data). Every figure and every city of a ranking is counted by the oracle from the data
 * directory (real-data-oracle.ts), in the order each report documents; the sentences the pages take from
 * the catalog are the catalog's. The races with one vote of difference (the tie-breaking order inside the
 * report is the page's own) are named here by their slugs and their votes counted. Real-data screenshots
 * (390x844) are saved to .captures/reports/real/.
 */
test.skip(...dataGuard())

const LULA = '13'
const FLAVIO = '22'
const ROUND = { ano: 2026, turno: 2 }
const BEFORE = { ano: 2022, turno: 2 }
/** The names the reports print for the two candidates of the runoff. */
const NAMES: Record<string, string> = { [LULA]: 'Lula', [FLAVIO]: 'Flávio Bolsonaro' }
/** "N cidades" / "1": the hub headline writes the singular without the noun. */
const cidades = (n: number) => (n === 1 ? '1' : `${int(n)} cidades`)
const MIN_FLIP_VALID = 5_000
const MIN_SWING_VALID = 100_000
const MIN_TURNOUT_APTOS = 5_000

test.describe('reports hub on the real dataset', () => {
  test('announces the viradas counted from the data', async ({ page, baseURL }) => {
    const seen = collectRequests(page)
    await page.goto(base + 'relatorios/')
    await expect(page.getByRole('link', { name: /Cidades que viraram no 2º turno/ })).toContainText(`Lula virou ${cidades(flips(2026, LULA, FLAVIO).length)}; Flávio Bolsonaro virou ${cidades(flips(2026, FLAVIO, LULA).length)}`)
    await expect(page.locator('nav[aria-label="Relatórios"] > ul > li')).toHaveCount(8)
    expect(violations(seen, await allowedOrigins(baseURL!))).toEqual([])
  })

  test('saves the real-data screenshot of the hub', async ({ page }) => {
    await page.goto(base + 'relatorios/')
    await page.evaluate(() => document.fonts.ready)
    await page.evaluate(() => window.scrollTo(0, 0))
    const dir = resolve('.captures', 'reports', 'real')
    mkdirSync(dir, { recursive: true })
    await page.screenshot({ path: resolve(dir, 'reports-hub-real.png'), animations: 'disabled', fullPage: true })
    writeFileSync(resolve(dir, 'reports-hub-real.json'), JSON.stringify({ slot: 'reports-hub', state: 'real-data', route: base + 'relatorios/', viewport: page.viewportSize(), fullPage: true, reference: 'site/reference/06-relatorios.png' }, null, 2) + '\n')
  })
})

test.describe('cidades que viraram on the real dataset', () => {
  test('the ranked list: the flipped cities of 5 mil+ valid votes, biggest swing first', async ({ page }) => {
    await page.goto(base + 'relatorios/cidades-que-viraram/')
    const list = flips(2026, LULA, FLAVIO, MIN_FLIP_VALID)
    const rows = page.locator('[data-flip]')
    await expect(rows).toHaveCount(list.length) // of all the flipped cities, those that pass the valid-vote filter
    for (const [i, r] of list.slice(0, 3).entries()) {
      await expect(rows.nth(i)).toContainText(placeLabel(r.city), { ignoreCase: true })
      await expect(rows.nth(i)).toContainText(`Margem ${signedDec1(r.margin1)} pp → ${signedDec1(r.margin2)} pp · ${int(r.validos)} votos válidos`)
    }
  })

  test('saves the real-data screenshot of the report', async ({ page }) => {
    await page.goto(base + 'relatorios/cidades-que-viraram/')
    await page.evaluate(() => document.fonts.ready)
    await page.evaluate(() => window.scrollTo(0, 0))
    const dir = resolve('.captures', 'reports', 'real')
    mkdirSync(dir, { recursive: true })
    await page.screenshot({ path: resolve(dir, 'cidades-que-viraram-real.png'), animations: 'disabled' })
    writeFileSync(resolve(dir, 'cidades-que-viraram-real.json'), JSON.stringify({ slot: 'cidades-que-viraram', state: 'real-data', route: base + 'relatorios/cidades-que-viraram/', viewport: page.viewportSize(), fullPage: false, reference: 'site/reference/07-cidades-que-viraram.png' }, null, 2) + '\n')
  })
})

test.describe('maiores viradas on the real dataset', () => {
  test('the 100 mil+ list: the biggest swings toward Lula, each with its margins and volume', async ({ page }) => {
    await page.goto(base + 'relatorios/maiores-viradas/')
    const list = swingRows(2026, LULA, FLAVIO).filter((r) => r.validos >= MIN_SWING_VALID && r.swing > 0)
    const rows = page.locator('[data-swing]')
    await expect(rows).toHaveCount(list.length) // every 100 mil+ city moved toward Lula in the shipped data; the page lists those that did
    const outcome = (margin: number) => (margin > 0 ? 'venceu' : margin < 0 ? 'perdeu' : 'empatou')
    const [first, second] = list
    await expect(rows.first()).toContainText(placeLabel(first!.city), { ignoreCase: true })
    await expect(rows.first()).toContainText(`Virada ${signedDec1(first!.swing)} pp · Margem ${signedDec1(first!.margin1)} pp → ${signedDec1(first!.margin2)} pp (${outcome(first!.margin2)} no 2º turno) · ${int(first!.validos)} votos válidos`)
    await expect(rows.nth(1)).toContainText(placeLabel(second!.city), { ignoreCase: true })
    await expect(rows.nth(1)).toContainText(`${signedDec1(second!.swing)} pp`)
  })

  test('saves the real-data screenshot of the report', async ({ page }) => {
    await page.goto(base + 'relatorios/maiores-viradas/')
    await page.evaluate(() => document.fonts.ready)
    await page.evaluate(() => window.scrollTo(0, 0))
    const dir = resolve('.captures', 'reports', 'real')
    mkdirSync(dir, { recursive: true })
    await page.screenshot({ path: resolve(dir, 'maiores-viradas-real.png'), animations: 'disabled' })
    writeFileSync(resolve(dir, 'maiores-viradas-real.json'), JSON.stringify({ slot: 'maiores-viradas', state: 'real-data', route: base + 'relatorios/maiores-viradas/', viewport: page.viewportSize(), fullPage: false, reference: 'site/reference/07-cidades-que-viraram.png' }, null, 2) + '\n')
  })
})

test.describe('votos ganhos e perdidos on the real dataset', () => {
  test('both candidates: net totals, counts and the tops of the ranked lists', async ({ page }) => {
    await page.goto(base + 'relatorios/votos-ganhos-e-perdidos/')
    const sections = page.locator('[data-candidate-section]')
    await expect(sections).toHaveCount(2)
    for (const [i, numero] of [LULA, FLAVIO].entries()) {
      const change = votesChange(numero, ROUND, BEFORE)
      // The ranked lists and the "unchanged" count take the cities of 5 mil+ valid votes; the totals take every city compared.
      const listed = change.rows.filter((r) => r.validos >= MIN_FLIP_VALID)
      const section = sections.nth(i)
      const same = i === 0 ? ` (de ${int(change.rows.length)} comparadas) · ${int(listed.filter((r) => r.diff === 0).length)} cidades mantiveram o mesmo número de votos em 2022.` : ''
      await expect(section.locator('[data-total]')).toContainText(`${signedInt(change.total)} votos no país: ganhou em ${int(change.gained)} cidades, perdeu em ${int(change.lost)} cidades${same}`)
      const [gain, loss] = [listed[0]!, listed.filter((r) => r.diff < 0).at(-1)!]
      await expect(section.locator('[data-gain="0"]')).toContainText(placeLabel(gain.city), { ignoreCase: true })
      await expect(section.locator('[data-gain="0"]')).toContainText(`${signedInt(gain.diff)} votos · ${int(gain.now)} em 2026`)
      await expect(section.locator('[data-loss="0"]')).toContainText(placeLabel(loss.city), { ignoreCase: true })
      await expect(section.locator('[data-loss="0"]')).toContainText(`${signedInt(loss.diff)} votos · ${int(loss.now)} em 2026`)
    }
  })

  test('saves the real-data screenshot of the report', async ({ page }) => {
    await page.goto(base + 'relatorios/votos-ganhos-e-perdidos/')
    await page.evaluate(() => document.fonts.ready)
    await page.evaluate(() => window.scrollTo(0, 0))
    const dir = resolve('.captures', 'reports', 'real')
    mkdirSync(dir, { recursive: true })
    await page.screenshot({ path: resolve(dir, 'votos-ganhos-e-perdidos-real.png'), animations: 'disabled' })
    writeFileSync(resolve(dir, 'votos-ganhos-e-perdidos-real.json'), JSON.stringify({ slot: 'votos-ganhos-e-perdidos', state: 'real-data', route: base + 'relatorios/votos-ganhos-e-perdidos/', viewport: page.viewportSize(), fullPage: false, reference: 'site/reference/07-cidades-que-viraram.png' }, null, 2) + '\n')
  })
})

test.describe('disputas mais apertadas on the real dataset', () => {
  test('the tie, the one-vote margins and who is ahead in each', async ({ page }) => {
    await page.goto(base + 'relatorios/disputas-mais-apertadas/')
    const rows = page.locator('[data-race]')
    await expect(rows).toHaveCount(20) // the shown slice; the total of compared cities is the computed caption
    const [tie] = closestRaces(ROUND)
    expect(tie!.diff, 'the data has a tie').toBe(0)
    await expect(rows.first()).toContainText(placeLabel(tie!.city), { ignoreCase: true })
    await expect(rows.first()).toContainText(`Empate: ${int(tie!.first)} a ${int(tie!.second)} votos`)
    // Two of the one-vote races, by slug (their order among the many one-vote races is the page's own): who is ahead is counted.
    // The row id is the city slug: the raw name "ANHANGÜERA" lowercases with "ü", the slug is accent-free.
    for (const [uf, slug] of [['es', 'apiaca'], ['go', 'anhanguera']]) {
      const [lula, flavio] = [cityVotes(ROUND, LULA, uf!, slug!), cityVotes(ROUND, FLAVIO, uf!, slug!)]
      expect(Math.abs(lula - flavio), `${slug} is a one-vote race`).toBe(1)
      const ahead = lula > flavio ? LULA : FLAVIO
      const row = slug === 'apiaca' ? rows.nth(1) : page.locator(`[data-race="${slug}"]`)
      await expect(row).toContainText(`Diferença de 1 voto — ${NAMES[ahead]} à frente (${int(Math.max(lula, flavio))} a ${int(Math.min(lula, flavio))})`)
      await expect(row).toContainText(cityBySlug(uf!, slug!).nome, { ignoreCase: true })
    }
  })

  test('saves the real-data screenshot of the report', async ({ page }) => {
    await page.goto(base + 'relatorios/disputas-mais-apertadas/')
    await page.evaluate(() => document.fonts.ready)
    await page.evaluate(() => window.scrollTo(0, 0))
    const dir = resolve('.captures', 'reports', 'real')
    mkdirSync(dir, { recursive: true })
    await page.screenshot({ path: resolve(dir, 'disputas-mais-apertadas-real.png'), animations: 'disabled' })
    writeFileSync(resolve(dir, 'disputas-mais-apertadas-real.json'), JSON.stringify({ slot: 'disputas-mais-apertadas', state: 'real-data', route: base + 'relatorios/disputas-mais-apertadas/', viewport: page.viewportSize(), fullPage: false, reference: 'site/reference/07-cidades-que-viraram.png' }, null, 2) + '\n')
  })
})

test.describe('comparecimento on the real dataset', () => {
  test('top and bottom of the turnout ranking carry their volumes', async ({ page }) => {
    await page.goto(base + 'relatorios/comparecimento/')
    const ranking = turnoutRanking(latestRound(), MIN_TURNOUT_APTOS)
    await expect(page.locator('[data-sized]')).toContainText(`${int(ranking.length)} cidades no filtro`)
    const high = page.locator('[data-turnout-high] [data-turnout]')
    const low = page.locator('[data-turnout-low] [data-turnout]')
    await expect(high).toHaveCount(10)
    await expect(low).toHaveCount(10)
    const volume = (r: (typeof ranking)[number]) => `${dec1(r.rate)}% · ${int(r.comparecimento)} de ${int(r.aptos)} eleitores aptos`
    await expect(high.first()).toContainText(placeLabel(ranking[0]!.city), { ignoreCase: true })
    await expect(high.first()).toContainText(volume(ranking[0]!))
    await expect(low.first()).toContainText(placeLabel(ranking.at(-1)!.city), { ignoreCase: true })
    await expect(low.first()).toContainText(volume(ranking.at(-1)!))
  })

  test('saves the real-data screenshot of the report', async ({ page }) => {
    await page.goto(base + 'relatorios/comparecimento/')
    await page.evaluate(() => document.fonts.ready)
    await page.evaluate(() => window.scrollTo(0, 0))
    const dir = resolve('.captures', 'reports', 'real')
    mkdirSync(dir, { recursive: true })
    await page.screenshot({ path: resolve(dir, 'comparecimento-real.png'), animations: 'disabled' })
    writeFileSync(resolve(dir, 'comparecimento-real.json'), JSON.stringify({ slot: 'comparecimento', state: 'real-data', route: base + 'relatorios/comparecimento/', viewport: page.viewportSize(), fullPage: false, reference: 'site/reference/07-cidades-que-viraram.png' }, null, 2) + '\n')
  })
})