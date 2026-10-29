import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from '@playwright/test'
import { base } from './helpers'
import { viewport, acknowledgeNotice } from './presets'

/*
 * Gate 2 of the desktop tickets (G10): the fixture-state render of each screen at 1440x900 (and the phone-width and tablet
 * renders for the layout rows), written to web/.captures/desktop/<name>-<width>.png, to be compared with the frame of the
 * same name on the Sketch page "Election SPA v3 desktop". Set CAPTURE=name,name to capture a subset.
 */
const SCREENS: Record<string, string> = {
  home: '',
  cidade: 'rj/cidade-exemplo/',
  compartilhar: 'rj/cidade-exemplo/compartilhar/?ciclo=2026&turno=1',
  'compartilhar-sem-share': 'rj/cidade-exemplo/compartilhar/?ciclo=2026&turno=1',
  qr: 'rj/cidade-exemplo/qr/',
  estado: 'rj/',
  relatorios: 'relatorios/',
  'cidades-que-viraram': 'relatorios/cidades-que-viraram/',
  brasil: 'brasil/',
  'comparar-2022': 'comparar/2022/',
  'comparar-2018': 'comparar/2018/',
  'como-cada-grupo-votou': 'relatorios/como-cada-grupo-votou/',
  'tres-ciclos-cidade': 'rj/cidade-exemplo/tres-ciclos/',
  'tres-ciclos-estado': 'tres-ciclos/rj/',
  mapa: 'mapa/',
  'mapa-virada': 'mapa/virada/',
  sobre: 'sobre-os-dados/',
}
const only = process.env.CAPTURE?.split(',')
const WIDTHS = [1440, 768, 390]

for (const [name, path] of Object.entries(SCREENS)) {
  if (only && !only.includes(name)) continue
  for (const width of WIDTHS) {
    test(`capture desktop ${name} ${width}`, async ({ page }) => {
      await page.setViewportSize(viewport(width, width === 390 ? 844 : 900))
      // The frames are the first-visit-free state and a browser without the Web Share API ("3 Compartilhar (desktop)").
      await acknowledgeNotice(page)
      if (name === 'compartilhar-sem-share') await page.addInitScript(() => Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }))
      await page.goto(base + path)
      await page.evaluate(() => document.fonts.ready)
      await page.waitForTimeout(300)
      const dir = resolve('.captures', 'desktop')
      mkdirSync(dir, { recursive: true })
      await page.screenshot({ path: resolve(dir, `${name}-${width}.png`), animations: 'disabled', fullPage: process.env.FULL === '1' })
    })
  }
}
