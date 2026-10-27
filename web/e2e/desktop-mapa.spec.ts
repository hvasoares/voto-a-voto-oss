import { expect, test } from '@playwright/test'
import { base, collectRequests, expectNoHorizontalScroll, mapaFrame, resizeTo } from './helpers'

/*
 * Ticket #54: "Mapa por estado" and "Mapa por estado: virada" on desktop (1024 px and up). Fixture dataset: rj, sp, mt.
 * Delivery (docs/checkpoints/issue-53.md): the desktop body is the document of a lazy iframe; the hover and keyboard script is
 * inline in that document, so it exists only where the iframe is drawn (1024 px and up).
 */
const PAGES = [
  { kind: 'margin', path: 'mapa/', frame: 'margem', title: 'Mapa por estado' },
  { kind: 'swing', path: 'mapa/virada/', frame: 'virada', title: 'Mapa por estado: virada' },
] as const

for (const p of PAGES) {
  test.describe(`${p.title} at 1440`, () => {
    test('shows only the SVG map: no tile mosaic, no Mosaico/Mapa toggle; the page keeps its heading', async ({ page }) => {
      await page.goto(base + p.path)
      await expect(page.getByRole('heading', { level: 1, name: p.title })).toBeVisible()
      await expect(page.locator('[data-slot="state-map"]')).toBeHidden() // the phone's island, with the mosaic and the toggle
      await expect(page.getByRole('group', { name: 'Mosaico ou mapa' })).toBeHidden()
      await expect(page.locator('[data-mapa-frame]')).toBeVisible()
      await expect(mapaFrame(page).locator('svg[data-uf-map]')).toBeVisible()
      await expectNoHorizontalScroll(page)
    })

    test('every state prints its value on the map or its callout, the same value and colour step as the phone mosaic', async ({ page }) => {
      await page.goto(base + p.path)
      const frame = mapaFrame(page)
      for (const uf of ['rj', 'sp', 'mt']) {
        const tile = page.locator(`[data-slot="state-map"] a[data-uf="${uf}"]`)
        const value = ((await tile.textContent()) ?? '').match(/[+-]\d+,\d/)![0]
        const link = frame.locator(`a[data-map-uf="${uf}"]`)
        await expect(link).toContainText(value) // printed in the shape or in its callout, never only a colour
        // the same diverging scale as #11: the fill is the colour the tile has
        const tileBg = await tile.evaluate((el) => (el as HTMLElement).style.background)
        const fill = await link.locator('path').evaluate((el) => (el as unknown as SVGElement).style.fill)
        expect(fill).toBe(tileBg)
      }
      // the states the dataset has no page for are drawn too (27 shapes), not coloured as if they had a value
      expect(await frame.locator('[data-map-uf]').count()).toBe(27)
    })

    test('the numeric legend, the note and the selected-state panel are visible together with the map', async ({ page }) => {
      await page.goto(base + p.path)
      const frame = mapaFrame(page)
      await expect(frame.locator('[data-slot="mapa-escala"]')).toBeVisible()
      await expect(frame.locator('[data-slot="mapa-escala"]')).toContainText(p.kind === 'margin' ? '+30' : '+5')
      await expect(frame.locator('[data-slot="mapa-selecionado"]')).toBeVisible()
      await expect(frame.locator('[data-slot="mapa-selecionado"]')).toContainText('Votos válidos (2º turno)')
      await expect(frame.locator('[data-slot="mapa-escala"]')).toContainText('a cor nunca é a única pista')
    })

    test('a table alternative lists every state with its value, each row a link', async ({ page }) => {
      await page.goto(base + p.path)
      const frame = mapaFrame(page)
      await frame.locator('[data-slot="mapa-tabela"] summary').click()
      const rows = frame.locator('[data-slot="mapa-tabela"] tbody tr')
      await expect(rows).toHaveCount(3)
      await expect(frame.locator('[data-slot="mapa-tabela"] thead th')).toHaveCount(3)
      for (const uf of ['rj', 'sp', 'mt']) await expect(frame.locator(`[data-slot="mapa-tabela"] a[href$="/${uf}/"]`)).toHaveCount(1)
    })

    test('hover and keyboard focus fill the panel; Abrir estado follows the selection', async ({ page }) => {
      await page.goto(base + p.path)
      const frame = mapaFrame(page)
      const panel = frame.locator('[data-slot="mapa-selecionado"]')
      await expect(panel).toContainText('RJ · selecionado') // the state with the most valid votes of the fixture
      // hover: the mouse on the label of SP
      const box = (await frame.locator('a[data-map-uf="sp"] text').first().boundingBox())!
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await expect(panel).toContainText('SP · selecionado')
      await expect(frame.locator('[data-abrir-estado]')).toHaveAttribute('href', `${base}sp/`)
      await expect(frame.locator('a[data-map-uf="sp"]')).toHaveAttribute('data-selected', 'true')
      await expect(frame.locator('a[data-selected="true"]')).toHaveCount(1)
      // keyboard focus
      await frame.locator('a[data-map-uf="mt"]').focus()
      await expect(panel).toContainText('MT · selecionado')
      await expect(frame.locator('[data-abrir-estado]')).toHaveAttribute('href', `${base}mt/`)
      // arrow keys move between states and select them
      await page.keyboard.press('ArrowRight')
      await expect(frame.locator('a[data-map-uf]:focus')).not.toHaveAttribute('data-map-uf', 'mt')
      await expect(panel).not.toContainText('MT · selecionado')
    })

    test('the panel says the same thing the phone panel says', async ({ page }) => {
      await page.goto(base + p.path)
      const phone = ((await page.locator('[data-slot="state-map"] [data-slot="mapa-selecionado"]').textContent()) ?? '').replace(/\s+/g, ' ')
      const desktop = ((await mapaFrame(page).locator('[data-slot="mapa-selecionado"]').textContent()) ?? '').replace(/\s+/g, ' ')
      for (const sentence of phone.match(/(Votos válidos[^.]*\d|Margem \(.*?\) pp\.|A margem de .*? pp\.)/g) ?? []) expect(desktop).toContain(sentence.trim())
    })

    test.describe('without JavaScript', () => {
      test.use({ javaScriptEnabled: false })
      test('the panel shows its default state and every state link works, with the tabs', async ({ page }) => {
        await page.goto(base + p.path)
        const frame = mapaFrame(page)
        await expect(frame.locator('[data-slot="mapa-selecionado"]')).toContainText('RJ · selecionado')
        await expect(frame.getByRole('link', { name: /SP · São Paulo/ })).toHaveAttribute('href', `${base}sp/`)
        await frame.getByRole('link', { name: /SP · São Paulo/ }).click()
        await expect(page).toHaveURL(`${base}sp/`)
        await page.goBack()
        await mapaFrame(page).getByRole('link', { name: p.kind === 'margin' ? /Virada/ : /Margem/ }).first().click()
        await expect(page).toHaveURL(`${base}${p.kind === 'margin' ? 'mapa/virada/' : 'mapa/'}`)
      })
    })
  })
}

