import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { base } from './helpers'

/*
 * The Tabela de detalhe at 1440 px (#76): complete in the HTML, upgraded in place once in view (filter, sort, rows that open into the next level, CSV), at every level.
 * Waits are on `data-ready` of the table wrapper and on each row's `data-state`, never on a timer.
 */
const url = (path: string, q = '') => `${base}dados-para-nerds/${path}${q}`
const wrap = (page: Page) => page.locator('[data-ciclo-block]:visible [data-panel="detalhe"] [data-set="participacao"] .nerds-tablewrap')
const rowsOf = (page: Page) => wrap(page).locator('tbody tr[data-row]:not([data-total]):not([hidden])')
const names = (page: Page) => wrap(page).locator('tbody tr:not([hidden]) th[scope="row"]')

async function enhanced(page: Page, path: string, q = '') {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(url(path, q))
  await wrap(page).scrollIntoViewIfNeeded()
  await expect(wrap(page)).toHaveAttribute('data-ready', 'yes')
}

const LEVELS = [
  { path: '', title: 'Quais são os números de cada região do Brasil?', first: 'Centro-Oeste' },
  { path: 'regiao/sudeste/', title: 'Quais são os números de cada estado da região Sudeste?', first: 'Rio de Janeiro' },
  { path: 'estado/rj/', title: 'Quais são os números de cada município de Rio de Janeiro?', first: 'Cidade Exemplo' },
]

test.describe('Tabela de detalhe (1440 px)', () => {
  for (const level of LEVELS) {
    test(`${level.path || 'brasil'}: upgrades in place, filters, sorts and keeps the total on the last row`, async ({ page }) => {
      await enhanced(page, level.path)
      await expect(page.locator('[data-ciclo-block]:visible [data-panel="detalhe"] h2')).toHaveText(level.title)
      await expect(names(page).first()).toContainText(level.first)
      await expect(wrap(page).locator('tbody tr[data-total]')).toBeVisible()
      // filter
      await wrap(page).locator('[data-filter]').fill(level.first.slice(1, 5).toLowerCase())
      await expect(rowsOf(page).first().locator('th')).toContainText(level.first)
      await wrap(page).locator('[data-filter]').fill('zzzz')
      await expect(rowsOf(page)).toHaveCount(0)
      await expect(wrap(page).locator('tbody tr[data-total]')).toBeVisible()
      await wrap(page).locator('[data-filter]').fill('')
      // sort by eleitorado, twice: the order flips, the total stays last
      const eleitorado = async () => (await wrap(page).locator('tbody tr[data-row]:not([data-total]):not([hidden]) td:nth-child(2)').allTextContents()).map((t) => Number(t.replace(/\./g, '')))
      await wrap(page).locator('[data-sort="1"]').click()
      const asc = await eleitorado()
      expect(asc).toEqual([...asc].sort((a, b) => a - b))
      await wrap(page).locator('[data-sort="1"]').click()
      const desc = await eleitorado()
      expect(desc).toEqual([...desc].sort((a, b) => b - a))
      await expect(wrap(page).locator('tbody tr').last()).toHaveAttribute('data-total', '')
    })
  }

  test('a região row opens into its UFs and an estado row into its municípios, indented, and closes again', async ({ page }) => {
    await enhanced(page, '')
    const sudeste = wrap(page).locator('tr[data-row="sudeste"]')
    await sudeste.locator('[data-open]').click()
    await expect(sudeste).toHaveAttribute('data-state', 'open')
    await expect(wrap(page).locator('tr[data-child-of="sudeste"] th')).toHaveText(['Rio de Janeiro', 'São Paulo'])
    await expect(wrap(page).locator('table')).toHaveAttribute('data-busy', '0')
    expect(await wrap(page).locator('tr[data-child-of="sudeste"] th').first().evaluate((el) => parseFloat(getComputedStyle(el).paddingLeft))).toBeGreaterThan(20)
    await sudeste.locator('[data-open]').click()
    await expect(sudeste).toHaveAttribute('data-state', 'closed')
    await expect(wrap(page).locator('tr[data-child-of]')).toHaveCount(0)

    await enhanced(page, 'regiao/sudeste/')
    const rj = wrap(page).locator('tr[data-row="rj"]')
    await rj.locator('[data-open]').click()
    await expect(rj).toHaveAttribute('data-state', 'open')
    await expect(wrap(page).locator('tr[data-child-of="rj"]')).toHaveCount(6)
  })

  test('the table chunk loads only from 1024 px up and only when the panel is in view', async ({ page }) => {
    const chunks: string[] = []
    page.on('request', (r) => /\/_astro\/.*(DetalheEnhancer)\.[^/]*\.js/.test(r.url()) && chunks.push(r.url()))
    await page.setViewportSize({ width: 1440, height: 300 })
    await page.goto(url('estado/rj/'))
    await page.waitForLoadState('networkidle')
    expect(chunks).toEqual([])
    await page.locator('[data-ciclo-block]:visible [data-panel="detalhe"] h2').scrollIntoViewIfNeeded()
    await expect(wrap(page)).toHaveAttribute('data-ready', 'yes')
    expect(chunks.length).toBeGreaterThan(0)
  })
})
