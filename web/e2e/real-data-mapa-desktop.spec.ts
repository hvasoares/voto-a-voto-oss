import { expect, test } from '@playwright/test'
import { UF_NOME } from '../src/lib/uf-names'
import { base, mapaFrame } from './helpers'
import { DESKTOP, dataGuard } from './presets'
import { int, marginPp, signedDec1, swingPp, turnoutSum } from './real-data-oracle'

/*
 * #54 on the REAL dataset: the desktop map prints the margins and swings of the states (counted by the oracle, as in
 * real-data-mapa.spec.ts), all 27 states are links, and the panel opens on SP.
 */
test.skip(...dataGuard())
test.use({ viewport: DESKTOP, isMobile: false, hasTouch: false })

const LULA = '13'
const FLAVIO = '22'
const ROUND = { ano: 2026, turno: 2 }
const ROUND1 = { ano: 2026, turno: 1 }
/** A state's margin, in the form the maps print it: "-7,7" / "+0,9" (counted from the data directory). */
const margin = (uf: string) => signedDec1(marginPp(ROUND, LULA, FLAVIO, { uf }))
const swing = (uf: string) => signedDec1(swingPp(2026, LULA, FLAVIO, { uf }))
const previous = (uf: string) => signedDec1(marginPp(ROUND1, LULA, FLAVIO, { uf }))
const valid = (uf: string) => int(turnoutSum(ROUND, { uf }).validos)

const STATES = Object.keys(UF_NOME).filter((uf) => uf !== 'zz').sort()
const value = async (page: import('@playwright/test').Page, uf: string) => ((await mapaFrame(page).locator(`a[data-map-uf="${uf}"]`).textContent()) ?? '').match(/[+-]\d+,\d/)![0]

test('margin: 27 linked shapes each printing a value, and the note figures', async ({ page }) => {
  await page.goto(`${base}mapa/`)
  const frame = mapaFrame(page)
  const ufs = await frame.locator('a[data-map-uf]').evaluateAll((els) => els.map((e) => e.getAttribute('data-map-uf')!).sort())
  expect(ufs).toEqual(STATES)
  for (const uf of STATES) expect(await value(page, uf)).toMatch(/^[+-]\d+,\d$/)
  for (const uf of ['sp', 'mg', 'rj']) expect(await value(page, uf)).toBe(margin(uf))
  await expect(frame.locator('[data-slot="mapa-selecionado"]')).toContainText('SP · selecionado')
  await expect(frame.locator('[data-slot="mapa-selecionado"]')).toContainText(`Votos válidos (2º turno): ${valid('sp')}`)
  await expect(frame.locator('[data-slot="mapa-selecionado"]')).toContainText(`${margin('sp')} pp. Na eleição anterior: ${previous('sp')} pp.`)
})

test('swing: the note figures and the legend note', async ({ page }) => {
  await page.goto(`${base}mapa/virada/`)
  const frame = mapaFrame(page)
  for (const uf of ['rj', 'sp', 'mg', 'al', 'se']) expect(await value(page, uf)).toBe(swing(uf))
  await expect(frame.locator('[data-slot="mapa-escala"]')).toContainText('Sem estados com variação negativa')
  await expect(frame.locator('[data-slot="mapa-selecionado"]')).toContainText(`era de ${previous('sp')} pp e passou para ${margin('sp')} pp. Variação: ${swing('sp')} pp.`)
})

test('the table alternative lists the 27 states', async ({ page }) => {
  await page.goto(`${base}mapa/`)
  await mapaFrame(page).locator('[data-slot="mapa-tabela"] summary').click()
  await expect(mapaFrame(page).locator('[data-slot="mapa-tabela"] tbody tr')).toHaveCount(27)
})
