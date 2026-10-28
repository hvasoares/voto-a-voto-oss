import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import sharp from 'sharp'
import { base } from './helpers'
import { parseCsv } from '../src/lib/nerds/actions'

/*
 * The panel actions at 1440 px (#80): Citar (one dialog, three formats), CSV (provenance block, then the rows as printed) and Imagem (16:9 PNG), real text buttons reachable from
 * the keyboard. The permalink of a citation reopens the same panel with the same numbers. Waits are on `data-actions-ready` and the panels' own `data-drawn`.
 */
const url = (path = 'estado/rj/', q = '') => `${base}dados-para-nerds/${path}${q}`
const act = (page: Page, panel: string, name: string) => page.locator(`[data-panel="${panel}"]`).last().locator(`[data-action="${name}"]`)

async function ready(page: Page, path = 'estado/rj/', q = '') {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(url(path, q))
  await expect(page.locator('[data-page="nerds"]')).toHaveAttribute('data-actions-ready', 'yes')
}

test.describe('panel actions (1440 px)', () => {
  test('every panel has Citar, CSV and Imagem as real text buttons, and they are keyboard accessible', async ({ page }) => {
    await ready(page)
    for (const panel of ['sinais', 'placar', 'mapa', 'escada', 'par', 'distribuicao', 'detalhe', 'invariantes']) {
      expect(await page.locator(`[data-panel="${panel}"]`).last().locator('[data-action]').allTextContents(), panel).toEqual(['Citar', 'CSV', 'Imagem'])
    }
    await act(page, 'escada', 'citar').focus()
    expect(await act(page, 'escada', 'citar').evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe('none')
    await page.keyboard.press('Tab')
    await expect(act(page, 'escada', 'csv')).toBeFocused()
  })

  test('Citar: one dialog with the three formats, each with the edition id, the date and the permalink; Esc closes it and returns the focus', async ({ page }) => {
    await ready(page)
    await act(page, 'escada', 'citar').click()
    const dialog = page.locator('[data-cite-dialog]')
    await expect(dialog).toBeVisible()
    await expect(dialog.locator('[data-format="texto"]')).toBeFocused()
    const link = (await dialog.locator('[data-cite-text]').inputValue()).match(/https?:\/\/\S+/)![0]
    expect(link).toContain('/dados-para-nerds/estado/rj/?ciclo=2026&turno=1&cargo=presidente&medida=comparecimento#painel-escada')
    expect(await dialog.locator('[data-cite-text]').inputValue()).toMatch(/^Fonte: TSE, edição \d{4}-\d{2}-\d{2}, processado por voto-a-voto em \d{2}\/\d{2}\/\d{4}, /)
    await dialog.locator('[data-format="bibtex"]').click()
    const bib = await dialog.locator('[data-cite-text]').inputValue()
    expect(bib).toMatch(/^@misc\{votoavoto_\d{8}_escada,/)
    expect(bib).toContain(`url = {${link}}`)
    await dialog.locator('[data-format="markdown"]').click()
    const md = await dialog.locator('[data-cite-text]').inputValue()
    expect(md).toContain('[voto-a-voto](')
    expect(md).toContain(`](${link})`)
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(act(page, 'escada', 'citar')).toBeFocused()
  })

  test('Citar copies the text shown to the clipboard', async ({ browser }) => {
    const ctx = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'], viewport: { width: 1440, height: 900 } })
    const page = await ctx.newPage()
    await ready(page)
    await act(page, 'par', 'citar').click()
    await page.locator('[data-cite-dialog] [data-copy]').click()
    await expect(page.locator('[data-copied]')).toHaveText('Copiado para a área de transferência.')
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(await page.locator('[data-cite-text]').inputValue())
    await ctx.close()
  })

  test('the permalink of a citation reopens the same panel with the same numbers (map: measure, turno and cycle in the address)', async ({ page }) => {
    await ready(page, '')
    const map = page.locator('[data-panel="mapa"]')
    await map.scrollIntoViewIfNeeded()
    await expect(map).toHaveAttribute('data-drawn', '2026-1-comparecimento')
    await map.locator('[data-measure-option="abstencao"]').click()
    await map.locator('[data-turno-option="2"]').click()
    await expect(map).toHaveAttribute('data-drawn', '2026-2-abstencao')
    const shown = await map.locator('a[data-map-uf="rj"]').textContent()
    await act(page, 'mapa', 'citar').click()
    const link = (await page.locator('[data-cite-text]').inputValue()).match(/https?:\/\/\S+/)![0]
    expect(link).toContain('?ciclo=2026&turno=2&cargo=presidente&medida=abstencao#painel-mapa')
    await page.goto(link.replace(/^https?:\/\/[^/]+/, ''))
    await page.locator('[data-panel="mapa"]').scrollIntoViewIfNeeded()
    await expect(page.locator('[data-panel="mapa"]')).toHaveAttribute('data-drawn', '2026-2-abstencao')
    expect(await page.locator('[data-panel="mapa"] a[data-map-uf="rj"]').textContent()).toBe(shown)
  })

  for (const [path, panels] of [['', ['placar', 'escada', 'par', 'detalhe']], ['regiao/sudeste/', ['placar', 'mapa', 'detalhe']], ['estado/rj/', ['placar', 'distribuicao', 'detalhe', 'invariantes']]] as const) {
    for (const panel of panels) {
      test(`CSV of ${panel} at ${path || 'brasil'}: the provenance block first (with the four footer fields), then rows equal to the screen`, async ({ page }) => {
        await ready(page, path)
        await page.locator(`[data-ciclo-block="2026"] [data-panel="${panel}"], #painel-${panel}`).first().scrollIntoViewIfNeeded()
        const download = page.waitForEvent('download')
        await page.locator(`[data-ciclo-block="2026"] [data-panel="${panel}"] [data-action="csv"], #painel-${panel} [data-action="csv"]`).first().click()
        const { block, table } = parseCsv(readFileSync(await (await download).path(), 'utf8'))
        expect(block.map((l) => l.split(':')[0])).toEqual(['# Painel', '# Lugar', '# Definição', '# Fonte', '# Edição', '# Data', '# Cálculo', '# Não mede', '# Licença', '# Endereço'])
        expect(block.find((l) => l.startsWith('# Edição'))).toMatch(/\d{4}-\d{2}-\d{2}/)
        expect(block.find((l) => l.startsWith('# Endereço'))).toContain(`#painel-${panel}`)
        const section = page.locator(`[data-ciclo-block="2026"] [data-panel="${panel}"], #painel-${panel}`).first()
        // every printed field of the footer is in the block, word for word
        for (const [field, label] of [['definicao', '# Definição'], ['calculo', '# Cálculo'], ['naoMede', '# Não mede'], ['fonte', '# Fonte']] as const) {
          expect(block.find((l) => l.startsWith(label))).toContain(((await section.locator(`[data-field="${field}"]`).textContent()) ?? '').trim())
        }
        expect(table.headers.length).toBeGreaterThan(0)
        if (panel === 'detalhe') {
          const screen = await section.locator('tbody tr[data-row]:not([data-child-of])').evaluateAll((trs) => trs.map((tr) => [...(tr as HTMLTableRowElement).cells].map((c) => ((c as HTMLElement).dataset.name ?? c.textContent ?? '').trim())))
          expect(table.rows).toEqual(screen)
        } else if (panel === 'placar') {
          const cards = await section.locator('[data-stat]').evaluateAll((els) => els.map((e) => (e.querySelector('h3') as HTMLElement).textContent))
          expect(table.rows.map((r) => r[0])).toEqual(cards)
        } else if (panel === 'par' || panel === 'invariantes') {
          const screen = await section.locator('tbody tr').evaluateAll((trs) => trs.map((tr) => [...(tr as HTMLTableRowElement).cells].map((c) => (c.textContent ?? '').trim())))
          expect(table.rows).toEqual(screen)
        } else if (panel === 'escada') {
          const screen = await section.locator('[data-ficha-table] tbody tr').evaluateAll((trs) => trs.map((tr) => [...(tr as HTMLTableRowElement).cells].map((c) => (c.textContent ?? '').trim())))
          if (screen.length) expect(table.rows).toEqual(screen)
        }
        expect(table.rows.length).toBeGreaterThan(0)
      })
    }
  }

  test('Imagem downloads a 16:9 PNG of the panel', async ({ page }) => {
    await ready(page)
    await page.locator('[data-panel="par"]').last().scrollIntoViewIfNeeded()
    const download = page.waitForEvent('download')
    await act(page, 'par', 'imagem').click()
    const file = await download
    expect(file.suggestedFilename()).toMatch(/^par-rj-2026\.png$/)
    const meta = await sharp(await file.path()).metadata()
    expect([meta.width, meta.height, meta.format]).toEqual([1600, 900, 'png'])
  })

  test('without scripts or on a phone there are no action buttons and nothing is requested for them', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const seen: string[] = []
    page.on('request', (r) => seen.push(r.url()))
    await page.goto(url())
    await page.waitForLoadState('networkidle')
    expect(await page.locator('[data-action]').count()).toBe(0)
    expect(seen.filter((u) => /PanelActions|client\./.test(u))).toEqual([])
  })
})
