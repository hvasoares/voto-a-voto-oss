import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { base } from './helpers'
import { measureMap } from './map-touch'

/*
 * #88 on the REAL outlines (run with `npm run test:real`): the 27 shapes of /mapa/?vista=mapa and /mapa/virada/?vista=mapa at 390x844.
 * Every state has a 44 px hit area (hit path bounding box); the states drawn smaller than a fingertip also have a callout row that is
 * a 44 px tap target of its own; a tap on the centre of a shape reaches that shape; no tap on a drawn shape is taken by a neighbour's hit path.
 */
test.skip(!existsSync(resolve('../data/cities.csv')), 'no ../data')
const MIN = 44

for (const path of ['mapa/?vista=mapa', 'mapa/virada/?vista=mapa']) {
  test.describe(`touch targets of ${path}`, () => {
    test('27 states: hit area >= 44x44, tiny states have a 44 px callout row, centres reach themselves, nothing stolen', async ({ page }) => {
      await page.goto(`${base}${path}`)
      await page.locator('[data-consent-continue]').click()
      await expect(page.getByRole('img', { name: /^Mapa do Brasil por estado/ }).locator('a[data-uf]').first()).toBeVisible({ timeout: 15_000 })
      const shapes = await measureMap(page)
      expect(shapes).toHaveLength(27)
      const rows = shapes.map((s) => `${s.uf}\t${s.shape.w.toFixed(0)}x${s.shape.h.toFixed(0)}\t${s.hit.w.toFixed(0)}x${s.hit.h.toFixed(0)}\t${s.callout ? `${s.callout.w.toFixed(0)}x${s.callout.h.toFixed(0)}` : '-'}\t${s.ownSquare.shape}\t${s.ownSquare.callout}\t${s.seaOwned}`)
      console.log(`uf\tdrawn\thit path\tcallout\town square (shape)\town square (callout)\tsea px\n${rows.join('\n')}`)
      for (const s of shapes) {
        expect(s.hit.w, `${s.uf} hit width`).toBeGreaterThanOrEqual(MIN)
        expect(s.hit.h, `${s.uf} hit height`).toBeGreaterThanOrEqual(MIN)
        expect(s.centre.reaches, `${s.uf} centre`).toBe(s.uf)
        expect(s.stolen, `${s.uf} visible area taken by another state`).toBe(0)
        if (s.callout) {
          expect(s.callout.w, `${s.uf} callout width`).toBeGreaterThanOrEqual(MIN)
          expect(s.callout.h, `${s.uf} callout height`).toBeGreaterThanOrEqual(MIN)
          expect(s.ownSquare.callout, `${s.uf} callout own square`).toBeGreaterThanOrEqual(MIN)
        }
      }
      // The 11 states the ticket counts (drawn under 30 px in one direction) all carry a callout.
      for (const s of shapes.filter((x) => Math.min(x.shape.w, x.shape.h) < 30)) expect(s.callout, `${s.uf} is drawn under 30 px`).not.toBeNull()
    })

    test('tapping the centre of every state selects it', async ({ page }) => {
      await page.goto(`${base}${path}`)
      await page.locator('[data-consent-continue]').click()
      await expect(page.getByRole('img', { name: /^Mapa do Brasil por estado/ }).locator('a[data-uf]').first()).toBeVisible({ timeout: 15_000 })
      const panel = page.locator('[data-slot="mapa-selecionado"]')
      for (const s of await measureMap(page)) {
        await page.touchscreen.tap(s.centre.x, s.centre.y)
        await expect(panel, s.uf).toContainText(`${s.uf.toUpperCase()} · selecionado`)
      }
    })
  })
}
