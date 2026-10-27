import { copyFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from '@playwright/test'
import { base } from './helpers'

/* Gate 2 of #38: the pictures themselves (the downloaded PNGs) in their fixture state. Output: web/.captures/cards/ (not committed). */
test('capture cards / the downloaded pictures', async ({ page }) => {
  const dir = resolve('.captures', 'cards')
  mkdirSync(dir, { recursive: true })
  await page.addInitScript(() => Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }))
  await page.goto(`${base}rj/cidade-exemplo/compartilhar/?ciclo=2026&turno=1`)
  await page.waitForSelector('[data-share-actions][data-png="ready"]')
  let dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Baixar imagem' }).click()
  copyFileSync((await (await dl).path())!, resolve(dir, 'city-share.png'))
  for (const [size, button] of [['square', 'Baixar imagem quadrada'], ['story', 'Baixar imagem Story'], ['preview', 'Baixar imagem de prévia']] as const) {
    await page.goto(`${base}gerador/?cidade=rj/cidade-exemplo&tamanho=${size}`)
    await page.waitForFunction(() => document.querySelector('[data-card-generator]')?.getAttribute('data-ready') === 'yes')
    await page.waitForTimeout(300)
    dl = page.waitForEvent('download')
    await page.getByRole('button', { name: button }).click()
    copyFileSync((await (await dl).path())!, resolve(dir, `stat-${size}.png`))
  }
})
