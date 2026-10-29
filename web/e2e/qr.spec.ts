import { expect, test, type Page } from '@playwright/test'
import { base, collectRequests, violations } from './helpers'
import { useNoJs } from './presets'
// the same generator the build rasterises with, so the pin adapts to the built base path
import { glyphSvg, qrGlyph } from '../src/lib/qr-code'

/*
 * Mostrar QR screen (ticket #9) at 390x844 over the fixture dataset — the demo route /qr/ and the real
 * city route /:uf/:slug/qr/ render the same QrScreen template. The screen is static markup (no
 * JavaScript): the QR is pre-rendered SVG generated at build time — its content and geometry are pinned
 * by src/lib/qr-code.test.ts; here the page contract, the print layer (the poster) and the navigation are
 * checked.
 */
const path = `${base}qr/`
const ORIGIN = 'https://votoavoto.exemplo.br'
// Base-aware: under the project-pages build (SITE_BASE=/voto-a-voto-oss/) the QR encodes the city path behind the base.
const URL_ = `${ORIGIN}${base}rj/cidade-exemplo/`
const ADDRESS = `${ORIGIN.slice('https://'.length)}${base.replace(/\/$/, '')}/rj/cidade-exemplo`

function watch(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => ['error', 'warning'].includes(m.type()) && errors.push(m.text()))
  return errors
}

test.describe('qr: the screen', () => {
  test('shows the title, the fixture banner, the scannable QR and the short address', async ({ page }) => {
    const errors = watch(page)
    await page.goto(path)
    await expect(page.locator('[data-qr-screen] h1')).toHaveText('Mostrar QR')
    await expect(page.locator('[data-subtitle]')).toHaveText('Presidente 2026 · Cidade Exemplo')
    await expect(page.locator('[data-banner]')).toHaveText('EXEMPLO · QR ILUSTRATIVO, NÃO ESCANEÁVEL')
    // The pre-rendered glyph: same document title as the QR card contract, one path of dark modules.
    const svg = page.locator('[data-qr] svg')
    const qr = await svg.evaluate((el) => {
      const s = el as SVGSVGElement
      const path = s.querySelector('path')!
      return { label: s.getAttribute('aria-label'), viewBox: s.getAttribute('viewBox'), dark: (path.getAttribute('d') ?? '').match(/M/g)?.length }
    })
    expect(qr.label).toBe(`QR de ${ADDRESS}`)
    const expected = glyphSvg(qrGlyph(URL_), { label: `QR de ${ADDRESS}`, margin: 1, paper: '#ffffff' })
    expect(qr.viewBox).toBe(expected.match(/viewBox="([^"]*)"/)![1]) // one drawing quiet zone; with base the URL is longer, so the glyph grows
    expect(qr.dark).toBeGreaterThan(200) // version 4, ~30% dark modules: the drawing is there, not one blank rect
    expect(await page.locator('[data-address]').textContent()).toBe(ADDRESS)
    await expect(page.locator('[data-qr]')).toHaveAttribute('data-url', URL_)
    expect(errors).toEqual([])
  })

  test('the one-line explanation points messaging at Compartilhar', async ({ page }) => {
    await page.goto(path)
    const explain = (await page.locator('[data-explain]').innerText()).replace(/\s+/g, ' ').trim()
    expect(explain).toBe(
      'Use esta tela para mostrar o QR a outra pessoa, em outra tela, ou para imprimir. Se você vai enviar por mensagem, use o botão Compartilhar.',
    )
  })

  test('navigation: Fechar leaves (city card is #50), Voltar goes to the share sheet', async ({ page }) => {
    await page.goto(path)
    await expect(page.locator('[data-close]')).toHaveAttribute('href', base)
    await expect(page.locator('[data-back]')).toHaveAttribute('href', `${base}compartilhar/`)
  })

  test('the layout matches the frame: QR card inside 390, no sideways scroll, requests stay on site', async ({ page, baseURL }) => {
    const seen = collectRequests(page)
    const errors = watch(page)
    await page.goto(path)
    const { sw, iw, box } = await page.evaluate(() => {
      const b = document.querySelector('[data-qr]')!.getBoundingClientRect()
      return { sw: document.documentElement.scrollWidth, iw: window.innerWidth, box: { x: b.x, w: b.width } }
    })
    expect(sw).toBeLessThanOrEqual(iw)
    expect(box.w).toBeCloseTo(280, 0)
    expect(violations(seen, [new URL(baseURL!).origin])).toEqual([]) // a build-time SVG: zero runtime requests
    expect(errors).toEqual([])
  })
})

