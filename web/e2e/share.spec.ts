import { expect, test, type Page } from '@playwright/test'
import { base, collectRequests, violations } from './helpers'

/*
 * Share sheet (#7) at 390x844 over the fixture dataset, on the demo route /compartilhar/ (ticket #50 wires the real
 * /:uf/:slug/compartilhar/ route). navigator.share/canShare are stubbed: a real system sheet cannot be driven here.
 * The demo view is fixed to 2026 · 1º turno (the Sketch frame's round); #50 adds the ?ciclo/?turno tests.
 */
const path = `${base}compartilhar/`
const URL_TEXT = 'https://votoavoto.exemplo.br/'
const FILENAME = 'voto-a-voto-rj-cidade-exemplo-2026-turno-1.png'
const SIG = '137,80,78,71,13,10,26,10'

type Mode = 'files' | 'text' | 'none' | 'abort' | 'fail'
interface Recorded {
  files: { name: string; type: string; size: number }[]
  text?: string
  active: boolean
  png?: { width: number; height: number; signature: string }
}

async function open(page: Page, mode: Mode) {
  await page.addInitScript((m) => {
    const w = window as unknown as { __shares: unknown[] }
    w.__shares = []
    if (m === 'none') {
      Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
      Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true })
      return
    }
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: (d: ShareData) => (d.files ? m !== 'text' : true) })
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: (d: ShareData) => {
        const rec: Record<string, unknown> = { files: (d.files ?? []).map((f) => ({ name: f.name, type: f.type, size: f.size })), text: d.text, active: navigator.userActivation.isActive }
        w.__shares.push(rec)
        const f = d.files?.[0]
        if (f) void f.arrayBuffer().then((b) => { const v = new DataView(b); rec.png = { width: v.getUint32(16), height: v.getUint32(20), signature: [...new Uint8Array(b, 0, 8)].join(',') } })
        if (m === 'abort') return Promise.reject(new DOMException('cancelled', 'AbortError'))
        if (m === 'fail') return Promise.reject(new DOMException('no', 'NotAllowedError'))
        return Promise.resolve()
      },
    })
  }, mode)
  await page.goto(path)
  await page.waitForFunction(() => { const i = document.querySelector('astro-island'); return !!i && !i.hasAttribute('ssr') })
  await expect(page.locator('[data-share-actions]')).toHaveAttribute('data-png', 'ready')
}
const shares = (page: Page) => page.evaluate(() => (window as unknown as { __shares: Recorded[] }).__shares)
function watch(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => ['error', 'warning'].includes(m.type()) && errors.push(m.text()))
  return errors
}
const pngInfo = (buf: Buffer) => ({ signature: [...buf.subarray(0, 8)].join(','), width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) })

test.describe('share: the system share sheet', () => {
  test('shares one PNG (1080x1070) and the text with the page address, inside the tap', async ({ page }) => {
    const errors = watch(page)
    await open(page, 'files')
    await page.getByRole('button', { name: 'Compartilhar' }).click()
    await expect.poll(async () => (await shares(page))[0]?.png).toBeTruthy()
    const [s] = await shares(page)
    expect(s!.files).toHaveLength(1)
    expect(s!.files[0]).toMatchObject({ name: FILENAME, type: 'image/png' })
    expect(s!.files[0]!.size).toBeGreaterThan(5000)
    expect(s!.png).toEqual({ width: 1080, height: 1070, signature: SIG })
    expect(s!.text).toContain(`${URL_TEXT}rj/cidade-exemplo/`)
    expect(s!.text).toContain('Cidade Exemplo/RJ, 2026, 1º turno: Candidato A 52% · Candidato B 48% dos votos válidos; 30% do eleitorado não votou.')
    expect(s!.active).toBe(true)
    expect(errors).toEqual([])
  })

  test('the picture has no QR and no image element, only the short address', async ({ page }) => {
    await open(page, 'files')
    await expect(page.locator('[data-share-picture] svg image, [data-share-picture] svg foreignObject')).toHaveCount(0)
    const t = await page.locator('[data-share-picture] svg').innerHTML()
    expect(t).toContain('votoavoto.exemplo.br/rj/cidade-exemplo')
    expect(t).not.toContain('https://')
  })

  test('shares only the text when files cannot be shared', async ({ page }) => {
    const errors = watch(page)
    await open(page, 'text')
    await page.getByRole('button', { name: 'Compartilhar' }).click()
    await expect.poll(async () => (await shares(page)).length).toBe(1)
    const [s] = await shares(page)
    expect(s!.files).toEqual([])
    expect(s!.text).toContain(`${URL_TEXT}rj/cidade-exemplo/`)
    expect(errors).toEqual([])
  })

  test('a cancelled share sheet is silent: no message, no download, no console error', async ({ page }) => {
    const errors = watch(page)
    let downloads = 0
    page.on('download', () => downloads++)
    await open(page, 'abort')
    await page.getByRole('button', { name: 'Compartilhar' }).click()
    await expect.poll(async () => (await shares(page)).length).toBe(1)
    await page.waitForTimeout(300)
    await expect(page.locator('[data-status]')).toHaveText('')
    expect(downloads).toBe(0)
    expect(errors).toEqual([])
  })

  test('a failed share falls back to the download and says so', async ({ page }) => {
    const errors = watch(page)
    await open(page, 'fail')
    const dl = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Compartilhar' }).click()
    expect((await dl).suggestedFilename()).toBe(FILENAME)
    await expect(page.locator('[data-status]')).toContainText('A imagem foi baixada')
    expect(errors).toEqual([])
  })
})

