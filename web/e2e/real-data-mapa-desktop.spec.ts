import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { UF_NOME } from '../src/lib/uf-names'
import { base, mapaFrame } from './helpers'

/*
 * #54 on the REAL dataset: the desktop map prints the figures of the swing/compare note for every state (the same pins as
 * real-data-mapa.spec.ts and src/lib/margins.test.ts), all 27 states are links, and the panel opens on SP.
 */
test.skip(!existsSync(resolve('../data/cities.csv')), 'no ../data')
test.use({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false })

const STATES = Object.keys(UF_NOME).filter((uf) => uf !== 'zz').sort()
const value = async (page: import('@playwright/test').Page, uf: string) => ((await mapaFrame(page).locator(`a[data-map-uf="${uf}"]`).textContent()) ?? '').match(/[+-]\d+,\d/)![0]

test('margin: 27 linked shapes each printing a value, and the note figures', async ({ page }) => {
  await page.goto(`${base}mapa/`)
  const frame = mapaFrame(page)
  const ufs = await frame.locator('a[data-map-uf]').evaluateAll((els) => els.map((e) => e.getAttribute('data-map-uf')!).sort())
  expect(ufs).toEqual(STATES)
  for (const uf of STATES) expect(await value(page, uf)).toMatch(/^[+-]\d+,\d$/)
  expect(await value(page, 'sp')).toBe('-7,7')
  expect(await value(page, 'mg')).toBe('+0,9')
  expect(await value(page, 'rj')).toBe('-6,2')
  await expect(frame.locator('[data-slot="mapa-selecionado"]')).toContainText('SP · selecionado')
  await expect(frame.locator('[data-slot="mapa-selecionado"]')).toContainText('Votos válidos (2º turno): 26.258.452')
  await expect(frame.locator('[data-slot="mapa-selecionado"]')).toContainText('-7,7 pp. Na eleição anterior: -13,7 pp.')
})

test('swing: the note figures and the legend note', async ({ page }) => {
  await page.goto(`${base}mapa/virada/`)
  const frame = mapaFrame(page)
  for (const [uf, v] of [['rj', '+7,4'], ['sp', '+6,0'], ['mg', '+5,8'], ['al', '+7,3'], ['se', '+6,9']] as const) expect(await value(page, uf)).toBe(v)
  await expect(frame.locator('[data-slot="mapa-escala"]')).toContainText('Sem estados com variação negativa')
  await expect(frame.locator('[data-slot="mapa-selecionado"]')).toContainText('era de -13,7 pp e passou para -7,7 pp. Variação: +6,0 pp.')
})

test('the table alternative lists the 27 states', async ({ page }) => {
  await page.goto(`${base}mapa/`)
  await mapaFrame(page).locator('[data-slot="mapa-tabela"] summary').click()
  await expect(mapaFrame(page).locator('[data-slot="mapa-tabela"] tbody tr')).toHaveCount(27)
})