test.describe('qr: the printable poster', () => {
  test('on screen: no poster markup leaks, print markers are inert', async ({ page }) => {
    await page.goto(path)
    await expect(page.locator('[data-poster]')).toBeHidden()
    await expect(page.locator('[data-poster-city]')).toHaveText('Cidade Exemplo')
    await expect(page.locator('[data-qr-screen]')).toBeVisible()
  })

  test('print (A4 emulated): screen chrome hides, the poster shows city + short address + QR', async ({ page }) => {
    await page.emulateMedia({ media: 'print' })
    await page.goto(path)
    await expect(page.locator('[data-qr-screen]')).toBeHidden()
    await expect(page.locator('[data-poster]')).toBeVisible()
    await expect(page.locator('[data-poster-city]')).toHaveText('Cidade Exemplo')
    await expect(page.locator('[data-poster-address]')).toHaveText(ADDRESS)
    await expect(page.locator('[data-poster-qr] svg')).toBeVisible()
    await expect(page.locator('[data-poster-qr] svg path')).toHaveAttribute('d', /.+/)
    // Legible in black and white: exactly one dark fill (the token ink); the modules are that fill.
    const inks = await page.locator('[data-poster-qr] [fill]').evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute('fill')))])
    expect(inks).toEqual(['#ffffff', '#1c1b18'])
    const pdf = await page.pdf({ format: 'A4', printBackground: true })
    expect(pdf.length).toBeGreaterThan(2000)
    const { writeFile, mkdir } = await import('node:fs/promises')
    await mkdir('.captures/qr', { recursive: true })
    await writeFile('.captures/qr/poster.pdf', pdf)
  })

  test.describe('poster without JavaScript', () => {
    useNoJs()
    test('the QR, address and links are all there (the screen never needed JS)', async ({ page }) => {
      await page.goto(path)
      await expect(page.locator('[data-qr] svg')).toBeVisible()
      await expect(page.locator('[data-address]')).toHaveText(ADDRESS)
    })
  })

  test('the share sheet note says the shared image carries the address, not a QR', async ({ page }) => {
    // (issue-17's reconcile pinned this after it read the removed link as deliberate; the parent
    // restored the Mostrar QR navigation — it was #9's approved contract and the note only talks
    // about the shared IMAGE — so both pins live: note text here, the link in the next test.)
    await page.goto(`${base}compartilhar/`)
    await expect(page.locator('[data-note]')).toContainText('sem QR')
  })

  test('the share sheet links to this screen (the old slot contract navigation, wired by #9)', async ({ page }) => {
    await page.goto(`${base}compartilhar/`)
    const link = page.locator('[data-qr-link]')
    await expect(link).toHaveText('Mostrar QR')
    await expect(link).toHaveAttribute('href', `${base}qr/`)
    expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  })
})

test.describe('qr: the real city route /:uf/:slug/qr/ (fixture city)', () => {
  test('the share sheet links to the city QR route and the route carries the city on every layer', async ({ page }) => {
    const errors = watch(page)
    await page.goto(`${base}rj/cidade-exemplo/compartilhar/`)
    const link = page.locator('[data-share-sheet] [data-qr-link]')
    await expect(link).toHaveText('Mostrar QR')
    await expect(link).toHaveAttribute('href', `${base}rj/cidade-exemplo/qr/`)
    expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    await link.click()
    await expect(page.locator('[data-qr-screen] h1')).toHaveText('Mostrar QR')
    // On the fixture build every city is fictitious, so the banner still shows; a real build
    // (npm run test:real, real-data specs) draws the QR route without it.
    await expect(page.locator('[data-banner]')).toHaveText('EXEMPLO · QR ILUSTRATIVO, NÃO ESCANEÁVEL')
    await expect(page.locator('[data-address]')).toHaveText(ADDRESS)
    await expect(page.locator('[data-qr]')).toHaveAttribute('data-url', URL_)
    await expect(page.locator('[data-poster-city]')).toHaveText('Cidade Exemplo')
    // Navigation is the city card and its own share sheet.
    await expect(page.locator('[data-close]')).toHaveAttribute('href', `${base}rj/cidade-exemplo/`)
    await expect(page.locator('[data-back]')).toHaveAttribute('href', `${base}rj/cidade-exemplo/compartilhar/`)
    expect(errors).toEqual([])
  })
})