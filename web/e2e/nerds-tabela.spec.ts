import { expect, test } from '@playwright/test'
import { base, collectRequests } from './helpers'
import { DESKTOP, useNoJs } from './presets'

/*
 * The Tabela de detalhe without the island (#76): complete in the HTML with scripts off, at every level, names that degrade to links, the total equal to the sum of the rows,
 * and a phone that never requests the table chunk.
 */
const url = (path: string) => `${base}dados-para-nerds/${path}`
const int = (text: string) => Number(text.replace(/\./g, ''))

test.describe('Tabela de detalhe, scripts off', () => {
  useNoJs({ viewport: DESKTOP })

  for (const [path, first, href] of [
    ['', 'Centro-Oeste', null],
    ['regiao/sudeste/', 'Rio de Janeiro', `${base}dados-para-nerds/estado/rj/`],
    ['estado/rj/', 'Cidade Exemplo', `${base}rj/cidade-exemplo/`],
  ] as const) {
    test(`${path || 'brasil'}: header row, aligned numbers, names as links, last row = the sum of the rows`, async ({ page }) => {
      await page.goto(url(path))
      const table = page.locator('[data-ciclo-block="2026"] [data-panel="detalhe"] table[data-table]')
      expect(await table.locator('thead th').allTextContents()).toEqual(['Nome', 'Eleitorado', 'Compar. 1º', 'Compar. 2º', 'Abst. 1º', 'Abst. 2º', 'Br.+nulos 1º', 'Br.+nulos 2º'])
      expect(await table.locator('tbody td.is-num').count()).toBeGreaterThan(0)
      expect(await table.locator('tbody td:not(.is-num)').count()).toBe(0)
      await expect(table.locator('tbody tr').last()).toHaveAttribute('data-total', '')
      const children = await table.locator('tbody tr:not([data-total]) td:nth-child(2)').allTextContents()
      const total = await table.locator('tbody tr[data-total] td:nth-child(2)').innerText()
      expect(int(total)).toBe(children.map(int).reduce((a, b) => a + b, 0))
      await expect(table.locator('tbody tr').first().locator('th')).toContainText(first)
      if (href) expect(await table.locator('tbody tr').first().locator('th a').getAttribute('href')).toBe(href)
      // alphabetical by default, not by result
      const names = await table.locator('tbody tr:not([data-total]) th').allTextContents()
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'pt-BR')))
    })
  }

  test('a name opens the child level page with scripts off: Brasil -> região', async ({ page }) => {
    await page.goto(url(''))
    await page.locator('[data-ciclo-block="2026"] [data-panel="detalhe"] [data-set="participacao"] tbody a', { hasText: 'Sudeste' }).click()
    await expect(page).toHaveURL(new RegExp('dados-para-nerds/regiao/sudeste/$'))
  })
})

test.describe('Tabela de detalhe on a phone', () => {
  test('is the plain table: no table chunk, no controls, no React', async ({ page }) => {
    const seen = collectRequests(page)
    await page.goto(url('estado/rj/'))
    await expect(page.locator('[data-page="nerds"]')).toHaveAttribute('data-ready', 'yes')
    await page.locator('[data-ciclo-block]:visible [data-panel="detalhe"]').scrollIntoViewIfNeeded()
    await page.waitForLoadState('networkidle')
    expect(seen.map((r) => r.url).filter((u) => /DetalheEnhancer|Escada|client\.|react/i.test(u))).toEqual([])
    await expect(page.locator('[data-ciclo-block]:visible [data-panel="detalhe"] [data-filter]')).toHaveCount(0)
    await expect(page.locator('[data-ciclo-block]:visible [data-panel="detalhe"] table[data-table] tbody tr')).toHaveCount(7)
  })
})
