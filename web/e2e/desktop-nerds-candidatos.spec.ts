import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { parseCsv } from '../src/lib/nerds/actions'
import { base } from './helpers'

/*
 * Candidate measures on the same panels (#81): the Escada by candidate, the map shaded by one candidate, the Tabela's "Participação | Candidatos" toggle, and the candidate tables
 * in the no-JS and phone views. Neutral: ballot-number order, names and colours of "Brasil e regiões", no ranking, no winner label.
 */
const url = (path = 'estado/rj/', q = '') => `${base}dados-para-nerds/${path}${q}`
const BANNED = /\b(vencedor|venceu|ganhou|eleito|derrotad\w*|perdeu|melhor|pior|1º colocado|líder)\b/i
const escada = (page: Page) => page.locator('[data-panel="escada"]')

test.describe('without scripts and on a phone: the candidate tables are in the page', () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } })

  test('Escada Ficha by candidate, Par by candidate and the Tabela\'s candidate columns, in ballot-number order, no ranking', async ({ page }) => {
    await page.goto(url())
    const ficha = escada(page).locator('[data-cand-table="2"] tbody tr')
    expect(await ficha.count()).toBe(6) // three cycles x two candidates in a 2º turno
    expect(await escada(page).locator('[data-cand-table="2"] tbody tr td:nth-child(2)').allTextContents()).toEqual(['91', '92', '91', '92', '91', '92'])
    expect(await escada(page).locator('[data-cand-table="1"] thead th').allTextContents()).toEqual(['Ciclo', 'Nº', 'Candidato', 'Votos', '% dos votos válidos'])
    const par = page.locator('[data-ciclo-block="2026"] [data-panel="par"] [data-set="candidatos"] tbody th')
    expect(await par.allTextContents()).toEqual(['Nº 91', 'Nº 92'])
    const tabela = page.locator('[data-ciclo-block="2026"] [data-panel="detalhe"] [data-set="candidatos"] table')
    expect(await tabela.locator('thead th').count()).toBe(5)
    expect(await tabela.locator('thead th').first().textContent()).toBe('Nome')
    await expect(tabela.locator('tbody tr').last()).toHaveAttribute('data-total', '')
    expect(await page.locator('main').innerText()).not.toMatch(BANNED)
  })
})

test.describe('with the islands (1440 px)', () => {
  test('Escada by candidate: two candidates in a 2º turno, every candidate listed in a 1º turno, in ballot-number order, named and valued; the picker has both groups', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(url())
    await escada(page).scrollIntoViewIfNeeded()
    await expect(escada(page).locator('[data-escada]')).toHaveAttribute('data-drawn', 'chart')
    expect(await escada(page).locator('[role="group"]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))).toEqual(['Participação', 'Votos por candidato'])
    await escada(page).locator('[data-measure-option="candidatos"]').click()
    await expect(escada(page).locator('[data-cand-chart]')).toBeVisible()
    await escada(page).locator('[data-turno-option="2"]').click()
    expect(await escada(page).locator('[data-cand-bar]').evaluateAll((els) => els.map((e) => e.getAttribute('data-cand-bar')))).toEqual(['2018-91', '2018-92', '2022-91', '2022-92', '2026-91', '2026-92'])
    const labels = await escada(page).locator('[data-cand-bar] text').allTextContents()
    expect(labels.every((t) => /^Candidato [AB] · \d{1,3},\d%$/.test(t))).toBe(true)
    expect(await escada(page).locator('[data-cand-bar] rect').evaluateAll((els) => els.map((e) => e.getAttribute('class')))).toEqual(['nerds-bar nerds-cand-a', 'nerds-bar nerds-cand-b', 'nerds-bar nerds-cand-a', 'nerds-bar nerds-cand-b', 'nerds-bar nerds-cand-a', 'nerds-bar nerds-cand-b'])
    await escada(page).locator('[data-turno-option="1"]').click()
    expect(await escada(page).locator('[data-cand-bar] rect').first().getAttribute('class')).toContain('nerds-cand-n')
    await expect(escada(page).locator('#serie-escada-t, h2')).toContainText('Como foi a votação de cada candidato em cada ciclo?')
  })

  test('the map is shaded by one candidate\'s share and the address keeps the choice', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(url(''))
    const map = page.locator('[data-panel="mapa"]')
    await map.scrollIntoViewIfNeeded()
    await expect(map).toHaveAttribute('data-drawn', '2026-1-comparecimento')
    await expect(map.locator('[role="group"][aria-label="Votos por candidato"] [data-measure-option]')).toHaveText(['Nº 91', 'Nº 92'])
    await map.locator('[data-measure-option="cand-92"]').click()
    await expect(map).toHaveAttribute('data-drawn', '2026-1-cand-92')
    await expect(map.locator('[data-map-caption]')).toHaveText('Nº 92, 1º turno de 2026')
    expect(new URL(page.url()).searchParams.get('medida')).toBe('cand-92')
  })

  test('the Tabela toggle "Participação | Candidatos" switches the column set; the CSV follows it', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(url())
    const panel = page.locator('[data-ciclo-block="2026"] [data-panel="detalhe"]')
    await panel.scrollIntoViewIfNeeded()
    await expect(panel.locator('.nerds-tablewrap').first()).toHaveAttribute('data-ready', 'yes')
    await expect(panel.locator('[data-set="candidatos"]')).toBeHidden()
    await panel.locator('[data-set-option="candidatos"]').click()
    await expect(panel.locator('[data-set="candidatos"]')).toBeVisible()
    await expect(panel.locator('[data-set="participacao"]')).toBeHidden()
    const heads = await panel.locator('[data-set="candidatos"] thead th').evaluateAll((ths) => ths.map((t) => (t as HTMLElement).dataset.label))
    expect(heads.slice(0, 3)).toEqual(['Nome', 'Candidato nº 91 (Candidato A), 1º turno', 'Candidato nº 91 (Candidato A), 2º turno'])
    const download = page.waitForEvent('download')
    await panel.locator('[data-action="csv"]').click()
    const { table } = parseCsv(readFileSync(await (await download).path(), 'utf8'))
    expect(table.headers).toEqual(heads)
    const screen = await panel.locator('[data-set="candidatos"] tbody tr').evaluateAll((trs) => trs.map((tr) => [...(tr as HTMLTableRowElement).cells].map((c) => ((c as HTMLElement).dataset.name ?? c.textContent ?? '').trim())))
    expect(table.rows).toEqual(screen)
    await panel.locator('[data-set-option="participacao"]').click()
    await expect(panel.locator('[data-set="participacao"]')).toBeVisible()
  })

  test('the candidate views contain no ranking, winner label or computed difference (HTML)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(url('', '?ciclo=2022&turno=2&cargo=presidente&medida=candidatos'))
    await escada(page).scrollIntoViewIfNeeded()
    await expect(escada(page).locator('[data-escada]')).toHaveAttribute('data-measure', 'candidatos')
    expect(await page.locator('main').innerText()).not.toMatch(BANNED)
  })
})
