import { readFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'
import { allowedOrigins, base, collectRequests, violations } from './helpers'
import { acknowledgeNotice, noJs } from './presets'
import { shareMock } from './share-mock'

/*
 * The card generator (#25) at 390x844 over the fixture dataset: a city, one measure, a size; the PNG is made in the
 * browser at the size of the picture. navigator.share is stubbed to nothing in the "no sharing" cases: a real system sheet
 * cannot be driven here.
 */
const path = `${base}gerador/`
const pngInfo = (buf: Buffer) => ({ signature: [...buf.subarray(0, 8)].join(','), width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) })
const SIG = '137,80,78,71,13,10,26,10'

async function open(page: Page, query = '?cidade=rj/cidade-exemplo') {
  await page.goto(`${path}${query}`)
  await page.waitForFunction(() => document.querySelector('[data-card-generator]')?.getAttribute('data-hydrated') === 'yes')
}
const ready = (page: Page) => expect(page.locator('[data-card-generator]')).toHaveAttribute('data-ready', 'yes')

test.describe('card generator', () => {
  test('a city from the address, the three sizes download as PNGs of their own size, with the generated line as the title', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await shareMock(page).install('absent')
    // The header made the page 52 px taller: the download buttons now scroll to where the fixed metrics notice covers them.
    await acknowledgeNotice(page)
    await open(page)
    await ready(page)
    for (const [size, label, button, w, h, file] of [
      ['square', 'Quadrado', 'Baixar imagem quadrada', 1080, 1080, 'quadrado'],
      ['story', 'Story', 'Baixar imagem Story', 1080, 1920, 'story'],
      ['preview', 'Prévia de link', 'Baixar imagem de prévia', 1200, 630, 'previa'],
    ] as const) {
      await page.getByRole('radio', { name: label }).click()
      await expect(page.locator('[data-card-generator]')).toHaveAttribute('data-size', size)
      await expect(page.locator('[data-preview-picture] svg title')).toContainText('do eleitorado de Cidade Exemplo não votou')
      const dl = page.waitForEvent('download')
      await page.getByRole('button', { name: button }).click()
      const d = await dl
      expect(d.suggestedFilename()).toMatch(new RegExp(`^voto-a-voto-rj-cidade-exemplo-nao-votou-2026-turno-\\d-${file}\\.png$`))
      expect(pngInfo(await readFile((await d.path())!))).toEqual({ signature: SIG, width: w, height: h })
      await expect(page.locator('[data-status]')).toContainText('Imagem baixada')
    }
    expect(errors).toEqual([])
  })

  test('works where file sharing is not supported: the share button downloads the image', async ({ page }) => {
    await shareMock(page).install('absent')
    await open(page)
    await ready(page)
    const dl = page.waitForEvent('download')
    // the metrics notice is fixed at the bottom: bring the button to the middle of the screen so the notice never covers it
    await page.getByRole('button', { name: /^Compartilhar/ }).evaluate((el) => el.scrollIntoView({ block: 'center' }))
    await page.getByRole('button', { name: /^Compartilhar/ }).click({ force: true })
    expect((await dl).suggestedFilename()).toMatch(/\.png$/)
  })

  test('a measure and a size in the address are read, and the address follows the choices', async ({ page }) => {
    await open(page, '?cidade=rj/cidade-exemplo&medida=margem&tamanho=story')
    await ready(page)
    await expect(page.getByRole('radio', { name: 'Margem em votos' })).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByRole('radio', { name: 'Story' })).toHaveAttribute('aria-checked', 'true')
    await expect(page.locator('[data-preview-picture] svg title')).toContainText('votos separaram os dois candidatos mais votados')
    await page.getByRole('radio', { name: 'Comparecimento' }).click()
    await expect.poll(() => new URL(page.url()).search).toBe('?cidade=rj/cidade-exemplo&medida=comparecimento&tamanho=story')
  })

  test('the city is picked with the search; the page fetches only that city shard', async ({ page }) => {
    const seen = collectRequests(page)
    await open(page, '')
    await expect(page.getByText('Escolha uma cidade para ver o cartão.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Baixar imagem quadrada' })).toBeDisabled()
    await page.getByRole('combobox', { name: 'Cidade' }).fill('exemplo paulista')
    await page.locator('[data-place-option]', { hasText: 'Cidade Exemplo Paulista' }).click()
    await ready(page)
    await expect(page.locator('[data-preview-picture] svg title')).toContainText('Cidade Exemplo Paulista')
    expect(new URL(page.url()).search).toBe('?cidade=sp/cidade-exemplo-paulista')
    const data = seen.map((r) => new URL(r.url).pathname).filter((p) => p.includes('/data/'))
    expect(data.filter((p) => p.endsWith('/search.json'))).toHaveLength(1)
    expect(data.filter((p) => /\/city\//.test(p))).toEqual([expect.stringMatching(/\/city\/sp\/cidade-exemplo-paulista\.json$/)])
    expect(violations(seen, await allowedOrigins(new URL(page.url()).origin))).toEqual([])
  })

  test('the share dialog links to the generator with the city already chosen', async ({ page }) => {
    await page.goto(`${base}rj/cidade-exemplo/compartilhar/`)
    await page.locator('[data-generator-link]').click()
    await expect(page).toHaveURL(new RegExp(`${path}\\?cidade=rj/cidade-exemplo$`))
    await ready(page)
  })

  test('without JavaScript the page says what it needs', async ({ browser }) => {
    const ctx = await browser.newContext(noJs())
    const page = await ctx.newPage()
    await page.goto(path)
    await expect(page.locator('[data-nojs]')).toContainText('precisa de JavaScript')
    await ctx.close()
  })
})
