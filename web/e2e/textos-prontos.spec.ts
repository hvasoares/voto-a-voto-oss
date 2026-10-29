import { expect, test } from '@playwright/test'
import { base } from './helpers'
import { noJs } from './presets'

/*
 * The ready-made texts of a city (#65) on its share page, over the fixture dataset: both texts are printed in the page (readable without
 * scripts), the copy buttons are an enhancement, the words are the plain ones (#157), and one text file per state carries every city.
 */
const share = `${base}rj/cidade-exemplo/compartilhar/`

test.describe('Textos prontos', () => {
  test('without JavaScript the WhatsApp block and the bulletin are printed, with no copy button', async ({ browser }) => {
    const ctx = await browser.newContext(noJs())
    const page = await ctx.newPage()
    await page.goto(share)
    const wa = page.locator('[data-text="whatsapp"]:visible')
    await expect(wa).toContainText('Foram votar 68.434 de 100.000 eleitores')
    await expect(wa).toContainText('Dados fictícios, só de exemplo. Fonte real: TSE.')
    await expect(wa).toContainText('/rj/cidade-exemplo/')
    const radio = page.locator('[data-text="radio"]:visible')
    await expect(radio).toContainText('Eram cem mil eleitores aptos a votar.')
    expect(await radio.innerText()).not.toMatch(/\d/)
    await expect(page.locator('[data-copy]:visible')).toHaveCount(0)
    await ctx.close()
  })

  test('the copy buttons copy the plain text on screen', async ({ browser }) => {
    const ctx = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] })
    const page = await ctx.newPage()
    await page.goto(share)
    await page.locator('[data-copy="whatsapp"]').click()
    await expect(page.locator('[data-copy-status]')).toHaveText('Copiado.')
    const copied = await page.evaluate(() => navigator.clipboard.readText())
    expect(copied).toBe(await page.locator('[data-text="whatsapp"]:visible').innerText())
    expect(copied).toContain('Foram votar 68.434')
    await page.locator('[data-copy="radio"]').click()
    await expect(page.locator('[data-copy-status]')).toHaveText('Copiado.')
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('Quer ver os números na tela?')
    await ctx.close()
  })

  test('makes no request beyond the site and the state file is the only new link', async ({ page }) => {
    const seen: string[] = []
    page.on('request', (r) => seen.push(new URL(r.url()).origin))
    await page.goto(share)
    await expect(page.locator('[data-state-texts]')).toHaveAttribute('href', `${base}textos/rj.txt`)
    expect(new Set(seen).size).toBe(1)
  })

  test('one text file per state carries the block and the bulletin of every city of the state', async ({ request }) => {
    const res = await request.get(`${base}textos/rj.txt`)
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toContain('text/plain')
    const body = await res.text()
    expect(body.match(/^== .* \(RJ\) ==$/gm)).toEqual(expect.arrayContaining(['== Cidade Exemplo (RJ) ==', '== Cidade Exemplo A (RJ) ==']))
    expect(body).toContain('-- Boletim para ler em voz alta')
    expect(body).not.toMatch(/porque|vence|lidera/i)
  })

  test('the city card itself has no new link (its html budget has no room)', async ({ page }) => {
    await page.goto(`${base}rj/cidade-exemplo/`)
    expect(await page.locator('a[href*="textos/"], [data-city-texts]').count()).toBe(0)
  })
})
