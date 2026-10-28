import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { createStore } from '../src/data'
import { diskSource } from '../src/data/node'
import { formatShare, stayHomeRows } from '../src/lib/stay-home'
import { base } from './helpers'

/*
 * #32 "Ficaram em casa" at 390x844, fixture dataset (states rj, sp, mt; an overseas post `zz` in the data). The expected percentages are
 * computed here from the fixture's own turnout.csv with the pure module, so the page is compared with the dataset, not with typed numbers.
 */
const PATH = `${base}mapa/ficaram-em-casa/`
const turnout = createStore(diskSource(resolve('fixtures/data'))).turnout()
const expected = async (ano: number, turno: 1 | 2) => Object.fromEntries(stayHomeRows(await turnout, ano, turno).map((r) => [r.uf, `${formatShare(r.share)}%`]))

test.describe('Ficaram em casa: content', () => {
  test('title, subtitle for the cycle and round, three options in the toggle with this one current, the TSE footer', async ({ page }) => {
    await page.goto(PATH)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ficaram em casa')
    await expect(page.locator('[data-subtitle]')).toHaveText('Quem não votou em ninguém (abstenção, brancos e nulos). 1º turno de 2026.')
    const tabs = page.getByRole('navigation', { name: 'Margem, virada ou ficaram em casa' })
    await expect(tabs.getByRole('link')).toHaveText(['Margem', 'Virada', 'Ficaram em casa'])
    await expect(tabs.getByRole('link', { name: 'Ficaram em casa' })).toHaveAttribute('aria-current', 'page')
    await expect(tabs.getByRole('link', { name: 'Margem' })).toHaveAttribute('href', `${base}mapa/`)
    await expect(tabs.getByRole('link', { name: 'Virada' })).toHaveAttribute('href', `${base}mapa/virada/`)
    await expect(page.locator('footer')).toContainText('Fonte: TSE, dados finais · Sobre os dados ›')
  })

  test('every state prints its percentage on its tile; overseas is not a state; no candidate is named', async ({ page }) => {
    await page.goto(PATH)
    const want = await expected(2026, 1)
    const tiles = page.locator('[data-slot="state-map"] nav a[data-uf]')
    await expect(tiles).toHaveCount(3)
    for (const [uf, text] of Object.entries(want)) await expect(page.locator(`a[data-uf="${uf}"]`)).toContainText(text)
    await expect(page.locator('[data-uf="zz"]')).toHaveCount(0)
    await expect(page.locator('main')).not.toContainText(/Candidato|Lula|Flavio|Exterior:/)
  })

  test('the legend prints the six edges, the table repeats every state, the selected panel starts on the largest electorate', async ({ page }) => {
    await page.goto(PATH)
    const legend = page.locator('[data-slot="mapa-escala"]')
    for (const edge of ['17%', '20%', '23%', '26%', '29%', '32%']) await expect(legend).toContainText(edge)
    await expect(legend).toContainText('a cor nunca é a única pista')
    await expect(legend).toContainText('Tamanho igual para todos os estados')
    await page.locator('[data-slot="mapa-tabela"] summary').click()
    await expect(page.locator('[data-slot="mapa-tabela"] tbody tr')).toHaveCount(3)
    await expect(page.locator('[data-slot="mapa-selecionado"]')).toContainText('· selecionado')
    await expect(page.locator('[data-slot="mapa-selecionado"]')).toContainText('Abstenção, brancos e nulos somados. Exterior não aparece como estado.')
  })

  test('the claim of the measure note is for this cycle and round, with its limits', async ({ page }) => {
    await page.goto(PATH)
    const claim = page.locator('[data-slot="stayhome-claim"]')
    await expect(claim).toContainText(/Em \d+,\d% das cidades, o número de pessoas que não votaram em ninguém foi maior do que a diferença de votos entre os dois primeiros \(1º turno de 2026\)\./)
    await expect(claim).toContainText('Não diz quem são essas pessoas, em quem votariam, nem que o resultado teria sido outro.')
  })

  test('no horizontal scroll and every tile is a tap target of at least 40 px', async ({ page }) => {
    await page.goto(PATH)
    const sizes = await page.locator('[data-slot="state-map"] nav a[data-uf]').evaluateAll((els) => els.map((e) => e.getBoundingClientRect()))
    for (const r of sizes) expect(Math.min(r.width, r.height)).toBeGreaterThanOrEqual(40)
    const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
    expect(sw).toBeLessThanOrEqual(iw)
  })
})

