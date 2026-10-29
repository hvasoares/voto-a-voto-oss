import { expect, test } from '@playwright/test'
import { base } from './helpers'
import { dataGuard } from './presets'
import { cohortReport, int, placeLabel, shareText } from './real-data-oracle'

/*
 * The cohort report on the REAL dataset (run with `npm run test:real`, DATA_DIR=../data), ticket #15.
 * The cohorts (who won each city in the 2018 and 2022 runoffs, and what the city did in 2026) are counted by the
 * oracle from the data directory's votes.csv and turnout.csv, not typed; the headings and sentences are the page's.
 */
test.skip(...dataGuard())

const NAME_2026: Record<string, string> = { '13': 'Lula', '22': 'Flávio' }

const path = base + 'relatorios/como-cada-grupo-votou/'

const G = (index: number) => `[data-component="group-card"]:nth-of-type(${index})`

test.describe('cohort report on the real dataset', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(path)
  })

  test('the four cohorts, with sizes and valid votes', async ({ page }) => {
    const { cohorts } = cohortReport()
    const cards = page.locator('[data-component="group-card"]')
    await expect(cards).toHaveCount(cohorts.length)
    const metas = await page.locator('[data-component="group-meta"]').allTextContents()
    expect(metas).toEqual(cohorts.map((c) => `${int(c.cities)} cidades · ${int(c.validos)} votos válidos (2º turno 2026)`))
  })

  test('the cards read as the frame does, with the 2026 runoff in the bars', async ({ page }) => {
    const { cohorts } = cohortReport()
    for (const [i, c] of cohorts.entries()) {
      const card = G(i + 1)
      const person2022 = c.camp2022 === 'PT' ? 'Lula' : 'Bolsonaro'
      await expect(page.locator(`${card} h2`)).toHaveText(c.camp2018 === c.camp2022 ? `Venceu em 2018 e 2022: ${c.camp2018}` : `Venceu em 2018: ${c.camp2018}. Em 2022: ${person2022}`)
      // Legend in election order (13 first), as the frame draws it — winner or not.
      const bars = [c.lula, c.flavio]
      await expect(page.locator(`${card} [data-component="group-part"]`)).toHaveText([`Lula ${shareText(bars, 0)}% (${int(c.lula)})`, `Flávio ${shareText(bars, 1)}% (${int(c.flavio)})`])
    }
  })

  test('a 2026 tie is a note on its card, not dropped', async ({ page }) => {
    const { cohorts } = cohortReport()
    const tied = cohorts.filter((c) => c.ties2026 > 0)
    await expect(page.locator('[data-component="group-tie"]')).toHaveCount(tied.length)
    for (const c of tied) {
      const n = c.ties2026
      const note = `${n === 1 ? '1 cidade empatou' : `${int(n)} cidades empataram`} no 2º turno de 2026 e ${n === 1 ? 'não está' : 'não estão'} nas barras: ${int(c.cities)} cidades = ${int(c.lula)} + ${int(c.flavio)} + ${int(n)} ${n === 1 ? 'empatada' : 'empatadas'}.`
      await expect(page.locator(`${G(cohorts.indexOf(c) + 1)} [data-component="group-tie"]`)).toHaveText(note)
    }
  })

  test('the totals close: the cities of 2026 = groups + the ties before 2026 + the cities without earlier data, named', async ({ page }) => {
    const { cohorts, outside, cities2026 } = cohortReport()
    const grouped = cohorts.reduce((n, c) => n + c.cities, 0)
    const ties = outside.filter((o) => o.tieIn !== undefined).length
    const noData = outside.length - ties
    await expect(page.locator('[data-component="total-line"]')).toHaveText(
      `${int(cities2026)} cidades do 2º turno de 2026 (sem os postos do exterior) = ${int(grouped)} em grupos${ties ? ` + ${int(ties)} com empate antes de 2026` : ''}${noData ? ` + ${int(noData)} sem dados` : ''}.`,
    )
    const outcome = (winner: string | null) => (winner === null ? 'empate' : `vencida por ${NAME_2026[winner]}`)
    await expect(page.locator('[data-component="outside-list"] li')).toHaveText(
      outside.map((o) =>
        o.tieIn !== undefined
          ? `${placeLabel(o.city)} — empate no 2º turno de ${o.tieIn}${o.other ? ` (em ${o.other.ano} venceu ${o.other.camp})` : ''}; em 2026, ${outcome(o.winner2026)}.`
          : `${placeLabel(o.city)} — sem dados de 2018 e 2022 (existe só no 2º turno de 2026); em 2026, ${outcome(o.winner2026)}.`,
      ),
    )
  })

  test('the real build is not the example banner', async ({ page }) => {
    await expect(page.locator('[data-component="fixture-banner"]')).toHaveCount(0)
  })
})