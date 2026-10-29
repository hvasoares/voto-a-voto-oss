import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from '@playwright/test'
import { base } from './helpers'
import { acknowledgeNotice } from './presets'

/*
 * Gate 2 of ticket #35: Home with the "Sua cidade" shortcut (fixture state: the place "Cidade Exemplo · RJ" saved),
 * next to the Sketch frame "1 Home, with the Sua cidade shortcut" (page "Election SPA v3", 390x900). The frame
 * is taller than the viewport, so the capture is full-page; the metrics notice is acknowledged first (not in the frame).
 */
test('capture home / sua cidade', async ({ page }) => {
  await acknowledgeNotice(page)
  await page.addInitScript(() => {
    localStorage.setItem('voto-a-voto:place', JSON.stringify({ kind: 'city', uf: 'rj', slug: 'cidade-exemplo', nome: 'Cidade Exemplo' }))
  })
  await page.goto(base)
  await page.evaluate(() => document.fonts.ready)
  await page.waitForFunction(() => document.documentElement.dataset.ready !== undefined)
  const dir = resolve('.captures', 'home')
  mkdirSync(dir, { recursive: true })
  const file = resolve(dir, 'sua-cidade.png')
  await page.screenshot({ path: file, animations: 'disabled', fullPage: true })
  writeFileSync(resolve(dir, 'sua-cidade.json'), JSON.stringify({ slot: 'home', state: 'sua-cidade', route: base, viewport: page.viewportSize(), scrollY: 0, fullPage: true, reference: 'Sketch: 1 Home, with the Sua cidade shortcut', capture: file }, null, 2) + '\n')
})
