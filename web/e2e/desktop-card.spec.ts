import { expect, test, type Page } from '@playwright/test'
import { base, collectRequests, expectNoHorizontalScroll, resizeTo, WIDTHS } from './helpers'
import { useNoJs } from './presets'

/* Ticket #52: the city card, the share dialog and Mostrar QR on desktop. Fixture dataset: Cidade Exemplo, RJ. */
const city = `${base}rj/cidade-exemplo/`
const SCREENS = { cartão: city, compartilhar: `${city}compartilhar/`, qr: `${city}qr/` } as const

for (const [name, url] of Object.entries(SCREENS)) {
  for (const width of WIDTHS) {
    test(`${name} at ${width} px does not scroll sideways`, async ({ page }) => {
      await resizeTo(page, width)
      await page.goto(url)
      await expectNoHorizontalScroll(page)
    })
  }
  test(`${name}: a phone does not fetch the desktop module`, async ({ page }) => {
    const seen = collectRequests(page)
    await resizeTo(page, 390)
    await page.goto(url)
    await page.waitForLoadState('networkidle')
    expect(seen.filter((r) => /desktop-shell|topbar-search/.test(r.url))).toEqual([])
  })
}

test.describe('city card: the lines of the V3 frame (#26, #41, #31, #33)', () => {
  test('the right column reads headline, arc, margin line, twin, Compartilhar in that order, and the curiosities card sits under the figures', async ({ page }) => {
    await page.goto(city)
    const y = async (selector: string) => (await page.locator(selector).first().boundingBox())!.y
    const order = [await y('[data-headline]:visible'), await y('.city-arc__pill:visible'), await y('[data-margin]:visible'), await y('[data-twin]'), await y('[data-share]')]
    expect(order).toEqual([...order].sort((a, b) => a - b))
    const card = (await page.locator('[data-city-card]').boundingBox())!
    const curio = (await page.locator('.city-curio').boundingBox())!
    expect(curio.y).toBeGreaterThan(card.y + card.height)
    expect(curio.x).toBe(card.x)
    await expect(page.locator('.city-curio .curio__fact')).toHaveCount(3)
    await expect(page.locator('.city-curio .curio__note:visible')).toContainText('não um indício de irregularidade')
    await expect(page.getByRole('link', { name: /Curiosidades da cidade/ })).toHaveCount(0)
  })
})

test.describe('city card', () => {
  test('at 1440 the card is the left column, the sentence, Compartilhar and the links the right', async ({ page }) => {
    await page.goto(city)
    const card = await page.locator('[data-city-card]').boundingBox()
    const words = await page.locator('[data-city-words] [data-headline]:visible').boundingBox()
    const share = await page.getByRole('link', { name: 'Compartilhar' }).boundingBox()
    const links = await page.getByRole('navigation', { name: 'Mais sobre a cidade' }).boundingBox()
    expect(words!.x).toBeGreaterThan(card!.x + card!.width)
    expect(share!.x).toBe(words!.x)
    expect(share!.y).toBeGreaterThan(words!.y + words!.height)
    expect(links!.y).toBeGreaterThan(share!.y)
    expect(card!.width).toBeLessThanOrEqual(640)
    expect(share!.width).toBeLessThanOrEqual(480)
  })

  test('the desktop page has one header: the top bar replaces the page header', async ({ page }) => {
    await page.goto(city)
    await expect(page.locator('.app-header')).toBeHidden()
    await expect(page.locator('[data-component="top-bar"]')).toBeVisible()
  })

  test('at 390 and 768 it is one column in the phone order: card, sentence, Compartilhar, links', async ({ page }) => {
    for (const width of [390, 768]) {
      await resizeTo(page, width)
      await page.goto(city)
      const ys = await Promise.all([
        page.locator('[data-city-card]').boundingBox(),
        page.locator('[data-city-words] [data-headline]:visible').boundingBox(),
        page.getByRole('link', { name: 'Compartilhar' }).boundingBox(),
        page.getByRole('navigation', { name: 'Mais sobre a cidade' }).boundingBox(),
      ])
      expect(ys.map((b) => Math.round(b!.y))).toEqual([...ys.map((b) => Math.round(b!.y))].sort((a, b) => a - b))
    }
  })

  test('the printed values stay in the card (no meaning by colour alone): every legend row carries its number', async ({ page }) => {
    await page.goto(city)
    const rows = await page.locator('[data-city-card] [data-view]:not([hidden]) .legend__row').allInnerTexts()
    expect(rows).toHaveLength(5)
    for (const row of rows) expect(row).toMatch(/\d/)
  })

  test('the cycle and round switches still work at 1440 (the sentence follows the card)', async ({ page }) => {
    await page.goto(`${city}?ciclo=2026&turno=1`)
    await page.waitForFunction(() => document.documentElement.dataset.ready === 'city-card')
    await page.getByRole('link', { name: '2º turno' }).click()
    await expect(page.locator('[data-city-words] [data-headline]:visible')).toContainText('no 2º turno de 2026')
    await expect(page.locator('[data-city-card] [data-view]:not([hidden]) .turnout__title').first()).toContainText('Votaram')
  })
})

