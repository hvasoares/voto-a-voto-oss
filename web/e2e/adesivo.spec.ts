import { readFile } from 'node:fs/promises'
import jsQR from 'jsqr'
import { expect, test, type Page } from '@playwright/test'
import sharp from 'sharp'
import { base } from './helpers'

/*
 * The Meu Brasil sticker (#37) at 390x844 over the fixture dataset: the PNG downloaded from the page is 1080x1920 with a transparent
 * background, its QR decodes to the card's address (the places in it) and the page's alt text is the generated sentence.
 */
const Q = '?mora=rj/cidade-exemplo&vota=sp/cidade-exemplo-paulista'
const route = `${base}meu-brasil/adesivo/${Q}`

async function open(page: Page, share = false) {
  await page.addInitScript((s) => {
    if (!s) Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
    else {
      const w = window as unknown as { __shares: unknown[] }
      w.__shares = []
      Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true })
      Object.defineProperty(navigator, 'share', { configurable: true, value: (d: ShareData) => (w.__shares.push({ files: (d.files ?? []).map((f) => f.name), text: d.text }), Promise.resolve()) })
    }
  }, share)
  await page.goto(route)
  // The places load one by one (a card with one place is drawn first): wait for the picture of BOTH, the condition the page itself ends on, before reading its PNG.
  await expect(page.locator('[data-sticker-page]')).toHaveAttribute('data-places', '2')
  await expect(page.locator('[data-share-actions]')).toHaveAttribute('data-png', 'ready')
}

test.describe('Meu Brasil sticker', () => {
  test('the downloaded PNG is 1080x1920, transparent outside the card, and its QR decodes to the card address', async ({ page }) => {
    await open(page)
    const dl = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Baixar adesivo (PNG)' }).click()
    const d = await dl
    expect(d.suggestedFilename()).toBe('voto-a-voto-meu-brasil-adesivo.png')
    const { data, info } = await sharp(await readFile((await d.path())!)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    expect([info.width, info.height]).toEqual([1080, 1920])
    expect(data[3]).toBe(0)
    const flat = await sharp(await readFile((await d.path())!)).flatten({ background: '#ffffff' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const code = jsQR(new Uint8ClampedArray(flat.data), flat.info.width, flat.info.height)
    expect(code?.data).toBe(`https://votoavoto.exemplo.br${base}meu-brasil/${Q}`)
  })

  test('the page shows the sticker on a checkerboard with the generated text alternative, and the headline is the card\'s', async ({ page }) => {
    await open(page)
    await expect(page.locator('[data-checker]')).toBeVisible()
    await expect(page.locator('[data-alt]')).toContainText('Texto alternativo gerado: “Adesivo Meu Brasil: No 2º turno de 2026, a parcela do eleitorado que não votou foi de')
    const printed = (await page.locator('[data-sticker-picture] svg text').allTextContents()).join(' ')
    expect(printed).toContain('No 2º turno de 2026, a parcela')
    expect(printed).toContain('MEU BRASIL')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })

  test('shares the picture and the card link through the system sheet', async ({ page }) => {
    await open(page, true)
    await page.getByRole('button', { name: 'Compartilhar' }).click()
    await expect.poll(() => page.evaluate(() => (window as unknown as { __shares: unknown[] }).__shares.length)).toBe(1)
    const [s] = await page.evaluate(() => (window as unknown as { __shares: { files: string[]; text: string }[] }).__shares)
    expect(s!.files).toEqual(['voto-a-voto-meu-brasil-adesivo.png'])
    expect(s!.text).toContain(`https://votoavoto.exemplo.br${base}meu-brasil/${Q}`)
  })

  test('without places it asks for them; without JavaScript it says what it needs', async ({ page, browser }) => {
    await page.goto(`${base}meu-brasil/adesivo/`)
    await expect(page.getByText('Escolha ao menos um lugar para ver o cartão.')).toBeVisible()
    const ctx = await browser.newContext({ javaScriptEnabled: false })
    const p2 = await ctx.newPage()
    await p2.goto(route)
    await expect(p2.locator('[data-nojs]')).toContainText('precisa de JavaScript')
    await ctx.close()
  })

  test('no page of the site links to it yet (an entry point is for the user to decide)', async ({ page }) => {
    for (const path of ['', 'meu-brasil/' + Q, 'rj/', 'rj/cidade-exemplo/', 'rj/cidade-exemplo/compartilhar/', 'sobre-os-dados/']) {
      await page.goto(`${base}${path}`)
      expect(await page.locator('a[href*="meu-brasil/adesivo"]').count(), path).toBe(0)
    }
  })
})
