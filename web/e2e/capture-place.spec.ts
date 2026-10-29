import { test } from '@playwright/test'
import { capture } from './capture'
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
  await page.waitForFunction(() => document.documentElement.dataset.ready !== undefined)
  await capture(page, {
    dir: 'home',
    name: 'sua-cidade',
    route: base,
    scrollY: 0,
    fullPage: true,
    extra: { slot: 'home', state: 'sua-cidade', reference: 'Sketch: 1 Home, with the Sua cidade shortcut' },
  })
})
