import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from '@playwright/test'
import { base } from './helpers'
import { viewport } from './presets'

/* Screenshot source for the review of the four follow-up entry points (web/docs/checkpoints/followup-links.md). Output: web/.captures/followup-links/ (not committed). */
const PLACES = '?mora=rj/cidade-exemplo&vota=sp/cidade-exemplo-paulista'
const SPOTS: [string, string, string, boolean][] = [
  ['gerador', 'gerador/?cidade=rj/cidade-exemplo', '[data-open-card]', false],
  ['meu-brasil', `meu-brasil/${PLACES}`, '[data-sticker-link]', false],
  ['estado', 'rj/', '.state-links', true],
  ['brasil', 'brasil/', 'nav[aria-label="Próximo"]', true],
  ['dados', 'sobre-os-dados/', 'section[aria-labelledby="licencas"]', true],
]

for (const [name, route, spot, desktop] of SPOTS) {
  for (const size of desktop ? ([[390, 844], [1440, 900]] as const) : ([[390, 844]] as const)) {
    test(`capture ${name} ${size[0]}`, async ({ page }) => {
      await page.setViewportSize(viewport(size[0], size[1]))
      await page.goto(base + route)
      if (name === 'meu-brasil') await page.locator('[data-meu-brasil][data-drawn="2"]').waitFor()
      if (name === 'gerador') await page.waitForFunction(() => document.querySelector('[data-card-generator]')?.getAttribute('data-ready') === 'yes')
      await page.evaluate(() => document.fonts.ready)
      const dir = resolve('.captures', 'followup-links')
      mkdirSync(dir, { recursive: true })
      await page.locator(spot).first().scrollIntoViewIfNeeded()
      await page.screenshot({ path: resolve(dir, `${name}-${size[0]}.png`), animations: 'disabled' })
    })
  }
}
