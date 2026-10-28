import { expect, test, type Page } from '@playwright/test'
import { base, collectRequests, violations } from './helpers'

/*
 * The share of /brasil/ (#91) at 390x844 over the fixture dataset: the Compartilhar link opens the EXISTING share sheet (the City card's: a bottom sheet over the page,
 * the ShareActions island, Mostrar QR), with the picture and the text of Brazil's result. navigator.share/canShare are stubbed: a real system sheet cannot be driven here.
 * Tests wait on the sheet's ready attribute (`data-png`), never on a time.
 */
const sheet = `${base}brasil/compartilhar/`
const URL_TEXT = `https://votoavoto.exemplo.br${base}brasil/`
const FILENAME = 'voto-a-voto-brasil-2026-turno-2.png'
const SIG = '137,80,78,71,13,10,26,10'

type Mode = 'files' | 'none' | 'abort'
interface Recorded {
  files: { name: string; type: string }[]
  text?: string
  png?: { width: number; height: number; signature: string }
}

async function open(page: Page, mode: Mode, route = sheet) {
  await page.addInitScript((m) => {
    const w = window as unknown as { __shares: unknown[] }
    w.__shares = []
    if (m === 'none') {
      Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
      Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true })
      return
    }
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true })
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: (d: ShareData) => {
        const rec: Record<string, unknown> = { files: (d.files ?? []).map((f) => ({ name: f.name, type: f.type })), text: d.text }
        w.__shares.push(rec)
        const f = d.files?.[0]
        if (f) void f.arrayBuffer().then((b) => { const v = new DataView(b); rec.png = { width: v.getUint32(16), height: v.getUint32(20), signature: [...new Uint8Array(b, 0, 8)].join(',') } })
        return m === 'abort' ? Promise.reject(new DOMException('cancelled', 'AbortError')) : Promise.resolve()
      },
    })
  }, mode)
  await page.goto(route)
  await page.waitForFunction(() => { const i = document.querySelector('astro-island'); return !!i && !i.hasAttribute('ssr') })
  await expect(page.locator('[data-share-actions]')).toHaveAttribute('data-png', 'ready')
}
const shares = (page: Page) => page.evaluate(() => (window as unknown as { __shares: Recorded[] }).__shares)

test.describe('/brasil/: the Compartilhar action', () => {
  test('the page has a Compartilhar link with a 44 px target that opens the share sheet', async ({ page }) => {
    await page.goto(`${base}brasil/`)
    const link = page.locator('[data-share]')
    await expect(link).toHaveText('Compartilhar')
    await expect(link).toHaveAttribute('href', sheet)
    const box = (await link.boundingBox())!
    expect(box.height).toBeGreaterThanOrEqual(44)
    expect(box.y + box.height, 'reachable without scrolling').toBeLessThan(844)
    await link.click()
    await expect(page).toHaveURL(sheet)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Compartilhar resultado')
  })

  test('works without JavaScript: the link, the picture and the message text are there; only the buttons need scripts', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } })
    const page = await ctx.newPage()
    await page.goto(`${base}brasil/`)
    await expect(page.locator('[data-share]')).toBeVisible()
    await page.goto(sheet)
    await expect(page.locator('[data-share-picture] svg')).toBeVisible()
    await expect(page.locator('[data-text-body]')).toContainText(URL_TEXT)
    await expect(page.locator('[data-nojs]')).toContainText('Sem JavaScript não dá para compartilhar')
    await ctx.close()
  })
})

test.describe('/brasil/compartilhar/: the sheet', () => {
  test('shares one PNG and the neutral sentence with the page address, inside the tap', async ({ page }) => {
    await open(page, 'files')
    await page.getByRole('button', { name: 'Compartilhar' }).click()
    await expect.poll(async () => (await shares(page))[0]?.png).toBeTruthy()
    const [s] = await shares(page)
    expect(s!.files).toEqual([{ name: FILENAME, type: 'image/png' }])
    expect(s!.png).toMatchObject({ width: 1080, signature: SIG })
    expect(s!.text).toMatch(/^No Brasil, no 2º turno de 2026, os votos válidos foram: Candidato A \d\d,\d\d% e Candidato B \d\d,\d\d%\. https:/)
    expect(s!.text).toContain(URL_TEXT)
    expect(s!.text).not.toMatch(/venceu|ganhou|lidera|à frente|porque/i)
  })

  test('the numbers of the picture, of the text and of the page are the same', async ({ page }) => {
    await page.goto(`${base}brasil/`)
    const onPage = await page.locator('[data-brasil-bar] span').allTextContents()
    const shares2 = onPage.map((t) => /(\d\d,\d\d)%/.exec(t)![1]!)
    const regions = await page.locator('[data-regiao]').evaluateAll((els) => els.map((e) => ({ name: e.querySelector('h3')!.textContent!, turnout: e.querySelector('[data-participacao]')!.textContent!.trim() })))
    await open(page, 'files')
    const alt = (await page.locator('[data-share-picture] svg title').textContent())!
    const text = (await page.locator('[data-text-body]').textContent())!
    for (const n of shares2) {
      expect(alt).toContain(`${n}%`)
      expect(text).toContain(`${n}%`)
    }
    const picture = (await page.locator('[data-share-picture] svg text').allTextContents()).join(' ')
    for (const r of regions) {
      expect(picture).toContain(r.turnout)
      expect(alt).toContain(r.name)
    }
  })

  test('without the system share: Copiar link, Baixar imagem and Mostrar QR are there, with 44 px targets', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await open(page, 'none')
    await expect(page.getByRole('button', { name: 'Compartilhar' })).toBeHidden()
    for (const sel of ['[data-act="copy-link"]', '[data-act="download"]', '[data-qr-link]', '[data-close]']) expect((await page.locator(sel).boundingBox())!.height, sel).toBeGreaterThanOrEqual(44)
    await page.getByRole('button', { name: 'Copiar link' }).click()
    await expect(page.locator('[data-status]')).toHaveText('Link copiado.')
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(URL_TEXT)
    const dl = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Baixar imagem' }).click()
    expect((await dl).suggestedFilename()).toBe(FILENAME)
    await page.locator('[data-qr-link]').click()
    await expect(page).toHaveURL(`${base}brasil/qr/`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mostrar QR')
    await expect(page.locator('[data-qr]')).toHaveAttribute('data-url', URL_TEXT)
  })

  test('a cancelled share is silent', async ({ page }) => {
    await open(page, 'abort')
    await page.getByRole('button', { name: 'Compartilhar' }).click()
    await expect.poll(async () => (await shares(page)).length).toBe(1)
    await expect(page.locator('[data-status]')).toHaveText('')
  })

  test('"Fechar" returns to /brasil/, which is the dimmed backdrop; no sideways scroll; nothing leaves the site', async ({ page, baseURL }) => {
    const seen = collectRequests(page)
    await open(page, 'files')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('link', { name: 'Fechar' })).toHaveAttribute('href', `${base}brasil/`)
    await expect(page.locator('[data-share-backdrop] [data-brasil-national]')).toBeAttached()
    await expect(page.locator('[data-share-backdrop] [data-share]')).toHaveCount(0)
    const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
    expect(sw).toBeLessThanOrEqual(iw)
    expect(violations(seen, [new URL(baseURL!).origin])).toEqual([])
  })
})
