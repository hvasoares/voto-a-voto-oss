import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { base, collectRequests } from './helpers'
import { PHONE, DESKTOP, UNDER_BREAKPOINT, noJs } from './presets'

/*
 * "Dados para nerds" at the estado level (#73) over the fixture dataset: the Placar printed from the level shards, "Como ler", the four-field provenance footer, the entry point on
 * the Estado page, the page complete without scripts, and nothing a phone should not load (no island, no chart code).
 */
const shardFile = (uf: string, ano: number, turno: number) => resolve('fixtures/data/nerds/uf', uf, `${ano}-${turno}.json`)
const shard = (uf: string, ano: number, turno: number) => JSON.parse(readFileSync(shardFile(uf, ano, turno), 'utf8')) as { total: (number | string | null)[] }
const int = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
const pct = (a: number, b: number) => `${(Math.round((a / b) * 1000) / 10).toFixed(1).replace('.', ',')}%`
// total = [id, nome, eleitorado, comparecimento, abstencao, brancos_nulos, validos, nao_instalados, ...votos]
const figures = (uf: string, ano: number, turno: number) => {
  const t = (shard(uf, ano, turno).total as number[]).slice(2)
  const [aptos, comp, abst, bn, val] = [t[0]!, t[1]!, t[2]!, t[3]!, t[4]!]
  return { eleitorado: int(aptos), comparecimento: pct(comp, aptos), abstencao: pct(abst, aptos), brancos_nulos: pct(bn, comp), validos: pct(val, comp) }
}
const url = (uf = 'rj', q = '') => `${base}dados-para-nerds/estado/${uf}/${q}`

