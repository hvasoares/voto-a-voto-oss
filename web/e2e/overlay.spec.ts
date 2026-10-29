import { expect, test } from '@playwright/test'
import sharp from 'sharp'
import { base, collectRequests, maybeThrottleCpu } from './helpers'
import { OVERLAY_FRAME, viewport } from './presets'

/*
 * The live overlay (#68) over the fixture dataset: the builder (place, measure, cycle, size, background, OBS steps, copy), the overlay address that reproduces the
 * configuration, the source seal that cannot be turned off, the three sizes, the transparent canvas and the absence of any request beyond the site and of any analytics.
 */
const Q = '?c=rj/cidade-exemplo&m=nv&a=2026&t=2&s=1920x1080&f=transparente'
const overlay = (q = Q) => `${base}overlay/tela/${q}`

// #122 flake-hunt repeats: E2E_CPU_RATE slows the CPU of every page in this file (the clipboard
// contexts below call `maybeThrottleCpu` on their own pages).
test.beforeEach(async ({ page }) => maybeThrottleCpu(page))

test.describe('Overlay para live', () => {
  for (const [w, h] of [[1920, 1080], [1280, 720], [600, 200]] as const) {
    test(`works at ${w}x${h}: the number, the sentence and the seal fit the canvas`, async ({ page }) => {
      await page.setViewportSize(viewport(w, h))
      await page.goto(overlay(`?c=rj/cidade-exemplo&m=nv&a=2026&t=2&s=${w}x${h}&f=claro`))
      await expect(page.locator('[data-overlay]')).toHaveAttribute('data-ready', 'yes')
      await expect(page.locator('[data-big]')).toHaveText(/^\d+(,\d)?%$/)
      await expect(page.locator('[data-sentence]')).toContainText('dos eleitores de Cidade Exemplo não votaram no 2º turno de 2026.')
      for (const sel of ['[data-big]', '[data-sentence]', '[data-seal]']) {
        const box = (await page.locator(sel).boundingBox())!
        expect(box.x, sel).toBeGreaterThanOrEqual(0)
        expect(box.y, sel).toBeGreaterThanOrEqual(0)
        expect(box.x + box.width, sel).toBeLessThanOrEqual(w + 0.5)
        expect(box.y + box.height, sel).toBeLessThanOrEqual(h + 0.5)
      }
      expect(await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight])).toEqual([w, h])
    })
  }

  test('the source seal is always there, whatever the address says', async ({ page }) => {
    for (const extra of ['', '&seal=0', '&selo=off', '&fonte=0', '&source=none', '&hideSeal=1']) {
      await page.goto(overlay(`${Q}${extra}`))
      await expect(page.locator('[data-seal]'), extra).toContainText('TSE')
      await expect(page.locator('[data-seal]'), extra).toContainText('dados fictícios')
      await expect(page.locator('[data-seal]'), extra).toBeVisible()
    }
  })

  test('the transparent background renders on a transparent canvas (alpha 0 outside the card, opaque inside); dark and light fill the canvas', async ({ page }) => {
    await page.setViewportSize(OVERLAY_FRAME)
    await page.goto(overlay())
    await expect(page.locator('[data-overlay]')).toHaveAttribute('data-ready', 'yes')
    const png = await page.screenshot({ omitBackground: true })
    const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const alpha = (x: number, y: number) => data[(y * info.width + x) * 4 + 3]!
    expect(alpha(0, 0)).toBe(0)
    expect(alpha(info.width - 1, 0)).toBe(0)
    expect(alpha(5, info.height - 5)).toBe(0)
    expect(alpha(Math.round(info.width / 2), Math.round(info.height * 0.1))).toBe(255)
    for (const f of ['escuro', 'claro']) {
      await page.goto(overlay(`${Q.replace('transparente', f)}`))
      await expect(page.locator('[data-overlay]')).toHaveAttribute('data-ready', 'yes')
      const p2 = await sharp(await page.screenshot({ omitBackground: true })).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
      expect(p2.data[3], f).toBe(255)
    }
  })

  test('the number follows the measure and cycle of the address, and a place without data says so', async ({ page }) => {
    await page.goto(overlay('?c=rj/cidade-exemplo&m=margem&a=2026&t=2&s=1920x1080&f=claro'))
    await expect(page.locator('[data-sentence]')).toContainText('votos separaram os dois primeiros')
    await page.goto(overlay('?c=rj/cidade-exemplo&m=nv&a=2018&t=1&s=1920x1080&f=claro'))
    await expect(page.locator('[data-overlay]')).toHaveAttribute('data-ready', 'yes')
    await page.goto(overlay('?m=nv'))
    await expect(page.locator('[data-status]')).toHaveText('Overlay sem cidade: confira o endereço.')
    await expect(page.locator('[data-seal]')).toBeVisible()
  })

  test('makes no request beyond the site\'s own files and no analytics call', async ({ page }) => {
    const seen = collectRequests(page)
    await page.goto(overlay())
    await expect(page.locator('[data-overlay]')).toHaveAttribute('data-ready', 'yes')
    const origin = new URL(page.url()).origin
    expect(seen.filter((r) => !r.url.startsWith(origin)).map((r) => r.url)).toEqual([])
    expect(seen.filter((r) => r.method !== 'GET')).toEqual([])
    expect(seen.filter((r) => /gtag|googletagmanager|google-analytics|collect/.test(r.url))).toEqual([])
    expect(await page.evaluate(() => 'dataLayer' in window)).toBe(false)
  })
})

