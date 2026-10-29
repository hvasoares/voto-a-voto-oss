import { expect, test, type Page } from '@playwright/test'
import { base, collectRequests, violations } from './helpers'
import { useNoJs } from './presets'
import { shareMock, type ShareMode } from './share-mock'

/*
 * Share sheet (#7) at 390x844 over the fixture dataset. The demo route /compartilhar/ carries the sheet contract;
 * #50 wired the real /:uf/:slug/compartilhar/ route (the city card as backdrop), whose ?ciclo/?turno tests are the
 * "real route" describes below. navigator.share/canShare are stubbed: a real system sheet cannot be driven here.
 */
const path = `${base}compartilhar/`
// Base-aware: under the project-pages build the shared URL carries the base path (cityUrl withBase).
const URL_TEXT = `https://votoavoto.exemplo.br${base}`
const FILENAME = 'voto-a-voto-rj-cidade-exemplo-2026-turno-1.png'
const SIG = '137,80,78,71,13,10,26,10'


async function openRaw(page: Page, mode: ShareMode, route = path) {
  await shareMock(page).install(mode)
  await page.goto(route)
  await page.waitForFunction(() => { const i = document.querySelector('astro-island'); return !!i && !i.hasAttribute('ssr') })
}

/** openRaw plus the PNG-made signal; a view without data has no picture and never gets ready. */
async function open(page: Page, mode: ShareMode, route = path) {
  await openRaw(page, mode, route)
  await expect(page.locator('[data-share-actions]')).toHaveAttribute('data-png', 'ready')
}
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
    await open(page, 'shares')
    await page.getByRole('button', { name: 'Compartilhar' }).click()
    const [s] = await shareMock(page).waitForCalls(1)
    expect(s!.files).toHaveLength(1)
    expect(s!.files[0]).toMatchObject({ name: FILENAME, type: 'image/png' })
    expect(s!.files[0]!.size).toBeGreaterThan(5000)
    expect(s!.png).toEqual({ width: 1080, height: 1070, signature: SIG })
    expect(s!.text).toContain(`${URL_TEXT}rj/cidade-exemplo/`)
    expect(s!.text).toContain('Em Cidade Exemplo, no 1º turno de 2026, 30% do eleitorado não votou, quase tanto quanto o Candidato B recebeu (33,6%).')
    expect(s!.active).toBe(true)
    expect(errors).toEqual([])
  })

  test('the picture has no QR and no image element, only the short address', async ({ page }) => {
    await open(page, 'shares')
    await expect(page.locator('[data-share-picture] svg image, [data-share-picture] svg foreignObject')).toHaveCount(0)
    const html = await page.locator('[data-share-picture] svg').innerHTML()
    // the address may wrap to two lines with a longer base path: compare all text runs joined
    const runs = await page.locator('[data-share-picture] svg text').evaluateAll((els) => els.map((e) => e.textContent ?? '').join(''))
    expect(runs).toContain(`votoavoto.exemplo.br${base.replace(/\/$/, '')}/rj/cidade-exemplo`)
    expect(html).not.toContain('https://')
  })

  test('shares only the text when files cannot be shared', async ({ page }) => {
    const errors = watch(page)
    await open(page, 'shares-text')
    await page.getByRole('button', { name: 'Compartilhar' }).click()
    const [s] = await shareMock(page).waitForCalls(1)
    expect(s!.files).toEqual([])
    expect(s!.text).toContain(`${URL_TEXT}rj/cidade-exemplo/`)
    expect(errors).toEqual([])
  })

  test('a cancelled share sheet is silent: no message, no download, no console error', async ({ page }) => {
    const errors = watch(page)
    let downloads = 0
    page.on('download', () => downloads++)
    await open(page, 'cancelled')
    await page.getByRole('button', { name: 'Compartilhar' }).click()
    await shareMock(page).waitForCalls(1)
    await page.waitForTimeout(300)
    await expect(page.locator('[data-status]')).toHaveText('')
    expect(downloads).toBe(0)
    expect(errors).toEqual([])
  })

  test('a failed share falls back to the download and says so', async ({ page }) => {
    const errors = watch(page)
    await open(page, 'fails')
    const dl = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Compartilhar' }).click()
    expect((await dl).suggestedFilename()).toBe(FILENAME)
    await expect(page.locator('[data-status]')).toContainText('A imagem foi baixada')
    expect(errors).toEqual([])
  })
})

