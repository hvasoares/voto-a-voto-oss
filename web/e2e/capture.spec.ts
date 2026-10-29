import { expect, test } from '@playwright/test'
import { capture } from './capture'
import { base } from './helpers'
import { PRINT_A4 } from './presets'

/*
 * Gate 2 of each page checkpoint: captures the fixture-state render at 390x844, scroll 0, next to
 * web/reference/01-home.png. The review itself is done by a fresh-context reviewer following
 * web/docs/screenshot-review-protocol.md. Output: web/.captures/ (not committed, no baselines).
 */
test('capture home / default', async ({ page }) => {
  await page.goto(base)
  await page.evaluate(() => window.scrollTo(0, 0))
  await capture(page, {
    dir: 'home',
    name: 'default',
    route: base,
    scrollY: 'page',
    fullPage: false,
    extra: { slot: 'home', state: 'default', reference: 'web/reference/01-home.png' },
  })
})

/* Ticket #7: the share sheet demo route (fixture city, 2026 · 1º turno), next to web/reference/03-compartilhamento.png. */
test('capture share / default', async ({ page }) => {
  await page.goto(`${base}compartilhar/`)
  await page.waitForFunction(() => { const i = document.querySelector('astro-island'); return !!i && !i.hasAttribute('ssr') })
  await expect(page.locator('[data-share-actions]')).toHaveAttribute('data-png', 'ready')
  await page.evaluate(() => window.scrollTo(0, 0))
  await capture(page, {
    dir: 'share',
    name: 'default',
    route: `${base}compartilhar/`,
    scrollY: 'page',
    fullPage: false,
    extra: { slot: 'share', state: 'default', reference: 'web/reference/03-compartilhamento.png' },
  })
})

/* State page (#50, the ported Sketch frame "5 Estado"), next to web/reference/05-estado.png. */
test('capture state / default', async ({ page }) => {
  await page.goto(`${base}rj/`)
  await page.waitForFunction(() => document.documentElement.dataset.ready !== undefined)
  await page.evaluate(() => window.scrollTo(0, 0))
  await capture(page, {
    dir: 'state',
    name: 'default',
    route: `${base}rj/`,
    scrollY: 'page',
    fullPage: false,
    extra: { slot: 'state', state: 'default', reference: 'web/reference/05-estado.png' },
  })
})

/* City card (#50, the ported Sketch frame "2 Cartão da cidade"; ?turno=1 is the frame's round), next to web/reference/02-cartao-da-cidade.png. */
test('capture city / card, 1º turno', async ({ page }) => {
  await page.goto(`${base}rj/cidade-exemplo/?turno=1`)
  await page.waitForFunction(() => document.documentElement.dataset.ready !== undefined)
  await page.evaluate(() => window.scrollTo(0, 0))
  await capture(page, {
    dir: 'city',
    name: 'card-turno-1',
    route: `${base}rj/cidade-exemplo/?turno=1`,
    scrollY: 'page',
    fullPage: false,
    extra: { slot: 'city', state: 'card, 1º turno', reference: 'web/reference/02-cartao-da-cidade.png' },
  })
})

/* Three cycles of a city (#50, the ported Sketch frame "9 Três ciclos (cidade)", ?turno=1 again the frame's round), next to web/reference/09-tres-ciclos-cidade.png. */
test('capture city cycles / 1º turno', async ({ page }) => {
  await page.goto(`${base}rj/cidade-exemplo/tres-ciclos/?turno=1`)
  await page.waitForFunction(() => document.documentElement.dataset.ready !== undefined)
  await page.evaluate(() => window.scrollTo(0, 0))
  await capture(page, {
    dir: 'city-cycles',
    name: 'turno-1',
    route: `${base}rj/cidade-exemplo/tres-ciclos/?turno=1`,
    scrollY: 'page',
    fullPage: false,
    extra: { slot: 'city-cycles', state: '1º turno', reference: 'web/reference/09-tres-ciclos-cidade.png' },
  })
})

/* Ticket #9: the Mostrar QR demo screen (fixture city), next to site/reference/04-mostrar-qr.png. */
test('capture qr / default', async ({ page }) => {
  await page.goto(`${base}qr/`)
  await page.evaluate(() => window.scrollTo(0, 0))
  await capture(page, {
    dir: 'qr',
    name: 'default',
    route: `${base}qr/`,
    scrollY: 'page',
    fullPage: false,
    extra: { slot: 'qr', state: 'default', reference: 'site/reference/04-mostrar-qr.png' },
  })
})

/* Ticket #9: the printable poster, A4 emulated (print media at 794x1123 CSS px = 210x297 mm at 96 dpi). */
test('capture qr / poster-print', async ({ page }) => {
  await page.setViewportSize(PRINT_A4)
  await page.emulateMedia({ media: 'print' })
  await page.goto(`${base}qr/`)
  await expect(page.locator('[data-poster]')).toBeVisible()
  await expect(page.locator('[data-qr-screen]')).toBeHidden()
  await capture(page, {
    dir: 'qr',
    name: 'poster-print',
    route: `${base}qr/`,
    scrollY: 0,
    fullPage: false,
    extra: { slot: 'qr', state: 'poster-print', media: 'print', reference: 'A4 (210x297) print layer of the same ticket' },
  })
})
