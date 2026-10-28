import { expect, test } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { base } from './helpers'

/*
 * Sinais and Invariantes (#77): the strip and the list on every level, complete without scripts; and a CORRUPTED copy of the fixture shards, built into its own directory, shows the
 * failure on the page (banner first, strip, list, panels labelled "não conferido").
 */
const url = (path: string) => `${base}dados-para-nerds/${path}`

test.describe('Sinais and Invariantes', () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } })

  for (const [path, own] of [['', true], ['regiao/sudeste/', false], ['estado/rj/', false]] as const) {
    test(`${path || 'brasil'}: a minimal strip when all pass, and the list of rules with ✓ Passou, complete without scripts`, async ({ page }) => {
      await page.goto(url(path))
      await expect(page.locator('[data-banner]')).toHaveCount(0)
      expect(await page.locator('[data-strip] [data-signal]').evaluateAll((els) => els.map((e) => e.getAttribute('data-signal')))).toEqual(['cobertura', 'conferencia', 'edicao'])
      await expect(page.locator('[data-signal="conferencia"] .nerds-signal__value')).toHaveText('Os números fecham')
      await expect(page.locator('[data-signal="edicao"] .nerds-signal__value')).toContainText('é a mais recente')
      await expect(page.locator('[data-signal="cobertura"] .nerds-signal__note')).toContainText('seções apuradas não constam')
      const rules = page.locator('[data-invariantes] tbody tr')
      expect(await rules.count()).toBeGreaterThanOrEqual(5)
      const passed = await rules.locator('th').allTextContents()
      expect(passed.filter((t) => t === '✓ Passou').length).toBeGreaterThanOrEqual(5)
      const seções = page.locator('[data-invariantes] tr[data-row="secoes"]')
      await expect(seções).toHaveCount(own ? 1 : 0)
      if (own) await expect(seções.locator('th')).toHaveText('Não conferido')
      await expect(page.locator('[data-invariantes] [data-all-rules]')).toHaveCount(own ? 0 : 1)
      for (const f of ['definicao', 'fonte', 'calculo', 'naoMede']) await expect(page.locator(`[data-invariantes] [data-field="${f}"]`)).not.toBeEmpty()
      await expect(page.locator('[data-unchecked]')).toHaveCount(0)
    })
  }

  test('region and estado link to the full list on Brasil', async ({ page }) => {
    await page.goto(url('estado/rj/'))
    await page.locator('[data-all-rules]').click()
    await expect(page).toHaveURL(new RegExp('dados-para-nerds/#invariantes$'))
    await expect(page.locator('[data-invariantes]')).toBeVisible()
  })
})

test.describe('a corrupted shard shows on the page', () => {
  test.describe.configure({ mode: 'serial' })
  let out: string
  test.beforeAll(() => {
    test.setTimeout(240_000)
    const tmp = mkdtempSync(resolve(tmpdir(), 'nerds-corrupt-'))
    cpSync(resolve('fixtures'), resolve(tmp, 'fixtures'), { recursive: true })
    const file = resolve(tmp, 'fixtures/data/nerds/uf/rj/2022-1.json')
    const shard = JSON.parse(readFileSync(file, 'utf8')) as { columns: string[]; municipios: number[][] | unknown[][] }
    const at = shard.columns.indexOf('comparecimento')
    ;(shard.municipios[0] as number[])[at] += 7
    writeFileSync(file, JSON.stringify(shard))
    out = resolve(tmp, 'dist')
    execFileSync('npx', ['astro', 'build'], { env: { ...process.env, DATA_DIR: resolve(tmp, 'fixtures/data'), OUT_DIR: out, SITE_BASE: base }, stdio: 'pipe', timeout: 200_000 })
  })
  test.afterAll(() => rmSync(resolve(out, '..'), { recursive: true, force: true }))

  test('the banner leads the page, the strip and the list name the failing rule, and the affected cycle is labelled "não conferido"', async ({ page }) => {
    const html = readFileSync(resolve(out, 'dados-para-nerds/estado/rj/index.html'), 'utf8')
    await page.route(`**${base}dados-para-nerds/estado/rj/`, (route) => route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html }))
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(url('estado/rj/'))
    const banner = page.locator('[data-banner]')
    await expect(banner).toContainText('Soma dos municípios = Rio de Janeiro')
    const order = await page.locator('main > *').evaluateAll((els) => els.map((e) => e.getAttribute('data-banner') !== null ? 'banner' : e.className))
    expect(order.indexOf('banner')).toBeLessThan(order.indexOf('nerds-how'))
    await expect(page.locator('[data-signal="conferencia"]')).toHaveAttribute('data-ok', 'false')
    await expect(page.locator('[data-signal="conferencia"] .nerds-signal__value')).toContainText('falh')
    const failing = page.locator('[data-invariantes] tr[data-row="soma-filhos"]')
    await expect(failing.locator('th')).toHaveText('Falhou')
    await expect(failing).toContainText('2022, 1º turno')
    await expect(page.locator('[data-ciclo-block="2022"] [data-unchecked]').first()).toBeAttached()
    await expect(page.locator('[data-ciclo-block="2026"] [data-unchecked]')).toHaveCount(0)
    // the page stays usable: the numbers are still there
    await expect(page.locator('[data-ciclo-block="2022"] [data-stat="eleitorado"]')).toBeAttached()
  })
})