test.describe('share: download fallback', () => {
  test('without a share API, "Compartilhar" downloads the PNG and the text stays on the page with a copy button', async ({ page }) => {
    const errors = watch(page)
    await open(page, 'none')
    const dl = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Compartilhar' }).click()
    const d = await dl
    expect(d.suggestedFilename()).toBe(FILENAME)
    const fs = await import('node:fs/promises')
    const buf = await fs.readFile((await d.path())!)
    expect(pngInfo(buf)).toEqual({ signature: SIG, width: 1080, height: 1070 })
    await expect(page.locator('[data-status]')).toContainText('Imagem baixada')
    await expect(page.locator('[data-text-body]')).toContainText(`${URL_TEXT}rj/cidade-exemplo/`)
    await expect(page.getByRole('button', { name: 'Copiar texto' })).toBeAttached()
    expect(errors).toEqual([])
  })

  test('"Baixar imagem" downloads the PNG even when sharing works', async ({ page }) => {
    await open(page, 'files')
    const dl = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Baixar imagem' }).click()
    expect((await dl).suggestedFilename()).toBe(FILENAME)
    expect(await shares(page)).toEqual([])
  })

  test('"Copiar texto" copies the message', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await open(page, 'none')
    await page.getByRole('button', { name: 'Copiar texto' }).click()
    await expect(page.locator('[data-status]')).toHaveText('Texto copiado.')
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(`${URL_TEXT}rj/cidade-exemplo/`)
  })
})

test.describe('share: layout and requests', () => {
  test('the sheet states the view it draws and "Fechar" leaves the sheet', async ({ page }) => {
    await open(page, 'files')
    await expect(page.locator('[data-share-picture]')).toContainText('2026 · 1º turno · RJ')
    await expect(page.locator('[data-share-sheet]')).toHaveAttribute('data-view', '2026-1')
    await expect(page.getByRole('link', { name: 'Fechar' })).toHaveAttribute('href', base)
  })

  test('no sideways scroll, 44 px targets, no request leaves the site', async ({ page, baseURL }) => {
    const seen = collectRequests(page)
    await open(page, 'files')
    await page.waitForLoadState('networkidle')
    const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
    expect(sw).toBeLessThanOrEqual(iw)
    for (const sel of ['[data-act="share"]', '[data-act="download"]', '[data-close]']) expect((await page.locator(sel).boundingBox())!.height).toBeGreaterThanOrEqual(44)
    expect(violations(seen, new URL(baseURL!).origin)).toEqual([])
  })
})

test.describe('share without JavaScript', () => {
  test.use({ javaScriptEnabled: false })
  test('the picture, the text and "Fechar" work; the buttons that need JavaScript are not offered and a sentence says why', async ({ page }) => {
    await page.goto(path)
    await expect(page.locator('h1')).toHaveText('Compartilhar resultado')
    await expect(page.locator('[data-share-picture] svg')).toBeVisible()
    await expect(page.locator('[data-text-body]')).toContainText(`${URL_TEXT}rj/cidade-exemplo/`)
    await expect(page.getByRole('link', { name: 'Fechar' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Compartilhar' })).toBeHidden()
    await expect(page.getByRole('button', { name: 'Baixar imagem' })).toBeHidden()
    await expect(page.locator('[data-nojs]')).toContainText('JavaScript')
  })
})