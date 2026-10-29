import { expect, test } from '@playwright/test'
import { base } from './helpers'
import { dataGuard } from './presets'

/*
 * "Ficaram em casa" (#32) on the REAL dataset (run with `npm run test:real`). The claim of each cycle and round is the line "Brasil (sem exterior)"
 * of docs/nonvoters-vs-margin.md (the unit test pins the same six numbers against the dataset); the percentages below are the sums of data/turnout.csv.
 */
test.skip(...dataGuard())

const PATH = `${base}mapa/ficaram-em-casa/`
const CLAIMS = [
  ['', 2026, 1, '52,5'],
  ['2026-2/', 2026, 2, '46,7'],
  ['2022-1/', 2022, 1, '56,6'],
  ['2022-2/', 2022, 2, '53,3'],
  ['2018-1/', 2018, 1, '59,6'],
  ['2018-2/', 2018, 2, '55,2'],
] as const

test.describe('Ficaram em casa on the real dataset', () => {
  test('27 states, no overseas, a percentage on each tile, SP first with the note figures', async ({ page }) => {
    await page.goto(PATH)
    const ufs = await page.locator('[data-slot="state-map"] nav a[data-uf]').evaluateAll((els) => els.map((e) => e.getAttribute('data-uf')!))
    expect(ufs).toHaveLength(27)
    expect(ufs).not.toContain('zz')
    await expect(page.locator('a[data-uf="sp"]', { hasText: 'SP' })).toContainText('27,1%')
    await expect(page.locator('a[data-uf="ac"]', { hasText: 'AC' })).toContainText('23,6%')
    await expect(page.locator('a[data-uf="df"]', { hasText: 'DF' })).toContainText('21,5%')
    await expect(page.locator('[data-slot="mapa-selecionado"]')).toContainText('SP · selecionado')
  })

  for (const [slug, ano, turno, pct] of CLAIMS) {
    test(`${ano}, ${turno}º turno: the claim is "${pct}%" of the cities, with its limits`, async ({ page }) => {
      await page.goto(`${PATH}${slug}`)
      await expect(page.locator('[data-slot="stayhome-claim"]')).toContainText(`Em ${pct}% das cidades, o número de pessoas que não votaram em ninguém foi maior do que a diferença de votos entre os dois primeiros (${turno}º turno de ${ano}).`)
      await expect(page.locator('[data-slot="stayhome-claim"]')).toContainText('nem que o resultado teria sido outro')
      await expect(page.locator('main')).not.toContainText(/em todo o país|na maioria das cidades/)
    })
  }
})
