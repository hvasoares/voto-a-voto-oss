import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from '@playwright/test'
import { base } from './helpers'

/*
 * Gate 2 of ticket #40: Home with the "Usar minha localização" button (fixture state: nothing remembered, button
 * offered), next to the Sketch frame "1 Home, with the location button" (page "Election SPA v3", 390x916). The frame
 * is taller than the viewport, so the capture is full-page, taken after the metrics notice was acknowledged.
 */
test('capture home / localizacao', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('voto-a-voto:notice', 'acknowledged'))
  await page.goto(base)
  await page.evaluate(() => document.fonts.ready)
  await page.waitForFunction(() => document.documentElement.dataset.ready !== undefined)
  const dir = resolve('.captures', 'home')
  mkdirSync(dir, { recursive: true })
  const file = resolve(dir, 'localizacao.png')
  await page.screenshot({ path: file, animations: 'disabled', fullPage: true })
  writeFileSync(resolve(dir, 'localizacao.json'), JSON.stringify({ slot: 'home', state: 'localizacao', route: base, viewport: page.viewportSize(), scrollY: 0, fullPage: true, reference: 'Sketch: 1 Home, with the location button', capture: file }, null, 2) + '\n')
})
