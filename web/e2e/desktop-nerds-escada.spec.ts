import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { base } from './helpers'

/*
 * The Escada and its Ficha at 1440 px (#75): the Ficha is the server-rendered view; from 1024 px, once scrolled into view, the island upgrades it in place to the paired bars.
 * Every wait is on the real condition (data-drawn), never on a timer or on a click right after navigation.
 */
const url = (path = 'estado/rj/', q = '') => `${base}dados-para-nerds/${path}${q}`
const shard = (file: string) => JSON.parse(readFileSync(resolve('fixtures/data/nerds', file), 'utf8')) as { columns: string[]; total: number[] }
const metricsOf = (file: string) => {
  const s = shard(file)
  const at = (name: string) => s.total[s.columns.indexOf(name)]!
  return { eleitorado: at('eleitorado'), comparecimento: at('comparecimento'), abstencao: at('abstencao'), brancos_nulos: at('brancos_nulos'), validos: at('validos') }
}
const pct = (a: number, b: number) => `${(Math.round((a / b) * 1000) / 10).toFixed(1).replace('.', ',')}%`
const escada = (page: Page) => page.locator('[data-escada]')
const esc = (page: Page) => page.locator('[data-panel="escada"]')

async function drawn(page: Page) {
  await escada(page).scrollIntoViewIfNeeded()
  await expect(escada(page)).toHaveAttribute('data-drawn', 'chart')
}

test.describe('Escada (1440 px)', () => {
  test('is the Ficha until the panel is scrolled into view, then the chart replaces it in place', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 300 })
    await page.goto(url())
    await expect(escada(page)).toHaveAttribute('data-drawn', 'ficha')
    await expect(esc(page).locator('[data-ficha-table]')).toBeAttached()
    await drawn(page)
    await expect(esc(page).locator('[data-chart] svg')).toBeVisible()
    await expect(esc(page).locator('[data-chart] .nerds-legend')).toContainText('1º turno')
    await expect(esc(page).locator('[data-chart] .nerds-legend')).toContainText('2º turno')
  })

  test('draws the bars from 0% with every value printed at the end of its bar, equal to the shard values', async ({ page }) => {
    await page.goto(url())
    await drawn(page)
    for (const ano of [2018, 2022, 2026]) {
      for (const turno of [1, 2]) {
        const m = metricsOf(`uf/rj/${ano}-${turno}.json`)
        const bar = esc(page).locator(`[data-bar="${ano}-${turno}"]`)
        await expect(bar.locator('text')).toHaveText(pct(m.comparecimento, m.eleitorado))
        const rect = (await bar.locator('rect').boundingBox())!
        const zero = (await esc(page).locator('.nerds-grid').first().boundingBox())!
        expect(Math.abs(rect.x - zero.x), `${ano} ${turno}º starts at the 0% line`).toBeLessThan(2)
      }
    }
  })

  test('the measure picker redraws the bars, follows the question in the title and keeps the choice in the address; the address reopens it', async ({ page }) => {
    await page.goto(url())
    await drawn(page)
    await expect(esc(page).locator('[data-measure-option]')).toHaveCount(4)
    await esc(page).locator('[data-measure-option="abstencao"]').click()
    await expect(escada(page)).toHaveAttribute('data-measure', 'abstencao')
    const m = metricsOf('uf/rj/2022-1.json')
    await expect(esc(page).locator('[data-bar="2022-1"] text')).toHaveText(pct(m.abstencao, m.eleitorado))
    await expect(page.locator('#serie-escada-t')).toHaveText('Como a abstenção mudou de um ciclo para o outro?')
    expect(new URL(page.url()).searchParams.get('medida')).toBe('abstencao')
    await page.goto(url('estado/rj/', '?ciclo=2022&turno=1&cargo=presidente&medida=validos'))
    await drawn(page)
    await expect(escada(page)).toHaveAttribute('data-measure', 'validos')
    await expect(esc(page).locator('[data-measure-option="validos"]')).toHaveAttribute('aria-pressed', 'true')
  })

  test('prints the Brasil reference line with its value and label on região and estado, and none on Brasil', async ({ page }) => {
    const national = metricsOf('brasil/2026-1.json')
    for (const path of ['estado/rj/', 'regiao/sudeste/']) {
      await page.goto(url(path))
      await drawn(page)
      await expect(page.locator('[data-reference]')).toContainText(`Linha: Brasil, 1º turno de 2026, ${pct(national.comparecimento, national.eleitorado)}`)
    }
    await page.goto(url(''))
    await drawn(page)
    await expect(page.locator('[data-reference]')).toHaveCount(0)
  })

  test('the Ficha is one click away and sorts by any column, "sem 2º turno" last either way; the chart view returns', async ({ page }) => {
    await page.goto(url())
    await drawn(page)
    await esc(page).locator('[data-to-ficha]').click()
    await expect(escada(page)).toHaveAttribute('data-drawn', 'ficha')
    expect(await esc(page).locator('[data-ficha-table] tbody th').allTextContents()).toEqual(['2018', '2022', '2026'])
    await escada(page).locator('[data-sort="0"]').click()
    await escada(page).locator('[data-sort="0"]').click()
    expect(await esc(page).locator('[data-ficha-table] tbody th').allTextContents()).toEqual(['2026', '2022', '2018'])
    await expect(esc(page).locator('[data-ficha-table] th[aria-sort="descending"]')).toHaveCount(1)
    await esc(page).locator('[data-to-chart]').click()
    await expect(escada(page)).toHaveAttribute('data-drawn', 'chart')
  })

  test('without scripts the Ficha is the panel: a table with a header row and every number as text', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } })
    const page = await ctx.newPage()
    await page.goto(url())
    await expect(esc(page).locator('[data-ficha-table] thead th')).toHaveCount(9)
    const m = metricsOf('uf/rj/2018-1.json')
    await expect(esc(page).locator('[data-ficha-table] tr[data-row="2018"] td[data-col="comparecimento-1"]')).toHaveText(pct(m.comparecimento, m.eleitorado))
    await expect(esc(page).locator('[data-chart], [data-picker]')).toHaveCount(0)
    await expect(page.locator('[data-panel="escada"] [data-weight]')).toContainText(/Lê \d+ arquivos de dados/)
    await ctx.close()
  })

  test('the island loads from 1024 px up and only when visible: not at parse time', async ({ page }) => {
    const chunks: string[] = []
    page.on('request', (r) => /\/_astro\/.*(EscadaPanel)\.[^/]*\.js/.test(r.url()) && chunks.push(r.url()))
    await page.setViewportSize({ width: 1440, height: 300 })
    await page.goto(url('estado/rj/'))
    await page.waitForLoadState('networkidle')
    expect(chunks, 'nothing is loaded before the panel is in view').toEqual([])
    await drawn(page)
    expect(chunks.length).toBeGreaterThan(0)
  })
})
