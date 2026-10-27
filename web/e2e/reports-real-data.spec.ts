import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { allowedOrigins, base, collectRequests, violations } from './helpers'

/*
 * Real-data checks of the report screens (ticket #12), run with `npm run test:real` (builds with
 * DATA_DIR=../data). The figures are pinned to the source of truth
 * thoughts/team/data-engineering/2026-10-26-runoff-results-highlights.md: Lula flipped 211 cities,
 * Flavio Bolsonaro 1; the top of the list is Itabirito/MG, Barra do Piraí/RJ and João Monlevade/MG.
 * Real-data screenshots (390x844) are saved to .captures/reports/real/.
 */
test.skip(!existsSync(resolve('../data/cities.csv')), 'no ../data')

test.describe('reports hub on the real dataset', () => {
  test('announces the 211 viradas of the highlights note', async ({ page, baseURL }) => {
    const seen = collectRequests(page)
    await page.goto(base + 'relatorios/')
    await expect(page.getByRole('link', { name: /Cidades que viraram no 2º turno/ })).toContainText('Lula virou 211 cidades; Flavio Bolsonaro virou 1')
    await expect(page.locator('nav[aria-label="Relatórios"] > ul > li')).toHaveCount(7)
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