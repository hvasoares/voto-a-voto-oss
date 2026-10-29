import { expect, test, type Page } from '@playwright/test'
import { base } from './helpers'
import { DESKTOP, WIDE_BAND, useNoJs } from './presets'

/*
 * Par 1º→2º and Distribuição at 1440 px (#79): both complete without scripts (Par as a table, Distribuição as tables of bins plus the five-number summary); the histogram island
 * loads from 1024 px up and only when in view. Waits are on `data-drawn`.
 */
const url = (path = 'estado/rj/') => `${base}dados-para-nerds/${path}`
const par = (page: Page) => page.locator('[data-ciclo-block="2026"] [data-panel="par"]')
const dist = (page: Page) => page.locator('[data-ciclo-block="2026"] [data-panel="distribuicao"]')

test.describe('without scripts', () => {
  useNoJs({ viewport: DESKTOP })

  for (const [path, rows, unit] of [['', ['Brasil'], 'UFs'], ['regiao/sudeste/', ['Sudeste', 'Brasil'], 'UFs'], ['estado/rj/', ['Rio de Janeiro', 'Sudeste', 'Brasil'], 'municípios']] as const) {
    test(`${path || 'brasil'}: Par is a table of values with the fixed note and no difference; Distribuição is bins plus the five numbers and the rule`, async ({ page }) => {
      await page.goto(url(path))
      expect(await par(page).locator('table').first().locator('thead th').allTextContents()).toEqual(['Lugar', '1º turno', '2º turno'])
      expect(await par(page).locator('table').first().locator('tbody th').allTextContents()).toEqual(rows)
      for (const cell of await par(page).locator('table').first().locator('tbody td').allTextContents()) expect(cell).toMatch(/^\d{1,3},\d%$/)
      await expect(par(page).locator('[data-note]')).toContainText('Quando existe 2º turno?')
      expect(await par(page).locator('table').first().locator('tbody').textContent()).not.toMatch(/diferença|pp\b|[+−]\d/)
      // Distribuição
      for (const turno of [1, 2]) {
        const section = dist(page).locator(`[data-turno-table="${turno}"]`)
        const counts = (await section.locator('[data-count]').allTextContents()).map(Number)
        const n = Number((await section.locator('h3').textContent())!.match(/(\d+) /)![1])
        expect(counts.reduce((a, b) => a + b, 0)).toBe(n)
        expect(await section.locator('[data-five] li').count()).toBe(5)
        expect(await section.locator('h3').textContent()).toContain(unit)
      }
      await expect(dist(page).locator('[data-rule]')).toContainText('1,5 × a amplitude interquartil')
      expect(await dist(page).textContent()).not.toMatch(/Cidade Exemplo/)
    })
  }
})

test.describe('with the island', () => {
  test('is the bins table until in view, then the histogram with the box plot; pickers change the measure and turno and the counts agree with the table', async ({ page }) => {
    await page.setViewportSize(WIDE_BAND)
    await page.goto(url())
    await expect(dist(page).locator('[data-dist]')).toHaveAttribute('data-drawn', 'tabela')
    const tableCounts = (await dist(page).locator('[data-turno-table="1"] [data-count]').allTextContents()).map(Number)
    await dist(page).locator('h2').scrollIntoViewIfNeeded()
    await expect(dist(page).locator('[data-dist]')).toHaveAttribute('data-drawn', 'grafico')
    const chartCounts = (await dist(page).locator('[data-bar] .nerds-count-label').allTextContents()).map(Number)
    expect(chartCounts).toEqual(tableCounts)
    expect(await dist(page).locator('[data-five] li').count()).toBe(5)
    await expect(dist(page).locator('[data-box]')).toBeAttached()
    await dist(page).locator('[data-measure-option="abstencao"]').click()
    await expect(dist(page).locator('[data-dist]')).toHaveAttribute('data-measure', 'abstencao')
    await dist(page).locator('[data-turno-option="2"]').click()
    await expect(dist(page).locator('[data-dist]')).toHaveAttribute('data-turno', '2')
    expect(new URL(page.url()).searchParams.get('medida')).toBe('abstencao')
    expect(new URL(page.url()).searchParams.get('turno')).toBe('2')
    await dist(page).locator('[data-to-tabela]').click()
    await expect(dist(page).locator('[data-dist]')).toHaveAttribute('data-drawn', 'tabela')
    await expect(dist(page).locator('[data-turno-table="2"] h3')).toContainText('Abstenção, 2º turno')
  })

  test('the histogram island is not loaded until the panel is in view, and never below 1024 px', async ({ page }) => {
    const chunks: string[] = []
    page.on('request', (r) => /\/_astro\/.*(DistribuicaoPanel)\.[^/]*\.js/.test(r.url()) && chunks.push(r.url()))
    await page.setViewportSize(WIDE_BAND)
    await page.goto(url())
    await page.waitForLoadState('networkidle')
    expect(chunks).toEqual([])
    await dist(page).locator('h2').scrollIntoViewIfNeeded()
    await expect(dist(page).locator('[data-dist]')).toHaveAttribute('data-drawn', 'grafico')
    expect(chunks.length).toBeGreaterThan(0)
  })
})
