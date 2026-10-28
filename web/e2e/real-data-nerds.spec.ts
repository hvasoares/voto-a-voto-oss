import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import { expect, test } from '@playwright/test'
import { UF_NOME } from '../src/lib/uf-names'
import { base } from './helpers'

/*
 * "Dados para nerds" on the REAL dataset (G12): all 27 estados, 5 regiões and Brasil have a page, the printed figures equal the national totals published by the TSE
 * (data/manifest.json reference), the 27 UFs are linked on the map, and the largest estado (MG, 853 municípios) stays within the recorded budget.
 */
test.skip(!existsSync(resolve('../data/cities.csv')), 'no ../data')
test.use({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false })

const manifest = JSON.parse(readFileSync(resolve('../data/manifest.json'), 'utf8')) as { national_reference: Record<string, { comparecimento: number; validos: number; candidates: Record<string, number> }> }
const int = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')

test('every level has its page: Brasil, 5 regiões, 27 estados', async ({ request }) => {
  const urls = ['', ...['norte', 'nordeste', 'centro-oeste', 'sudeste', 'sul'].map((r) => `regiao/${r}/`), ...Object.keys(UF_NOME).filter((u) => u !== 'zz').map((u) => `estado/${u}/`)]
  expect(urls).toHaveLength(33)
  for (const u of urls) expect((await request.get(`${base}dados-para-nerds/${u}`)).status(), u).toBe(200)
})

test('Brasil prints the national figures published by the TSE for 2022 (comparecimento, brancos + nulos and votos válidos, both turnos)', async ({ page }) => {
  await page.goto(`${base}dados-para-nerds/?ciclo=2022&turno=1&cargo=presidente`)
  const block = page.locator('[data-ciclo-block="2022"]')
  const pct = (a: number, b: number) => `${(Math.round((a / b) * 1000) / 10).toFixed(1).replace('.', ',')}%`
  for (const turno of [1, 2]) {
    const ref = manifest.national_reference[`2022-${turno}`] as unknown as { aptos: number; comparecimento: number; validos: number; brancos: number; nulos: number }
    const dd = (key: string) => block.locator(`[data-panel="placar"] [data-stat="${key}"] dd[data-turno="${turno}"]`)
    await expect(dd('eleitorado')).toHaveAttribute('data-value', int(ref.aptos))
    await expect(dd('comparecimento')).toHaveAttribute('data-value', pct(ref.comparecimento, ref.aptos))
    await expect(dd('validos')).toHaveAttribute('data-value', pct(ref.validos, ref.comparecimento))
    await expect(dd('brancos_nulos')).toHaveAttribute('data-value', pct(ref.brancos + ref.nulos, ref.comparecimento))
  }
  await expect(page.locator('[data-signal="conferencia"] .nerds-signal__value')).toHaveText('Os números fecham')
  await expect(page.locator('[data-banner]')).toHaveCount(0)
})

test('the map shades 27 linked states on Brasil; each prints its value', async ({ page }) => {
  await page.goto(`${base}dados-para-nerds/`)
  const links = page.locator('[data-panel="mapa"] a[data-map-uf]')
  expect(await links.count()).toBe(27)
  for (const uf of Object.keys(UF_NOME).filter((u) => u !== 'zz')) await expect(page.locator(`[data-panel="mapa"] a[data-map-uf="${uf}"]`)).toContainText(/\d+,\d%/)
})

test('MG (the largest estado): the table is complete (853 municípios + total), the page stays within the recorded budget', async ({ page, request }) => {
  const res = await request.get(`${base}dados-para-nerds/estado/mg/`)
  const html = await res.text()
  const gz = gzipSync(html).length
  console.log(`MG page: ${html.length} bytes raw, ${gz} bytes gzip`)
  expect(gz).toBeLessThan(450_000)
  await page.goto(`${base}dados-para-nerds/estado/mg/`)
  const rows = page.locator('[data-ciclo-block="2026"] [data-panel="detalhe"] [data-set="participacao"] tbody tr')
  expect(await rows.count()).toBe(854)
  console.log(`MG DOM nodes: ${await page.evaluate(() => document.getElementsByTagName('*').length)}`)
  const wrap = page.locator('[data-ciclo-block="2026"] [data-panel="detalhe"] [data-set="participacao"] .nerds-tablewrap')
  await wrap.scrollIntoViewIfNeeded()
  await expect(wrap).toHaveAttribute('data-ready', 'yes')
  // paging keeps the table small: 25 municípios and the total are on screen
  expect(await wrap.locator('tbody tr:not([hidden])').count()).toBe(26)
  await expect(page.locator('[data-signal="conferencia"] .nerds-signal__value')).toHaveText('Os números fecham')
})
