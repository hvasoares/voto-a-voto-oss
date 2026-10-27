import { readFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'
import { base, collectRequests, violations } from './helpers'

/*
 * The state recap (#28) at 390x844 over the fixture dataset: the three cycles of a state, the base of the percentages, the
 * link from the state page, and the share flow (the picture and the link). navigator.share is stubbed: a real system sheet
 * cannot be driven here.
 */
const path = `${base}rj/resumo/`
const SIG = '137,80,78,71,13,10,26,10'

async function open(page: Page, mode: 'files' | 'none', route = path) {
  await page.addInitScript((m) => {
    const w = window as unknown as { __shares: unknown[]; __events: string[] }
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
        if (f) void f.arrayBuffer().then((b) => (rec.png = { w: new DataView(b).getUint32(16), signature: [...new Uint8Array(b, 0, 8)].join(',') }))
        return Promise.resolve()
      },
    })
  }, mode)
  await page.goto(route)
  await page.waitForFunction(() => { const i = document.querySelector('astro-island'); return !!i && !i.hasAttribute('ssr') })
  await expect(page.locator('[data-share-actions]')).toHaveAttribute('data-png', 'ready')
}
const shares = (page: Page) => page.evaluate(() => (window as unknown as { __shares: { files: { name: string; type: string }[]; text: string; png?: { w: number; signature: string } }[] }).__shares)

test.describe('state recap', () => {
  test('shows the three cycles of the state with the base of the percentages, in the words of the catalog', async ({ page }) => {
    await page.goto(path)
    await expect(page.locator('h1')).toHaveText('Resumo do estado')
    await expect(page.locator('[data-subtitle]')).toHaveText('Rio de Janeiro · Presidente, 2º turno, 2018 a 2026')
    const texts = await page.locator('[data-recap-picture] svg text').allTextContents()
    for (const t of ['2018', '2022', '2026', 'Ponto de partida da série']) expect(texts).toContain(t)
    expect(texts.join(' ')).toContain('Base: votos válidos do 2º turno, sem o exterior')
    expect(texts.some((t) => /^[+-]\d+,\d pp vs 20(18|22)$/.test(t))).toBe(true)
    await expect(page.locator('[data-recap-picture] svg title')).toContainText('Em Rio de Janeiro, no 2º turno, os votos válidos foram: 2018,')
    expect(await page.locator('[data-recap-picture] svg').getAttribute('data-view')).toBe('recap')
  })

  test('a state with one cycle only says "sem dados" for the others and draws no zeros', async ({ page }) => {
    await page.goto(`${base}mt/resumo/`)
    const texts = await page.locator('[data-recap-picture] svg text').allTextContents()
    expect(texts.filter((t) => t === 'sem dados')).toHaveLength(2)
    expect(texts.join(' ')).not.toMatch(/ 0,0%/)
  })

  test('the state page links to the recap and the recap links back to the three cycles', async ({ page }) => {
    await page.goto(`${base}rj/`)
    await page.locator('[data-link="recap"]').click()
    await expect(page).toHaveURL(new RegExp(`${path}$`))
    await expect(page.locator('[data-link="cycles"]')).toHaveAttribute('href', `${base}tres-ciclos/rj/`)
  })

  test('shares the picture and the link through the system sheet, inside the tap', async ({ page }) => {
    await open(page, 'files')
    await page.getByRole('button', { name: 'Compartilhar o resumo' }).click()
    await expect.poll(async () => (await shares(page))[0]?.png).toBeTruthy()
    const [s] = await shares(page)
    expect(s!.files[0]).toMatchObject({ name: 'voto-a-voto-rj-resumo-do-estado.png', type: 'image/png' })
    expect(s!.png).toEqual({ w: 1080, signature: SIG })
    expect(s!.text).toContain('Em Rio de Janeiro, no 2º turno, os votos válidos foram:')
    expect(s!.text).toContain(`https://votoavoto.exemplo.br${base}rj/resumo/`)
  })

  test('without a system share sheet the image downloads (a PNG with the keys of the card)', async ({ page }) => {
    await open(page, 'none')
    await expect(page.getByRole('button', { name: 'Compartilhar o resumo' })).toBeHidden()
    const dl = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Baixar imagem' }).click()
    const d = await dl
    expect(d.suggestedFilename()).toBe('voto-a-voto-rj-resumo-do-estado.png')
    expect((await readFile((await d.path())!)).includes(Buffer.from('voto-a-voto\0'))).toBe(true)
  })

  test('the phone has no horizontal scroll, 44 px targets, and no request leaves the site', async ({ page }) => {
    const seen = collectRequests(page)
    await open(page, 'files')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    for (const el of await page.locator('main > a, main button').all()) if (await el.isVisible()) expect((await el.boundingBox())!.height, await el.textContent() ?? '').toBeGreaterThanOrEqual(43)
    expect(violations(seen, [new URL(page.url()).origin])).toEqual([])
  })

  test('without JavaScript the picture and the link to the three cycles still work', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false })
    const page = await ctx.newPage()
    await page.goto(path)
    await expect(page.locator('[data-recap-picture] svg')).toBeVisible()
    await expect(page.locator('[data-nojs]')).toContainText('precisam de JavaScript')
    await ctx.close()
  })
})
