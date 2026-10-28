import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { allowedOrigins, base, collectRequests, violations } from './helpers'

/*
 * Real-data checks of the report screens (tickets #12 and #13), run with `npm run test:real` (builds
 * with DATA_DIR=../data). The figures are pinned to the source of truth
 * thoughts/team/data-engineering/2026-10-26-runoff-results-highlights.md: Lula flipped 211 cities,
 * Flávio Bolsonaro 1; the top of the list is Itabirito/MG, Barra do Piraí/RJ and João Monlevade/MG;
 * the four reports of #13 pin Campos dos Goytacazes, São Paulo/Itaituba, Maricá/Rio, Marquinho/
 * Apiacá/Anhangüera and Santa Maria do Herval/Itaubal. Real-data screenshots (390x844) are saved
 * to .captures/reports/real/.
 */
test.skip(!existsSync(resolve('../data/cities.csv')), 'no ../data')

test.describe('reports hub on the real dataset', () => {
  test('announces the 211 viradas of the highlights note', async ({ page, baseURL }) => {
    const seen = collectRequests(page)
    await page.goto(base + 'relatorios/')
    await expect(page.getByRole('link', { name: /Cidades que viraram no 2º turno/ })).toContainText('Lula virou 211 cidades; Flávio Bolsonaro virou 1')
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
  test('top of the ranked list: Itabirito/MG, Barra do Piraí/RJ, João Monlevade/MG', async ({ page }) => {
    await page.goto(base + 'relatorios/cidades-que-viraram/')
    const rows = page.locator('[data-flip]')
    await expect(rows).toHaveCount(129) // of the 211 flipped cities, 129 pass the 5 mil+ valid-vote filter
    const first = await rows.first().textContent()
    expect(first).toContain('Itabirito/MG')
    expect(first).toContain('Margem -4,5 pp → +5,0 pp · 34.159 votos válidos')
    const second = await rows.nth(1).textContent()
    expect(second).toContain('Barra do Piraí/RJ')
    expect(second).toContain('51.929 votos válidos')
    const third = await rows.nth(2).textContent()
    expect(third).toContain('João Monlevade/MG')
    expect(third).toContain('46.754 votos válidos')
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
  test('the 100 mil+ list: Campos dos Goytacazes still at the top after +9,8 pp', async ({ page }) => {
    await page.goto(base + 'relatorios/maiores-viradas/')
    const rows = page.locator('[data-swing]')
    await expect(rows).toHaveCount(173) // every 100 mil+ city moved toward Lula; nothing moved away
    const first = await rows.first().textContent()
    expect(first).toContain('Campos dos Goytacazes/RJ')
    expect(first).toContain('Virada +9,8 pp · Margem -25,6 pp → -15,8 pp (perdeu no 2º turno) · 275.397 votos válidos')
    const second = await rows.nth(1).textContent()
    expect(second).toContain('Sobral/CE')
    expect(second).toContain('+8,8 pp')
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
    const lula = sections.nth(0)
    await expect(lula.locator('[data-total]')).toContainText('+3.862.039 votos no país: ganhou em 3.428 cidades, perdeu em 2.132 cidades (de 5.570 comparadas) · 2 cidades mantiveram o mesmo número de votos em 2022.')
    await expect(lula.locator('[data-gain="0"]')).toContainText('SÃO PAULO/SP')
    await expect(lula.locator('[data-gain="0"]')).toContainText('+186.433 votos · 3.864.354 em 2026')
    await expect(lula.locator('[data-loss="0"]')).toContainText('ITAITUBA/PA')
    await expect(lula.locator('[data-loss="0"]')).toContainText('-2.403 votos · 19.123 em 2026')
    const flavio = sections.nth(1)
    await expect(flavio.locator('[data-total]')).toContainText('+1.591.101 votos no país: ganhou em 5.118 cidades, perdeu em 451')
    await expect(flavio.locator('[data-gain="0"]')).toContainText('MARICÁ/RJ')
    await expect(flavio.locator('[data-gain="0"]')).toContainText('+14.831 votos · 72.786 em 2026')
    await expect(flavio.locator('[data-loss="0"]')).toContainText('RIO DE JANEIRO/RJ')
    await expect(flavio.locator('[data-loss="0"]')).toContainText('-144.011 votos · 1.785.198 em 2026')
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
    const tie = rows.first()
    await expect(tie).toContainText('Marquinho/PR')
    await expect(tie).toContainText('Empate: 1.530 a 1.530 votos')
    const second = await rows.nth(1).textContent()
    expect(second).toContain('Apiacá/ES')
    expect(second).toContain('Diferença de 1 voto — Lula à frente (2.366 a 2.365)')
    // The row id is the city slug: the raw name "ANHANGÜERA" lowercases with "ü", the slug is accent-free.
    const anhanguera = await page.locator('[data-race="anhanguera"]').textContent()
    expect(anhanguera).toContain('Diferença de 1 voto — Flávio Bolsonaro à frente (523 a 522)')
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
    await expect(page.locator('[data-sized]')).toContainText('4.139 cidades no filtro')
    const high = page.locator('[data-turnout-high] [data-turnout]')
    const low = page.locator('[data-turnout-low] [data-turnout]')
    await expect(high).toHaveCount(10)
    await expect(low).toHaveCount(10)
    await expect(high.first()).toContainText('Santa Maria do Herval/RS')
    await expect(high.first()).toContainText('90,5% · 4.769 de 5.272 eleitores aptos')
    await expect(low.first()).toContainText('Itaubal/AP')
    await expect(low.first()).toContainText('59,0% · 5.239 de 8.881 eleitores aptos')
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