import { readFile } from 'node:fs/promises'
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import sharp from 'sharp'
import { base } from './helpers'

/*
 * Self-describing cards (#38) at 390x844: the SVG and the PNG that the generator and the share sheet make reopen their view
 * on /abrir-cartao/, recomputed from the site's own data; an altered file and a file without keys are told apart; the dropped
 * file never enters the page. The SVG is also checked for accessibility with axe.
 */
const GEN = `${base}gerador/?cidade=rj/cidade-exemplo&medida=margem&tamanho=preview`

async function download(page: Page, name: string | RegExp): Promise<string> {
  const dl = page.waitForEvent('download')
  await (typeof name === 'string' ? page.getByRole('button', { name }) : page.getByRole('button', { name })).click()
  return (await (await dl).path())!
}
async function generatorFiles(page: Page) {
  await page.goto(GEN)
  await page.waitForFunction(() => document.querySelector('[data-card-generator]')?.getAttribute('data-ready') === 'yes')
  await expect(page.locator('[data-card-generator]')).toHaveAttribute('data-png', /.*/).catch(() => undefined)
  const svg = await download(page, /Baixar em SVG/)
  const png = await download(page, 'Baixar imagem de prévia')
  return { svg, png }
}
const open = async (page: Page) => {
  await page.goto(`${base}abrir-cartao/`)
  await page.waitForFunction(() => document.querySelector('astro-island') && !document.querySelector('astro-island')!.hasAttribute('ssr'))
}
const outcome = (page: Page) => page.locator('[data-outcome]')

test.describe('reopening a card from its file', () => {
  test('the SVG of the generator reopens its view, and the page shows the card the site drew, with a link to the view', async ({ page }) => {
    const { svg } = await generatorFiles(page)
    await open(page)
    await page.locator('[data-file-input]').setInputFiles(svg)
    await expect(outcome(page)).toHaveAttribute('data-outcome', 'ok')
    await expect(page.locator('[data-message]')).toContainText('confere com os dados do site')
    await expect(page.locator('[data-recomputed] svg title')).toContainText('votos separaram os dois candidatos mais votados')
    await expect(page.locator('[data-open-view]')).toHaveAttribute('href', `${base}gerador/?cidade=rj/cidade-exemplo&medida=margem&tamanho=preview`)
  })

  test('the PNG carries the keys too, and reopens the same view', async ({ page }) => {
    const { png } = await generatorFiles(page)
    await open(page)
    await page.locator('[data-file-input]').setInputFiles(png)
    await expect(outcome(page)).toHaveAttribute('data-outcome', 'ok')
    expect((await readFile(png)).includes(Buffer.from('voto-a-voto\0'))).toBe(true)
  })

  test('an altered SVG is flagged and never inserted into the page', async ({ page }) => {
    const { svg } = await generatorFiles(page)
    const text = (await readFile(svg, 'utf8')).replace('</svg>', '<text x="1" y="1">EVIL-MARKER</text></svg>')
    await open(page)
    await page.locator('[data-file-input]').setInputFiles({ name: 'cartao.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(text) })
    await expect(outcome(page)).toHaveAttribute('data-outcome', 'altered')
    await expect(page.locator('[data-message]')).toContainText('alterado')
    expect(await page.content()).not.toContain('EVIL-MARKER')
  })

  test('a script in the file is refused', async ({ page }) => {
    const { svg } = await generatorFiles(page)
    const text = (await readFile(svg, 'utf8')).replace('</svg>', '<script>window.__pwned = 1</script></svg>')
    await open(page)
    await page.locator('[data-file-input]').setInputFiles({ name: 'cartao.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(text) })
    await expect(outcome(page)).toHaveAttribute('data-outcome', 'unreadable')
    expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined()
  })

  test('keys that match nothing, a picture a chat app re-encoded, and another edition are told apart', async ({ page }) => {
    const { svg, png } = await generatorFiles(page)
    const text = await readFile(svg, 'utf8')
    await open(page)
    const drop = (file: { name: string; mimeType: string; buffer: Buffer }) => page.locator('[data-file-input]').setInputFiles(file)

    await drop({ name: 'a.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(text.replace(/rj\/cidade-exemplo/g, 'rj/nao-existe')) })
    await expect(outcome(page)).toHaveAttribute('data-outcome', 'mismatch')
    await expect(page.locator('[data-message]')).toContainText('não correspondem')

    // What a chat app does: decode and encode again. The keys are gone; the file says so.
    const stripped = await sharp(await readFile(png)).png().toBuffer()
    await drop({ name: 'b.png', mimeType: 'image/png', buffer: stripped })
    await expect(outcome(page)).toHaveAttribute('data-outcome', 'no-keys')
    await expect(page.locator('[data-message]')).toContainText('endereço impresso')

    await drop({ name: 'c.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(text.replace(/edition="[^"]*"/g, 'edition="2020-01-01"').replace(/data-edition="[^"]*"/g, 'data-edition="2020-01-01"')) })
    await expect(outcome(page)).toHaveAttribute('data-outcome', 'other-edition')
    await expect(page.locator('[data-message]')).toContainText('edição 2020-01-01')
  })

  test('the dropped SVG passes the accessibility check: a title, a description, text as text', async ({ page }) => {
    const { svg } = await generatorFiles(page)
    const text = await readFile(svg, 'utf8')
    await page.setContent(`<!doctype html><html lang="pt-BR"><head><title>Cartão</title></head><body><main><h1>Cartão</h1>${text}</main></body></html>`)
    const result = await new AxeBuilder({ page }).analyze()
    expect(result.violations).toEqual([])
    const root = page.locator('svg').first()
    await expect(root).toHaveAttribute('role', 'img')
    await expect(root).toHaveAttribute('aria-labelledby', 'card-title card-desc')
    expect(await page.locator('svg text').count()).toBeGreaterThan(3)
    expect(await page.locator('svg desc').textContent()).toContain('edição')
  })

  test('the page names what it needs without JavaScript', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false })
    const page = await ctx.newPage()
    await page.goto(`${base}abrir-cartao/`)
    await expect(page.locator('[data-nojs]')).toContainText('precisa de JavaScript')
    await ctx.close()
  })
})
