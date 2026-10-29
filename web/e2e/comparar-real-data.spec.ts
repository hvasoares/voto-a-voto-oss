import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { base } from './helpers'
import { dataGuard } from './presets'
import { candidateName, candidateVotes, dec1, int, signedInt, statesByValidVotes, turnoutSum, twoWayShare } from './real-data-oracle'

/*
 * The compare pages against the real committed dataset (run with `npm run test:real`, DATA_DIR=../data). Every figure is counted by the
 * oracle from the data directory: the six states with the most valid votes in 2026, in that order, each with its valid votes and each
 * candidate's two-way share and vote change against the earlier cycle (frames site/reference/11 and 11b).
 */
test.skip(...dataGuard('votes.csv'))

const NOW = { ano: 2026, turno: 2 }
/** The second finalist of each cycle's runoff (the first is always 13). */
const SECOND_FINALIST: Record<number, string> = { 2018: '17', 2022: '22', 2026: '22' }
/** One side of a state row: "46,2% · 2022: 44,8% · +599.392 votos" (two-way share now and then, and the change in votes). */
function side(uf: string, ano: number, who: 'lula' | 'flavio'): string {
  const pair = (year: number) => (who === 'lula' ? ['13', SECOND_FINALIST[year]!] : [SECOND_FINALIST[year]!, '13']) as [string, string]
  const [own, other] = pair(2026)
  const [ownBefore, otherBefore] = pair(ano)
  const before = { ano, turno: 2 }
  return `${dec1(twoWayShare(NOW, own, other, { uf }))}% · ${ano}: ${dec1(twoWayShare(before, ownBefore, otherBefore, { uf }))}% · ${signedInt(candidateVotes(NOW, own, { uf }) - candidateVotes(before, ownBefore, { uf }))} votos`
}

test.describe('compare pages on the real dataset', () => {
  test('frame 11: six rows in order, with the figures of the 2022 comparison', async ({ page }) => {
    await page.goto(`${base}comparar/2022/`)
    const six = statesByValidVotes(NOW).slice(0, 6)
    const rows = page.locator('[data-component="compare-rows"] > li')
    await expect(rows).toHaveCount(6)
    const ufs = await rows.evaluateAll((els) => els.map((e) => e.getAttribute('data-uf')))
    expect(ufs).toEqual(six)
    for (const [i, uf] of six.slice(0, 2).entries()) {
      await expect(rows.nth(i)).toContainText(`${int(turnoutSum(NOW, { uf }).validos)} votos válidos`)
      await expect(rows.nth(i).locator('[data-side="Lula"]')).toContainText(side(uf, 2022, 'lula'))
      await expect(rows.nth(i).locator('[data-side="Flávio"]')).toContainText(side(uf, 2022, 'flavio'))
    }
  })

  test('frame 11b: the 2018 page compares the two biggest states with the 2018 finalists', async ({ page }) => {
    await page.goto(`${base}comparar/2018/`)
    const rows = page.locator('[data-component="compare-rows"] > li')
    for (const [i, uf] of statesByValidVotes(NOW).slice(0, 2).entries()) {
      await expect(rows.nth(i).locator('[data-side="Lula"]')).toContainText(side(uf, 2018, 'lula'))
      await expect(rows.nth(i).locator('[data-side="Flávio"]')).toContainText(side(uf, 2018, 'flavio'))
    }
    // and the intro names the 2018 candidates as the frame does
    const name = (numero: string) => candidateName({ ano: 2018, turno: 2 }, numero)
    await expect(page.locator('[data-component="intro"]')).toContainText(`Candidatos de 2018: Fernando Haddad (13) e Jair Bolsonaro (17).`)
    expect([name('13'), name('17')]).toEqual(['FERNANDO HADDAD', 'JAIR BOLSONARO'])
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