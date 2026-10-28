import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import { base } from './helpers'

/*
 * The map panel at 1440 px (#78): static inline SVG (every state a link with a title and a text label, five-step numeric legend, region chips on Brasil), complete with scripts
 * off; from 1024 px, in view, the island adds the pickers and recolours. Waits are on `data-drawn` of the panel (the key of the view on screen).
 */
const url = (path = '', q = '') => `${base}dados-para-nerds/${path}${q}`
const panel = (page: Page) => page.locator('[data-panel="mapa"]')
const shardRows = (file: string, group: string) => {
  const s = JSON.parse(readFileSync(resolve('fixtures/data/nerds', file), 'utf8')) as { columns: string[]; [k: string]: unknown }
  const at = (n: string) => s.columns.indexOf(n)
  return (s[group] as (string | number)[][]).map((r) => ({ id: String(r[0]), eleitorado: Number(r[at('eleitorado')]), comparecimento: Number(r[at('comparecimento')]), abstencao: Number(r[at('abstencao')]) }))
}
const pct = (a: number, b: number) => `${(Math.round((a / b) * 1000) / 10).toFixed(1).replace('.', ',')}%`

test.describe('map panel, scripts off (1440 px)', () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } })

  test('Brasil: states that have a page are links with a title and a text label; the legend prints five steps; each region chip prints its value and links to the região', async ({ page }) => {
    await page.goto(url())
    const links = panel(page).locator('a[data-map-uf]')
    expect(await links.evaluateAll((els) => els.map((e) => e.getAttribute('data-map-uf')).sort())).toEqual(['mt', 'rj', 'sp'])
    for (const uf of ['rj', 'sp', 'mt']) {
      const a = panel(page).locator(`a[data-map-uf="${uf}"]`)
      expect(await a.getAttribute('href')).toBe(`${base}dados-para-nerds/estado/${uf}/`)
      expect(await a.locator('title').textContent()).toBeTruthy()
      expect(await a.locator('text').first().textContent()).toMatch(new RegExp(`^${uf.toUpperCase()}`))
      expect(await a.getAttribute('aria-label')).toMatch(/^[A-Z]{2} · .+: \d+,\d%, faixa /)
    }
    // the value is printed on the state, colour is not the only cue
    const rj = shardRows('brasil/2026-1.json', 'ufs').find((r) => r.id === 'rj')!
    await expect(panel(page).locator('a[data-map-uf="rj"]')).toContainText(pct(rj.comparecimento, rj.eleitorado))
    expect(await panel(page).locator('[data-legend] li').count()).toBe(5)
    expect((await panel(page).locator('[data-legend] .nerds-legend5__label').allTextContents()).every((t) => /%/.test(t))).toBe(true)
    const chips = panel(page).locator('[data-chips] a')
    expect(await chips.count()).toBe(2)
    const sudeste = shardRows('brasil/2026-1.json', 'regioes').find((r) => r.id === 'sudeste')!
    await expect(panel(page).locator('[data-chip="sudeste"]')).toContainText(pct(sudeste.comparecimento, sudeste.eleitorado))
    expect(await panel(page).locator('[data-chip="sudeste"] a').getAttribute('href')).toBe(`${base}dados-para-nerds/regiao/sudeste/`)
  })

  test('região: the região\'s states are the links, the others are drawn neutral and unlinked; estado: a slot with a link to the table', async ({ page }) => {
    await page.goto(url('regiao/sudeste/'))
    expect(await panel(page).locator('a[data-map-uf]').evaluateAll((els) => els.map((e) => e.getAttribute('data-map-uf')).sort())).toEqual(['rj', 'sp'])
    await expect(panel(page).locator('[data-chips]')).toHaveCount(0)
    await expect(panel(page).locator('g[data-map-uf="mt"]')).toHaveAttribute('aria-disabled', 'true')
    await page.goto(url('estado/rj/'))
    await expect(panel(page).locator('[data-map-slot]')).toContainText('Mapa dos municípios')
    expect(await panel(page).locator('[data-map-slot] [data-to-table]').getAttribute('href')).toBe('#c2026-detalhe-t')
    await expect(panel(page).locator('[data-map]')).toHaveCount(0)
  })
})