test.describe('Ficaram em casa: each cycle and round', () => {
  for (const [ano, turno] of [[2026, 1], [2026, 2], [2022, 1], [2022, 2], [2018, 1], [2018, 2]] as const) {
    test(`${ano}, ${turno}º turno: its own address, subtitle and the percentages of its own rows`, async ({ page }) => {
      await page.goto(PATH)
      await page.getByRole('navigation', { name: 'Ciclo e turno' }).getByRole('link', { name: `${ano} · ${turno}º turno` }).click().catch(() => undefined)
      if (!(ano === 2026 && turno === 1)) await expect(page).toHaveURL(`${PATH}${ano}-${turno}/`)
      await expect(page.locator('[data-subtitle]')).toContainText(`${turno}º turno de ${ano}.`)
      const want = await expected(ano, turno)
      for (const [uf, text] of Object.entries(want)) await expect(page.locator(`a[data-uf="${uf}"]`)).toContainText(text)
      await expect(page.getByRole('navigation', { name: 'Ciclo e turno' }).getByRole('link', { name: `${ano} · ${turno}º turno` })).toHaveAttribute('aria-current', 'page')
    })
  }
})

test.describe('Ficaram em casa: map view', () => {
  test('?vista=mapa draws one shape per state of the dataset with its percentage and the map note', async ({ page }) => {
    await page.goto(`${PATH}?vista=mapa`)
    const svg = page.getByRole('img', { name: /^Parcela dos eleitores que não votou em ninguém, por estado, 1º turno de 2026: / })
    await expect(svg).toBeVisible()
    const ufs = await svg.locator('a[data-uf]').evaluateAll((els) => els.map((e) => e.getAttribute('data-uf')))
    expect(new Set(ufs)).toEqual(new Set(['mt', 'rj', 'sp']))
    const want = await expected(2026, 1)
    for (const text of Object.values(want)) await expect(svg).toContainText(text)
    await expect(page.locator('[data-slot="mapa-escala"]')).toContainText('O mapa mostra área, não eleitores')
  })

  test('the toggle switches presentation without a page load and keeps vista in the address', async ({ page }) => {
    await page.goto(PATH)
    await page.getByRole('link', { name: 'Mapa', exact: true }).click()
    await expect(page.getByRole('img', { name: /^Parcela dos eleitores/ })).toBeVisible()
    expect(new URL(page.url()).searchParams.get('vista')).toBe('mapa')
    await page.getByRole('link', { name: 'Mosaico' }).click()
    await expect(page.locator('a[data-uf="rj"]')).toBeVisible()
    expect(new URL(page.url()).search).toBe('')
  })

  test('a tap on Mosaico | Mapa that lands while the island hydrates is kept and applied, address included', async ({ page }) => {
    let release!: () => void
    const held = new Promise<void>((r) => (release = r))
    await page.route(/StayHomeMap[^/]*\.js/, async (route) => {
      await held
      await route.continue()
    })
    await page.goto(PATH)
    await page.getByRole('link', { name: 'Mapa', exact: true }).click()
    await expect(page.locator('astro-island[ssr]')).toHaveAttribute('data-pending-vista', 'mapa')
    release()
    await expect(page.getByRole('img', { name: /^Parcela dos eleitores/ })).toBeVisible()
    expect(new URL(page.url()).searchParams.get('vista')).toBe('mapa')
  })

  test('a tap on a state selects it instead of navigating', async ({ page }) => {
    await page.goto(PATH)
    await page.locator('a[data-uf="sp"]').click()
    await expect(page.locator('[data-slot="mapa-selecionado"]')).toContainText('SP · selecionado')
    expect(new URL(page.url()).pathname).toBe(PATH)
  })
})

test.describe('Ficaram em casa without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('the mosaic, the views and the tabs are real links; the numbers are pre-rendered', async ({ page }) => {
    await page.goto(PATH)
    await expect(page.locator('a[data-uf="rj"]')).toHaveAttribute('href', `${base}rj/`)
    await expect(page.getByRole('link', { name: '2022 · 2º turno' })).toHaveAttribute('href', `${PATH}2022-2/`)
    await expect(page.locator('a[data-uf="sp"]')).toContainText('%')
    await expect(page.locator('noscript').last()).toBeAttached()
  })
})

test.describe('Entry point', () => {
  test('the margin and swing pages offer Ficaram em casa as the third option, and nothing else links to it from the phone screens', async ({ page }) => {
    for (const p of ['mapa/', 'mapa/virada/']) {
      await page.goto(`${base}${p}`)
      await expect(page.getByRole('link', { name: 'Ficaram em casa' })).toHaveAttribute('href', PATH)
    }
    for (const p of ['', 'relatorios/']) {
      await page.goto(`${base}${p}`)
      await expect(page.locator(`a[href="${PATH}"]`)).toHaveCount(0)
    }
  })
})