test.describe('Dados para nerds: estado, Placar', () => {
  for (const uf of ['rj', 'sp']) {
    test(`prints the shard values of ${uf} for both turnos of every cycle (golden data)`, async ({ page }) => {
      await page.goto(url(uf))
      for (const ano of [2018, 2022, 2026]) {
        const block = page.locator(`[data-ciclo-block="${ano}"]`)
        for (const turno of [1, 2]) {
          const want = figures(uf, ano, turno)
          for (const [key, text] of Object.entries(want)) {
            const dd = block.locator(`[data-stat="${key}"] dd[data-turno="${turno}"]`)
            expect(await dd.getAttribute('data-value'), `${uf} ${ano} ${turno}º ${key}`).toBe(text)
          }
        }
      }
    })
  }

  test('says "sem 2º turno" instead of zero where a turno did not happen, and the seções apuradas card says the data does not carry them', async ({ page }) => {
    // Boa Esperança do Norte only exists in 2026, so mt has no shard at all for 2018 and 2022: the page has only the 2026 block.
    await page.goto(url('mt'))
    await expect(page.locator('[data-ciclo-block]')).toHaveCount(1)
    await expect(page.locator('[data-stat="secoes"] [data-unavailable]').first()).toHaveText('não consta nos dados publicados')
  })

  test('opens on the latest cycle; ?ciclo= shows the cycle asked for; an unknown value falls back with a visible note; no storage is written', async ({ page }) => {
    await page.goto(url('rj'))
    await expect(page.locator('[data-page="nerds"]')).toHaveAttribute('data-ready', 'yes')
    await expect(page.locator('[data-ciclo-block]:visible')).toHaveCount(1)
    await expect(page.locator('[data-ciclo-block]:visible')).toHaveAttribute('data-ciclo-block', '2026')
    await page.goto(url('rj', '?ciclo=2018&turno=1&cargo=presidente'))
    await expect(page.locator('[data-page="nerds"]')).toHaveAttribute('data-ready', 'yes')
    await expect(page.locator('[data-ciclo-block]:visible')).toHaveAttribute('data-ciclo-block', '2018')
    await expect(page.locator('[data-cycle-link="2018"]')).toHaveAttribute('aria-current', 'true')
    await page.goto(url('rj', '?ciclo=1990'))
    await expect(page.locator('[data-page="nerds"]')).toHaveAttribute('data-ready', 'yes')
    await expect(page.locator('[data-notes]')).toBeVisible()
    await expect(page.locator('[data-notes]')).toContainText('mostrando 2026')
    expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0])
  })

  test('has a collapsible "Como ler" and the four-field footer on every panel, with the edition and its date and no interpretation', async ({ page }) => {
    await page.goto(url('rj'))
    const how = page.locator('[data-how]')
    await expect(how).not.toHaveAttribute('open', '')
    await how.locator('summary').click()
    await expect(how).toContainText('Não explica por que')
    await expect(how).toContainText('sem 2º turno')
    const footer = page.locator('[data-ciclo-block="2026"] [data-panel="placar"] [data-panel-footer]')
    expect(await footer.locator('dt').allTextContents()).toEqual(['Definição', 'Fonte', 'Cálculo', 'Não mede'])
    await expect(footer.locator('[data-field="fonte"]')).toContainText(/edição \d{2}\/\d{2}\/\d{4} \(\d{4}-\d{2}-\d{2}\)/)
    await expect(page.locator('[data-ciclo-block="2026"] [data-panel="placar"] h2')).toHaveText('Quantos eleitores podiam votar, e quantos votaram?')
  })

  test('is complete without scripts: every cycle is in the page, every number is text', async ({ browser }) => {
    const ctx = await browser.newContext({ ...noJs(), viewport: DESKTOP })
    const page = await ctx.newPage()
    await page.goto(url('rj'))
    await expect(page.locator('[data-ciclo-block]:visible')).toHaveCount(3)
    const want = figures('rj', 2022, 2)
    const text = await page.locator('[data-ciclo-block="2022"] [data-stat="comparecimento"] dd[data-turno="2"]').innerText()
    expect(text).toContain(want.comparecimento)
    await expect(page.locator('[data-ciclo-block="2022"] [data-stat="eleitorado"] dd[data-turno="1"]')).toContainText(figures('rj', 2022, 1).eleitorado)
    await ctx.close()
  })

  test('a phone loads no chart code: the islands are not requested below 1024 px (and their markup is the plain table)', async ({ page }) => {
    for (const size of [PHONE, UNDER_BREAKPOINT]) {
      await page.setViewportSize(size)
      const seen = collectRequests(page)
      await page.goto(url('rj'))
      await expect(page.locator('[data-page="nerds"]')).toHaveAttribute('data-ready', 'yes')
      await page.locator('[data-series]').scrollIntoViewIfNeeded()
      await page.waitForLoadState('networkidle')
      expect(seen.map((r) => r.url).filter((u) => /Escada|client\.|react|chart|d3|recharts|plot/i.test(u)), String(size.width)).toEqual([])
      await expect(page.locator('[data-escada]'), String(size.width)).toHaveAttribute('data-drawn', 'ficha')
      expect(await page.locator('[data-ficha-table] tbody tr').count()).toBe(3)
      expect(await page.locator('svg.nerds-bars').count()).toBe(0)
    }
  })
})

test.describe('Dados para nerds: the Estado page entry point', () => {
  test('"Dados para nerds ›" sits after "Comparar com outro estado" and before the story and recap links, opens the dashboard and shows a focus ring from the keyboard', async ({ page }) => {
    await page.goto(`${base}rj/`)
    const links = page.locator('.state-links a')
    const labels = await links.allTextContents()
    const i = labels.indexOf('Dados para nerds ›')
    expect(i).toBeGreaterThan(0)
    expect(labels[i - 1]).toBe('Comparar com outro estado ›')
    // the state story (#100) sits right before the recap; nerds keeps its place after "Comparar"
    if (labels[i + 1] !== undefined) expect(['Ver a história do estado ›', 'Resumo do estado ›']).toContain(labels[i + 1])
    const link = page.locator('.state-links a[data-link="nerds"]')
    expect(await link.getAttribute('href')).toBe(`${base}dados-para-nerds/estado/rj/`)
    await link.focus()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    await expect(link).toBeFocused()
    expect(await link.evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe('none')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(new RegExp(`dados-para-nerds/estado/rj/$`))
    await expect(page.locator('h1')).toHaveText('Dados para nerds')
  })
})