test.describe('map panel, island (1440 px)', () => {
  test('a state link opens the estado level through the address', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(url())
    await panel(page).locator('a[data-map-uf="rj"] path').click()
    await expect(page).toHaveURL(new RegExp('dados-para-nerds/estado/rj/$'))
  })

  test('the pickers recolour the map, print the new values and keep the choice in the address; the address reopens it', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(url())
    await panel(page).scrollIntoViewIfNeeded()
    await expect(panel(page)).toHaveAttribute('data-drawn', '2026-1-comparecimento')
    const before = await panel(page).locator('a[data-map-uf="rj"] path').evaluate((el) => (el as SVGElement).style.fill)
    await panel(page).locator('[data-measure-option="abstencao"]').click()
    await expect(panel(page)).toHaveAttribute('data-drawn', '2026-1-abstencao')
    const rj = shardRows('brasil/2026-1.json', 'ufs').find((r) => r.id === 'rj')!
    await expect(panel(page).locator('a[data-map-uf="rj"]')).toContainText(pct(rj.abstencao, rj.eleitorado))
    await panel(page).locator('[data-turno-option="2"]').click()
    await expect(panel(page)).toHaveAttribute('data-drawn', '2026-2-abstencao')
    const rj2 = shardRows('brasil/2026-2.json', 'ufs').find((r) => r.id === 'rj')!
    await expect(panel(page).locator('a[data-map-uf="rj"]')).toContainText(pct(rj2.abstencao, rj2.eleitorado))
    await expect(panel(page).locator('[data-map-caption]')).toHaveText('Abstenção, 2º turno de 2026')
    expect(new URL(page.url()).searchParams.get('medida')).toBe('abstencao')
    expect(new URL(page.url()).searchParams.get('turno')).toBe('2')
    expect(before).toMatch(/rgb|#/)
    await page.goto(url('', '?ciclo=2022&turno=1&cargo=presidente&medida=validos'))
    await panel(page).scrollIntoViewIfNeeded()
    await expect(panel(page)).toHaveAttribute('data-drawn', '2022-1-validos')
    await expect(panel(page).locator('[data-measure-option="validos"]')).toHaveAttribute('aria-pressed', 'true')
  })

  test('keyboard selection: a state takes focus with a visible ring and its value is read out', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(url())
    await panel(page).scrollIntoViewIfNeeded()
    await expect(panel(page)).toHaveAttribute('data-drawn', /./)
    const rj = panel(page).locator('a[data-map-uf="rj"]')
    await rj.focus()
    await expect(panel(page).locator('[data-readout]')).toContainText('RJ · Rio de Janeiro')
    expect(await rj.locator('path').evaluate((el) => getComputedStyle(el).strokeWidth)).toBe('3px')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(new RegExp('dados-para-nerds/estado/rj/$'))
  })

  test('the island loads only from 1024 px up and only when in view; the inline SVG costs a recorded amount of HTML', async ({ page }) => {
    const chunks: string[] = []
    page.on('request', (r) => /\/_astro\/.*(MapaEnhancer)\.[^/]*\.js/.test(r.url()) && chunks.push(r.url()))
    await page.setViewportSize({ width: 1440, height: 300 })
    await page.goto(url())
    await page.waitForLoadState('networkidle')
    expect(chunks).toEqual([])
    await page.locator('[data-panel="mapa"] h2').scrollIntoViewIfNeeded()
    await expect(panel(page)).toHaveAttribute('data-drawn', /./)
    expect(chunks.length).toBeGreaterThan(0)
    const html = await (await page.request.get(url())).text()
    const svg = html.match(/<svg class="uf-map"[\s\S]*?<\/svg>/)![0]
    console.log(`map SVG (Brasil): ${svg.length} bytes raw, ${gzipSync(svg).length} bytes gzip`)
  })
})
