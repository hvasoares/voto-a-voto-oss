import { expect, test, type Page } from '@playwright/test'
import { base, collectRequests, violations } from './helpers'

/*
 * Meu Brasil (#27) at 390x844 over the fixture dataset: up to three places in the address, one card, reload reproduces it, the share
 * flow sends the picture and the link. navigator.share is stubbed: a real system sheet cannot be driven here.
 */
const route = (q = '') => `${base}meu-brasil/${q}`
const THREE = '?mora=rj/cidade-exemplo&vota=sp/cidade-exemplo-paulista&nasceu=mt/boa-esperanca-do-norte'

async function open(page: Page, q = '', share: 'files' | 'none' = 'none') {
  await page.addInitScript((m) => {
    const w = window as unknown as { __shares: unknown[] }
    w.__shares = []
    if (m === 'none') return void Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true })
    Object.defineProperty(navigator, 'share', { configurable: true, value: (d: ShareData) => (w.__shares.push({ files: (d.files ?? []).map((f) => f.name), text: d.text }), Promise.resolve()) })
  }, share)
  await page.goto(route(q))
  await page.waitForFunction(() => document.querySelector('[data-meu-brasil]'))
}
const title = (page: Page) => page.locator('[data-card-picture] svg title')
const ready = (page: Page) => expect(page.locator('[data-meu-brasil]')).toHaveAttribute('data-ready', 'yes')

test.describe('Meu Brasil', () => {
  for (const [n, q] of [[1, '?mora=rj/cidade-exemplo'], [2, '?mora=rj/cidade-exemplo&vota=sp/cidade-exemplo-paulista'], [3, THREE]] as const) {
    test(`${n} place(s): one card with the three cycles of each and the generated headline as its text alternative`, async ({ page }) => {
      await open(page, q)
      await ready(page)
      // `ready` holds as soon as the first place has loaded: wait for every place's years before counting them
      await expect.poll(async () => (await page.locator('[data-card-picture] svg text').allTextContents()).filter((t) => /^20(18|22|26)$/.test(t)).length).toBe(3 * n)
      await expect(title(page)).toContainText('a parcela do eleitorado que não votou foi de')
      expect(await page.locator('[data-card-picture] svg').getAttribute('data-view')).toBe('meu-brasil')
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    })
  }

  test('reloading the address reproduces the same card; the address follows the choices', async ({ page }) => {
    await open(page, THREE)
    await expect(page.locator('[data-meu-brasil]')).toHaveAttribute('data-drawn', '3')
    const first = await title(page).textContent()
    await page.reload()
    await expect(page.locator('[data-meu-brasil]')).toHaveAttribute('data-drawn', '3')
    expect(await title(page).textContent()).toBe(first)
    await page.getByRole('button', { name: 'Remover onde nasceu' }).click()
    await expect.poll(() => new URL(page.url()).search).toBe('?mora=rj/cidade-exemplo&vota=sp/cidade-exemplo-paulista')
    await expect(page.locator('[data-meu-brasil]')).toHaveAttribute('data-places', '2')
  })

  test('with no place it asks for one; a place is added with the city field, and only its shard is fetched', async ({ page }) => {
    const seen = collectRequests(page)
    await open(page)
    await expect(page.getByText('Escolha ao menos um lugar para ver o cartão.')).toBeVisible()
    await page.getByRole('combobox', { name: 'Onde mora' }).fill('exemplo paulista')
    await page.locator('[data-place-option]', { hasText: 'Cidade Exemplo Paulista' }).click()
    await ready(page)
    await expect(title(page)).toContainText('Em Cidade Exemplo Paulista, no 2º turno')
    expect(new URL(page.url()).search).toBe('?mora=sp/cidade-exemplo-paulista')
    const data = seen.map((r) => new URL(r.url).pathname).filter((p) => /\/city\//.test(p))
    expect(data).toEqual([expect.stringMatching(/\/city\/sp\/cidade-exemplo-paulista\.json$/)])
    expect(violations(seen, [new URL(page.url()).origin])).toEqual([])
  })

  test('a malformed address is ignored, not an error', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await open(page, '?mora=../../x&vota=rj/&nasceu=zz')
    await expect(page.getByText('Escolha ao menos um lugar para ver o cartão.')).toBeVisible()
    expect(errors).toEqual([])
  })

  test('a place whose data cannot be fetched says so', async ({ page }) => {
    await open(page, '?mora=rj/nao-existe')
    await expect(page.locator('[data-placeholder]')).toContainText('Não foi possível carregar os dados de um dos lugares')
  })

  test('shares the picture and the link (with the places in it) through the system sheet', async ({ page }) => {
    await open(page, THREE, 'files')
    await expect(page.locator('[data-share-actions]')).toHaveAttribute('data-png', 'ready')
    await page.getByRole('button', { name: 'Compartilhar o cartão' }).click()
    await expect.poll(() => page.evaluate(() => (window as unknown as { __shares: unknown[] }).__shares.length)).toBe(1)
    const [s] = await page.evaluate(() => (window as unknown as { __shares: { files: string[]; text: string }[] }).__shares)
    expect(s!.files).toEqual(['voto-a-voto-meu-brasil.png'])
    expect(s!.text).toContain(`https://votoavoto.exemplo.br${base}meu-brasil/${THREE}`)
    expect(s!.text).toContain('a parcela do eleitorado que não votou foi de')
  })

  test('the home reaches it through the Comparar chooser', async ({ page }) => {
    await page.goto(base)
    await page.locator('#comparar').getByRole('link', { name: /Meus lugares ao longo do tempo/ }).click()
    await expect(page).toHaveURL(new RegExp(`${route()}$`))
    await expect(page.getByRole('heading', { level: 1, name: 'Meu Brasil' })).toBeVisible()
  })

  test('without JavaScript it says what it needs', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false })
    const page = await ctx.newPage()
    await page.goto(route(THREE))
    await expect(page.locator('[data-nojs]')).toContainText('precisa de JavaScript')
    await ctx.close()
  })
})
