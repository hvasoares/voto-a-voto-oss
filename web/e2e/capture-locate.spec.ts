import { test } from '@playwright/test'
import { capture } from './capture'
import { base } from './helpers'
import { acknowledgeNotice } from './presets'

/*
 * Gate 2 of ticket #40: Home with the "Usar minha localização" button (fixture state: nothing remembered, button
 * offered), next to the Sketch frame "1 Home, with the location button" (page "Election SPA v3", 390x916). The frame
 * is taller than the viewport, so the capture is full-page, taken after the metrics notice was acknowledged.
 */
test('capture home / localizacao', async ({ page }) => {
  await acknowledgeNotice(page)
  await page.goto(base)
  await page.waitForFunction(() => document.documentElement.dataset.ready !== undefined)
  await capture(page, {
    dir: 'home',
    name: 'localizacao',
    route: base,
    scrollY: 0,
    fullPage: true,
    extra: { slot: 'home', state: 'localizacao', reference: 'Sketch: 1 Home, with the location button' },
  })
})