test.describe('share: download fallback', () => {
  test('without a share API the native button is hidden; "Baixar imagem" downloads the PNG and the message text stays on a narrow screen with a copy button', async ({ page }) => {
    const errors = watch(page)
    await open(page, 'absent')
    await expect(page.getByRole('button', { name: 'Compartilhar' })).toBeHidden()
    await expect(page.locator('[data-no-share]')).toContainText('Este navegador não oferece o compartilhamento do sistema')
    const dl = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Baixar imagem' }).click()
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

  test('without a share API "Copiar link" copies the city address', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await open(page, 'absent')
    await page.getByRole('button', { name: 'Copiar link' }).click()
    await expect(page.locator('[data-status]')).toHaveText('Link copiado.')
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`${URL_TEXT}rj/cidade-exemplo/`)
  })

  test('"Baixar imagem" downloads the PNG even when sharing works', async ({ page }) => {
    await open(page, 'shares')
    const dl = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Baixar imagem' }).click()
    expect((await dl).suggestedFilename()).toBe(FILENAME)
    expect(await shareMock(page).calls()).toEqual([])
  })

  test('"Copiar texto" copies the message', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await open(page, 'absent')
    await page.getByRole('button', { name: 'Copiar texto' }).click()
    await expect(page.locator('[data-status]')).toHaveText('Texto copiado.')
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(`${URL_TEXT}rj/cidade-exemplo/`)
  })
})

test.describe('share: layout and requests', () => {
  test('the sheet states the view it draws and "Fechar" leaves the sheet', async ({ page }) => {
    await open(page, 'shares')
    await expect(page.locator('[data-share-picture]')).toContainText('2026 · 1º turno · RJ')
    await expect(page.locator('[data-share-sheet]')).toHaveAttribute('data-view', '2026-1')
    await expect(page.getByRole('link', { name: 'Fechar' })).toHaveAttribute('href', base)
  })

  test('no sideways scroll, 44 px targets, no request leaves the site', async ({ page, baseURL }) => {
    const seen = collectRequests(page)
    await open(page, 'shares')
    await page.waitForLoadState('networkidle')
    const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
    expect(sw).toBeLessThanOrEqual(iw)
    for (const sel of ['[data-act="share"]', '[data-act="download"]', '[data-close]']) expect((await page.locator(sel).boundingBox())!.height).toBeGreaterThanOrEqual(44)
    expect(violations(seen, [new URL(baseURL!).origin])).toEqual([])
  })
})

test.describe('share: the real route (the city card as backdrop, #50)', () => {
  const real = `${base}rj/cidade-exemplo/compartilhar/`
  const views = [
    ['?ciclo=2018&turno=2', '2018 · 2º turno', 'voto-a-voto-rj-cidade-exemplo-2018-turno-2.png'],
    ['?ciclo=2022&turno=1', '2022 · 1º turno', 'voto-a-voto-rj-cidade-exemplo-2022-turno-1.png'],
  ] as const
  for (const [query, label, filename] of views) {
    test(`${query} makes the island re-derive the card view fetching ONLY the own city shard`, async ({ page }) => {
      const seen = collectRequests(page)
      await open(page, 'shares', real + query)
      await page.waitForLoadState('networkidle')
      const t = await page.locator('[data-share-picture]').textContent()
      expect(t).toContain(label)
      await expect(page.locator('[data-share-sheet]')).toHaveAttribute('data-filename', filename)
      const data = seen.map((r) => new URL(r.url).pathname).filter((p) => p.includes('/data/'))
      expect(data).toEqual([expect.stringMatching(/\/data\/v[0-9a-f]+\/city\/rj\/cidade-exemplo\.json$/)])
      await page.getByRole('button', { name: 'Compartilhar' }).click()
      expect((await shareMock(page).waitForCalls(1))[0]!.text).toContain(`${URL_TEXT}rj/cidade-exemplo/`)
    })
  }

  test('without a query the default view needs no /data/ request at all', async ({ page }) => {
    const seen = collectRequests(page)
    await open(page, 'shares', real)
    await page.waitForLoadState('networkidle')
    expect(seen.map((r) => new URL(r.url).pathname).filter((p) => p.includes('/data/'))).toEqual([])
  })

  test('"Fechar" returns to the city card, which is the dimmed backdrop', async ({ page }) => {
    await open(page, 'shares', real)
    await expect(page.getByRole('link', { name: 'Fechar' })).toHaveAttribute('href', `${base}rj/cidade-exemplo/`)
    await expect(page.locator('[data-share-backdrop] [data-city-card]')).toBeVisible()
  })

  test('an address of another card view without data (Boa Esperança do Norte) says so', async ({ page }) => {
    await openRaw(page, 'absent', `${base}mt/boa-esperanca-do-norte/compartilhar/?ciclo=2022&turno=1`)
    await expect(page.locator('[data-share-sheet] [data-nodata]')).toHaveText('Não temos dados dessa eleição para este lugar.')
  })
})

test.describe('share without JavaScript', () => {
  useNoJs()
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