test.describe('breakpoints and the phone', () => {
  for (const p of PAGES) {
    for (const width of [390, 768, 1023]) {
      test(`${p.title} at ${width} px keeps the mosaic and never requests the desktop document`, async ({ page }) => {
        const seen = collectRequests(page)
        await resizeTo(page, width)
        await page.goto(base + p.path)
        await page.waitForLoadState('networkidle')
        await expect(page.locator('[data-mapa-frame]')).toBeHidden()
        await expect(page.locator('[data-slot="state-map"] nav[aria-label="Estados"] a')).toHaveCount(3)
        expect(seen.filter((r) => /fragmentos/.test(r.url))).toEqual([])
        await expectNoHorizontalScroll(page)
      })
    }
    for (const width of [1024, 1440]) {
      test(`${p.title} at ${width} px requests the desktop document (no script file of its own) and does not scroll sideways`, async ({ page }) => {
        const seen = collectRequests(page)
        await resizeTo(page, width)
        await page.goto(base + p.path)
        await page.waitForLoadState('networkidle')
        const own = seen.filter((r) => r.url.includes(`/fragmentos/mapa-por-estado/${p.frame}/`))
        expect(own).toHaveLength(1)
        expect(seen.filter((r) => r.type === 'script' && /mapa-por-estado|fragmentos/.test(r.url))).toEqual([])
        await expectNoHorizontalScroll(page)
      })
    }
  }
})