test.describe('Overlay builder', () => {
  test('lists the steps for OBS and copies an address that reproduces the chosen overlay', async ({ browser }) => {
    const ctx = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] })
    const page = await ctx.newPage()
    await maybeThrottleCpu(page)
    await page.goto(`${base}overlay/?c=rj/cidade-exemplo`)
    await expect(page.locator('[data-builder]')).toHaveAttribute('data-ready', 'yes')
    await page.locator('[data-option="Medida:margem"]').click()
    await page.locator('[data-option="Ciclo:2022"]').click()
    await page.locator('[data-option="Tamanho:600x200"]').click()
    await page.locator('[data-option="Fundo:escuro"]').click()
    await expect(page.locator('[data-obs-steps]')).toContainText('Em Fontes, clique em + e escolha Navegador.')
    await expect(page.locator('[data-obs-steps]')).toContainText('largura 600 e altura 200')
    await page.locator('[data-copy]').click()
    await expect(page.locator('[data-status]')).toHaveText('Endereço copiado.')
    const copied = await page.evaluate(() => navigator.clipboard.readText())
    expect(copied).toBe(`https://votoavoto.exemplo.br${base}overlay/tela/?c=rj/cidade-exemplo&m=margem&a=2022&t=2&s=600x200&f=escuro`)
    const path = copied.replace('https://votoavoto.exemplo.br', '')
    await page.goto(path)
    await expect(page.locator('[data-overlay]')).toHaveAttribute('data-background', 'escuro')
    await expect(page.locator('[data-sentence]')).toContainText('votos separaram os dois primeiros')
    await ctx.close()
  })

  test('a choice tapped while the island is still hydrating is kept, not lost (the address copied afterwards carries it)', async ({ browser }) => {
    const ctx = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] })
    const page = await ctx.newPage()
    await maybeThrottleCpu(page)
    // Hold every script back so the tap lands on the static markup, as it does on a slow phone or a loaded CI runner.
    let release!: () => void
    const gate = new Promise<void>((r) => (release = r))
    await page.route(/\/_astro\/.*\.js/, async (route) => {
      await gate
      await route.continue()
    })
    await page.goto(`${base}overlay/?c=rj/cidade-exemplo`, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('[data-builder]')).toHaveAttribute('data-ready', 'no')
    await page.locator('[data-option="Medida:margem"]').click()
    await page.locator('[data-option="Fundo:escuro"]').click()
    release()
    await expect(page.locator('[data-builder]')).toHaveAttribute('data-ready', 'yes')
    await expect(page.locator('[data-option="Medida:margem"]')).toHaveAttribute('aria-pressed', 'true')
    await page.locator('[data-copy]').click()
    await expect(page.locator('[data-status]')).toHaveText('Endereço copiado.')
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('m=margem&a=2026&t=2&s=1920x1080&f=escuro')
    await ctx.close()
  })

  test('the seal is a note, not a control; there is no way to turn it off, and no analytics', async ({ page }) => {
    const seen = collectRequests(page)
    await page.goto(`${base}overlay/?c=rj/cidade-exemplo`)
    await expect(page.locator('[data-seal-note]')).toContainText('sempre ligado')
    expect(await page.locator('[data-seal-note] input, [data-seal-note] button, [data-seal-note] [role="switch"]').count()).toBe(0)
    await expect(page.locator('[data-preview]')).toBeVisible()
    const origin = new URL(page.url()).origin
    expect(seen.filter((r) => !r.url.startsWith(origin)).map((r) => r.url)).toEqual([])
    expect(await page.evaluate(() => 'dataLayer' in window)).toBe(false)
  })

  test('without a place it asks for one and offers no address to copy', async ({ page }) => {
    await page.goto(`${base}overlay/`)
    await expect(page.locator('[data-placeholder]')).toContainText('Escolha uma cidade')
    await expect(page.locator('[data-copy]')).toBeDisabled()
  })
})
