import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from '@playwright/test'
import { captureDir, waitFonts } from './capture'
import { base, maybeThrottleCpu } from './helpers'
import { shareMock } from './share-mock'

// #123 flake-hunt repeats: E2E_CPU_RATE slows the CPU of every page in this file.
test.beforeEach(async ({ page }) => maybeThrottleCpu(page))

/* Gate 2 of #38: the pictures themselves (the downloaded PNGs) in their fixture state. Output: web/.captures/cards/ (not committed). */
test('capture cards / the downloaded pictures', async ({ page }) => {
  const dir = captureDir('cards')
  await shareMock(page).install('absent')
  await page.goto(`${base}rj/cidade-exemplo/compartilhar/?ciclo=2026&turno=1`)
  await page.waitForSelector('[data-share-actions][data-png="ready"]')
  let dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Baixar imagem' }).click()
  copyFileSync((await (await dl).path())!, resolve(dir, 'city-share.png'))
  for (const [size, button] of [['square', 'Baixar imagem quadrada'], ['story', 'Baixar imagem Story'], ['preview', 'Baixar imagem de prévia']] as const) {
    await page.goto(`${base}gerador/?cidade=rj/cidade-exemplo&tamanho=${size}`)
    await page.waitForFunction(() => document.querySelector('[data-card-generator]')?.getAttribute('data-ready') === 'yes')
    // the picture the download carries is drawn in the page's faces: the fonts' own state, never a guess
    await waitFonts(page)
    dl = page.waitForEvent('download')
    await page.getByRole('button', { name: button }).click()
    copyFileSync((await (await dl).path())!, resolve(dir, `stat-${size}.png`))
  }
})
