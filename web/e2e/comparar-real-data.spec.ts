import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { base } from './helpers'

/*
 * The compare pages against the real committed dataset (run with `npm run test:real`,
 * DATA_DIR=../data). Every figure below is a figure of the Sketch frames (site/reference/11 and
 * 11b): SP "26.258.452 votos válidos", "Lula 46,2% · 2022: 44,8% · +599.392 votos", etc.
 */
test.skip(!existsSync(resolve('../data/votes.csv')), 'no ../data')

test.describe('compare pages on the real dataset', () => {
  test('frame 11: six rows in order, with the SP figures of the frame', async ({ page }) => {
    await page.goto(`${base}comparar/2022/`)
    const rows = page.locator('[data-component="compare-rows"] > li')
    await expect(rows).toHaveCount(6)
    const ufs = await rows.evaluateAll((els) => els.map((e) => e.getAttribute('data-uf')))
    expect(ufs).toEqual(['sp', 'mg', 'rj', 'ba', 'pr', 'rs'])
    const sp = rows.nth(0)
    await expect(sp).toContainText('26.258.452 votos válidos')
    await expect(sp.locator('[data-side="Lula"]')).toContainText('46,2% · 2022: 44,8% · +599.392 votos')
    await expect(sp.locator('[data-side="Flavio"]')).toContainText('53,8% · 2022: 55,2% · -77.409 votos')
    const mg = rows.nth(1)
    await expect(mg).toContainText('12.592.885 votos válidos')
    await expect(mg.locator('[data-side="Lula"]')).toContainText('50,4% · 2022: 50,2% · +160.139 votos')
  })

  test('frame 11b: the 2018 page pins SP and MG of the frame', async ({ page }) => {
    await page.goto(`${base}comparar/2018/`)
    const rows = page.locator('[data-component="compare-rows"] > li')
    const sp = rows.nth(0)
    await expect(sp.locator('[data-side="Lula"]')).toContainText('46,2% · 2018: 32,0% · +4.907.142 votos')
    await expect(sp.locator('[data-side="Flavio"]')).toContainText('53,8% · 2018: 68,0% · -1.166.845 votos')
    const mg = rows.nth(1)
    await expect(mg.locator('[data-side="Lula"]')).toContainText('50,4% · 2018: 41,8% · +1.968.147 votos')
    await expect(mg.locator('[data-side="Flavio"]')).toContainText('49,6% · 2018: 58,2% · +141.679 votos')
    // and the intro names the 2018 candidates exactly as the frame does
    await expect(page.locator('[data-component="intro"]')).toContainText('Candidatos de 2018: o do PT (13) e Bolsonaro (17).')
  })
})

test.describe('capture the compare pages on the real dataset', () => {
  for (const route of ['/comparar/2022/', '/comparar/2018/']) {
    test(`capture ${route} / real data`, async ({ page }) => {
      await page.goto(`${base}${route.slice(1)}`)
      await page.evaluate(() => document.fonts.ready)
      const dir = resolve('.captures', 'comparar')
      mkdirSync(dir, { recursive: true })
      const name = route.endsWith('2018/') ? '2018' : '2022'
      const file = resolve(dir, `${name}-real.png`)
      await page.screenshot({ path: file, fullPage: true, animations: 'disabled' })
      writeFileSync(
        resolve(dir, `${name}-real.json`),
        JSON.stringify({ slot: `comparar-${name}`, state: 'real-data', route, viewport: page.viewportSize(), fullPage: true, note: 'DATA_DIR=../data; figures pinned by the frame tests above', capture: file }, null, 2) + '\n',
      )
    })
  }
})