type Mode = 'share' | 'none'
async function openShare(page: Page, mode: Mode) {
  await page.addInitScript((m) => {
    if (m === 'none') {
      Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
      Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true })
    } else {
      Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true })
      Object.defineProperty(navigator, 'share', { value: () => Promise.resolve(), configurable: true })
    }
  }, mode)
  await page.goto(`${city}compartilhar/`)
  await page.waitForFunction(() => document.querySelector('[data-share-actions]:not([hidden]) [data-act]:not([hidden])'))
}

test.describe('share dialog', () => {
  test('at 1440 it is a centered 480 px dialog over a dimmed page, with the card behind it', async ({ page }) => {
    await openShare(page, 'none')
    const box = await page.locator('[data-share-sheet]').boundingBox()
    expect(Math.round(box!.width)).toBe(480)
    expect(Math.round(box!.x * 2 + box!.width)).toBe(1440)
    await expect(page.locator('[data-share-dim]')).toBeVisible()
    await expect(page.locator('[data-share-backdrop] [data-city-card]')).toBeVisible()
  })

  test('without the Web Share API: Copiar link, Baixar imagem and Mostrar QR; no native share button', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await openShare(page, 'none')
    await expect(page.getByRole('button', { name: 'Compartilhar' })).toBeHidden()
    await expect(page.getByRole('button', { name: 'Copiar link' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Baixar imagem' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Mostrar QR' })).toBeVisible()
    await page.getByRole('button', { name: 'Copiar link' }).click()
    await expect(page.locator('[data-status]')).toHaveText('Link copiado.')
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`https://votoavoto.exemplo.br${base}rj/cidade-exemplo/`)
    await expect(page.locator('[data-share-text]')).toBeHidden() // the message text is the narrow screens' copy path
  })

  test('without the Web Share API Baixar imagem downloads the PNG and Mostrar QR opens the QR page', async ({ page }) => {
    await openShare(page, 'none')
    await expect(page.locator('[data-share-actions]')).toHaveAttribute('data-png', 'ready')
    const dl = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Baixar imagem' }).click()
    expect((await dl).suggestedFilename()).toBe('voto-a-voto-rj-cidade-exemplo-2026-turno-2.png')
    await page.getByRole('link', { name: 'Mostrar QR' }).click()
    await expect(page).toHaveURL(`${city}qr/`)
  })

  test('with the Web Share API the native button is offered and Copiar link is not', async ({ page }) => {
    await openShare(page, 'share')
    await expect(page.getByRole('button', { name: 'Compartilhar' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Copiar link' })).toHaveCount(0)
  })
})

test.describe('Mostrar QR', () => {
  test('at 1440 it is one centered page: title, QR, the short address and the print button', async ({ page }) => {
    await page.goto(`${city}qr/`)
    await expect(page.getByRole('heading', { name: 'Mostrar QR' })).toBeVisible()
    await expect(page.locator('[data-qr]')).toBeVisible()
    await expect(page.locator('[data-address]')).toHaveText(`votoavoto.exemplo.br${base.replace(/\/$/, '')}/rj/cidade-exemplo`)
    await expect(page.getByRole('button', { name: 'Imprimir cartaz' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Voltar' })).toHaveAttribute('href', `${city}compartilhar/`)
    const qr = await page.locator('[data-qr]').boundingBox()
    expect(Math.round(qr!.x * 2 + qr!.width)).toBe(1440)
    await expect(page.locator('.app-header, [data-header]')).toBeHidden()
  })

  test('the print button opens the browser print dialog', async ({ page }) => {
    await page.addInitScript(() => {
      ;(window as unknown as { __printed: number }).__printed = 0
      window.print = () => void ((window as unknown as { __printed: number }).__printed += 1)
    })
    await page.goto(`${city}qr/`)
    await page.getByRole('button', { name: 'Imprimir cartaz' }).click()
    expect(await page.evaluate(() => (window as unknown as { __printed: number }).__printed)).toBe(1)
  })

  test('the print button is not drawn on a phone', async ({ page }) => {
    await resizeTo(page, 390)
    await page.goto(`${city}qr/`)
    await expect(page.getByRole('button', { name: 'Imprimir cartaz' })).toBeHidden()
  })

  test.describe('without JavaScript', () => {
    useNoJs()
    test('the QR, the address and Voltar are there; a print button that could not work is not', async ({ page }) => {
      await page.goto(`${city}qr/`)
      await expect(page.locator('[data-qr]')).toBeVisible()
      await expect(page.getByRole('link', { name: 'Voltar' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Imprimir cartaz' })).toBeHidden()
    })
  })
})
