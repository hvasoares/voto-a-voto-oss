import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { base } from './helpers'

/*
 * The cohort report on the REAL dataset (run with `npm run test:real`, DATA_DIR=../data), ticket #15.
 * These are the figures of the reference cohort table centraleleicao2026/thoughts/team/data-engineering/
 * 2026-10-26-swing-compare-cohort-figures.md section (c), pinned the same way by src/lib/cohorts.test.ts.
 */
test.skip(!existsSync(resolve('../data/cities.csv')), 'no ../data')

const path = base + 'relatorios/como-cada-grupo-votou/'

const G = (index: number) => `[data-component="group-card"]:nth-of-type(${index})`

test.describe('cohort report on the real dataset', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(path)
  })

  test('the four cohorts of the reference table, with sizes and valid votes', async ({ page }) => {
    const cards = page.locator('[data-component="group-card"]')
    await expect(cards).toHaveCount(4)
    const metas = await page.locator('[data-component="group-meta"]').allTextContents()
    expect(metas).toEqual([
      '2.755 cidades · 40.955.646 votos válidos (2º turno 2026)',
      '2.391 cidades · 64.886.493 votos válidos (2º turno 2026)',
      '368 cidades · 17.479.900 votos válidos (2º turno 2026)',
      '54 cidades · 372.409 votos válidos (2º turno 2026)',
    ])
  })

  test('the cards read as the frame does, with the 2026 runoff in the bars', async ({ page }) => {
    await expect(page.locator(`${G(1)} h2`)).toHaveText('Venceu em 2018 e 2022: PT')
    await expect(page.locator(`${G(2)} h2`)).toHaveText('Venceu em 2018 e 2022: Bolsonaro')
    await expect(page.locator(`${G(3)} h2`)).toHaveText('Venceu em 2018: Bolsonaro. Em 2022: Lula')
    await expect(page.locator(`${G(4)} h2`)).toHaveText('Venceu em 2018: PT. Em 2022: Bolsonaro')
    // Legend in election order (13 first), as the frame draws it — winner or not.
    await expect(page.locator(`${G(1)} [data-component="group-part"]`)).toHaveText(['Lula 94,9% (2.613)', 'Flavio 5,1% (141)'])
    await expect(page.locator(`${G(2)} [data-component="group-part"]`)).toHaveText(['Lula 1,1% (27)', 'Flavio 98,9% (2.364)'])
    await expect(page.locator(`${G(3)} [data-component="group-part"]`)).toHaveText(['Lula 62,8% (231)', 'Flavio 37,2% (137)'])
    await expect(page.locator(`${G(4)} [data-component="group-part"]`)).toHaveText(['Lula 7,4% (4)', 'Flavio 92,6% (50)'])
  })

  test('the one 2026 tie is a note on the PT card, not dropped', async ({ page }) => {
    await expect(page.locator(`${G(1)} [data-component="group-tie"]`)).toHaveText(
      '1 cidade empatou no 2º turno de 2026 e não está nas barras: 2.755 cidades = 2.613 + 141 + 1 empatada.',
    )
    await expect(page.locator('[data-component="group-tie"]')).toHaveCount(1)
  })

  test('the totals close: 5.571 cities = groups + the two 2022 ties + the 2026-only city, named', async ({ page }) => {
    await expect(page.locator('[data-component="total-line"]')).toHaveText(
      '5.571 cidades do 2º turno de 2026 (sem os postos do exterior) = 5.568 em grupos + 2 com empate antes de 2026 + 1 sem dados.',
    )
    await expect(page.locator('[data-component="outside-list"] li')).toHaveText([
      'IRATI/SC — empate no 2º turno de 2022 (em 2018 venceu PT); em 2026, vencida por Flavio.',
      'GUARÁ/SP — empate no 2º turno de 2022 (em 2018 venceu Bolsonaro); em 2026, vencida por Flavio.',
      'BOA ESPERANÇA DO NORTE/MT — sem dados de 2018 e 2022 (existe só no 2º turno de 2026); em 2026, vencida por Flavio.',
    ])
  })

  test('the real build is not the example banner', async ({ page }) => {
    await expect(page.locator('[data-component="fixture-banner"]')).toHaveCount(0)
  })
})