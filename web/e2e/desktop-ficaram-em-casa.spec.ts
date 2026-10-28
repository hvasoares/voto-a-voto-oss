import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { createStore } from '../src/data'
import { diskSource } from '../src/data/node'
import { formatShare, stayHomeRows } from '../src/lib/stay-home'
import { base, collectRequests, expectNoHorizontalScroll, mapaFrame, resizeTo } from './helpers'

/*
 * #32 "Ficaram em casa" on desktop (1024 px and up): the SVG map is the document of a lazy iframe like the other two maps of the Mapa por estado
 * (docs/checkpoints/issue-53.md); a phone never requests it. Fixture dataset: rj, sp, mt (and an overseas post that is never a state).
 */
const PATH = `${base}mapa/ficaram-em-casa/`
const turnout = createStore(diskSource(resolve('fixtures/data'))).turnout()

test.describe('Ficaram em casa at 1440', () => {
  test('shows only the SVG map: no tile mosaic, no Mosaico/Mapa toggle; the page keeps its heading', async ({ page }) => {
    await page.goto(PATH)
    await expect(page.getByRole('heading', { level: 1, name: 'Ficaram em casa' })).toBeVisible()
    await expect(page.locator('[data-slot="state-map"]')).toBeHidden()
    await expect(page.locator('[data-mapa-frame]')).toBeVisible()
    await expect(mapaFrame(page).locator('svg[data-uf-map]')).toBeVisible()
    await expectNoHorizontalScroll(page)
  })

  test('every state prints its percentage on the map or its callout; the 27 shapes are drawn, only the dataset states carry a value', async ({ page }) => {
    await page.goto(PATH)
    const frame = mapaFrame(page)
    const want = Object.fromEntries(stayHomeRows(await turnout, 2026, 1).map((r) => [r.uf, `${formatShare(r.share)}%`]))
    for (const [uf, text] of Object.entries(want)) await expect(frame.locator(`a[data-map-uf="${uf}"]`)).toContainText(text)
    expect(await frame.locator('[data-map-uf]').count()).toBe(27)
    await expect(frame.locator('[data-map-uf="zz"]')).toHaveCount(0)
  })

  test('the legend with its six edges, the claim and the selected-state panel are visible with the map', async ({ page }) => {
    await page.goto(PATH)
    const frame = mapaFrame(page)
    await expect(frame.locator('[data-slot="mapa-escala"]')).toBeVisible()
    for (const edge of ['17%', '23%', '32%']) await expect(frame.locator('[data-slot="mapa-escala"]')).toContainText(edge)
    await expect(frame.locator('[data-slot="mapa-escala"]')).toContainText('a cor nunca é a única pista')
    await expect(frame.locator('[data-slot="stayhome-claim"]')).toContainText('das cidades, o número de pessoas que não votaram em ninguém foi maior do que a diferença de votos entre os dois primeiros (1º turno de 2026)')
    await expect(frame.locator('[data-slot="mapa-selecionado"]')).toContainText('· selecionado')
    await expect(frame.getByRole('navigation', { name: 'Margem, virada ou ficaram em casa' }).getByRole('link', { name: 'Ficaram em casa' })).toHaveAttribute('aria-current', 'page')
  })

  test('the table lists every state; the cycle and round links open the other pages', async ({ page }) => {
    await page.goto(PATH)
    const frame = mapaFrame(page)
    await frame.locator('[data-slot="mapa-tabela"] summary').click()
    await expect(frame.locator('[data-slot="mapa-tabela"] tbody tr')).toHaveCount(3)
    await frame.getByRole('navigation', { name: 'Ciclo e turno' }).getByRole('link', { name: '2022 · 2º turno' }).click()
    await expect(page).toHaveURL(`${PATH}2022-2/`)
    await expect(page.locator('[data-subtitle]')).toContainText('2º turno de 2022.')
  })

  test('hover and keyboard focus fill the panel; Abrir estado follows the selection; the panel says what the phone says', async ({ page }) => {
    await page.goto(PATH)
    const frame = mapaFrame(page)
    const panel = frame.locator('[data-slot="mapa-selecionado"]')
    await expect(panel).toContainText('RJ · selecionado')
    await frame.locator('a[data-map-uf="mt"]').focus()
    await expect(panel).toContainText('MT · selecionado')
    await expect(frame.locator('[data-abrir-estado]')).toHaveAttribute('href', `${base}mt/`)
    await expect(panel).toContainText('Abstenção, brancos e nulos somados.')
  })

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false })
    test('the panel shows its default state and every state link works', async ({ page }) => {
      await page.goto(PATH)
      const frame = mapaFrame(page)
      await expect(frame.locator('[data-slot="mapa-selecionado"]')).toContainText('RJ · selecionado')
      await frame.getByRole('link', { name: /SP · São Paulo/ }).click()
      await expect(page).toHaveURL(`${base}sp/`)
    })
  })
})

test.describe('breakpoints and the phone', () => {
  for (const width of [390, 768, 1023]) {
    test(`at ${width} px it keeps the mosaic and never requests the desktop document`, async ({ page }) => {
      const seen = collectRequests(page)
      await resizeTo(page, width)
      await page.goto(PATH)
      await page.waitForLoadState('networkidle')
      await expect(page.locator('[data-mapa-frame]')).toBeHidden()
      await expect(page.locator('[data-slot="state-map"] nav[aria-label="Estados"] a')).toHaveCount(3)
      expect(seen.filter((r) => /fragmentos/.test(r.url))).toEqual([])
      await expectNoHorizontalScroll(page)
    })
  }
  for (const width of [1024, 1440]) {
    test(`at ${width} px it requests the desktop document (no script file of its own) and does not scroll sideways`, async ({ page }) => {
      const seen = collectRequests(page)
      await resizeTo(page, width)
      await page.goto(PATH)
      await page.waitForLoadState('networkidle')
      expect(seen.filter((r) => r.url.includes('/fragmentos/mapa-por-estado/ficaram-em-casa/2026-1/'))).toHaveLength(1)
      expect(seen.filter((r) => r.type === 'script' && /mapa-por-estado|fragmentos|StayHomeMap/.test(r.url))).toEqual([])
      await expectNoHorizontalScroll(page)
    })
  }
})
