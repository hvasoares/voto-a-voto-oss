import { expect, test, type Page } from '@playwright/test'
import { base, collectRequests } from './helpers'

/*
 * The embeddable city widget (#29) over the fixture dataset. A plain test page of "another site" embeds three cities with the snippet's
 * iframe; at 320 and 390 px wide each must have the snippet's size and no scrollbar (the page inside is measured, not just the frame), and
 * the widget has no script at all, so it can load no analytics. The page that makes the snippet copies a working one.
 */
const CITIES = [
  ['rj', 'cidade-exemplo', 'Cidade Exemplo'],
  ['zz', 'exterior-exemplo', 'Exterior (posto exemplo)'],
  ['mt', 'boa-esperanca-do-norte', 'Boa Esperança do Norte'],
] as const

async function hostPage(page: Page, width: number, snippets?: string[]) {
  const origin = new URL(page.url() === 'about:blank' ? 'http://localhost' : page.url()).origin
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Site de fora</title></head><body style="margin:0"><div style="width:${width}px">${(snippets ?? CITIES.map(([uf, slug, name]) => `<iframe src="${base}embed/${uf}/${slug}/" width="100%" height="200" style="border:0" title="Resultado de ${name}"></iframe>`)).join('<hr>')}</div></body></html>`
  await page.route('**/__host.html', (r) => r.fulfill({ contentType: 'text/html', body: html }))
  await page.goto(`${origin || ''}${base}__host.html`)
}

for (const width of [320, 390])
  test(`three cities embedded in a ${width} px column: the right size, no scrollbars, source and edition shown`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(base)
    await hostPage(page, width)
    const frames = page.locator('iframe')
    await expect(frames).toHaveCount(3)
    for (const [i, [, , name]] of CITIES.entries()) {
      const box = (await frames.nth(i).boundingBox())!
      expect(Math.round(box.width), name).toBe(width)
      expect(Math.round(box.height), name).toBe(200)
      const f = page.frameLocator('iframe').nth(i)
      await expect(f.locator('[data-source]'), name).toContainText(/^TSE · edição \d\d\/\d\d\/\d{4}/)
      await expect(f.locator('[data-headline]'), name).not.toBeEmpty()
      const m = await frames.nth(i).evaluate((el) => {
        const d = (el as HTMLIFrameElement).contentDocument!.documentElement
        return { sh: d.scrollHeight, ch: d.clientHeight, sw: d.scrollWidth, cw: d.clientWidth }
      })
      expect(m.sh, `${name} scrolls vertically`).toBeLessThanOrEqual(m.ch)
      expect(m.sw, `${name} scrolls sideways`).toBeLessThanOrEqual(m.cw)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })

test('the widget has no script, no analytics, no storage, and only its own page and styles are requested', async ({ page }) => {
  const seen = collectRequests(page)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto(`${base}embed/rj/cidade-exemplo/`)
  expect(await page.evaluate(() => document.scripts.length)).toBe(0)
  expect(await page.evaluate(() => Object.keys(localStorage).length)).toBe(0)
  const origin = new URL(page.url()).origin
  expect(seen.filter((r) => !r.url.startsWith(origin)).map((r) => r.url)).toEqual([])
  expect(seen.filter((r) => ['script', 'xhr', 'fetch', 'websocket', 'ping'].includes(r.type)).map((r) => r.url)).toEqual([])
  expect(await page.locator('meta[name="robots"]').getAttribute('content')).toBe('noindex')
  expect(errors).toEqual([])
})

test('the widget names the city, the generated headline, the source and the edition; the link back opens the city card', async ({ page, context }) => {
  await page.goto(`${base}embed/rj/cidade-exemplo/`)
  await expect(page.locator('h1')).toHaveText('Cidade Exemplo · RJ')
  await expect(page.locator('[data-headline]')).toContainText('Em Cidade Exemplo, no 2º turno de 2026,')
  await expect(page.locator('[data-source]')).toContainText('TSE · edição')
  await expect(page.getByText('EXEMPLO', { exact: true })).toBeVisible()
  const back = page.locator('[data-back]')
  await expect(back).toHaveAttribute('href', `${base}rj/cidade-exemplo/?ciclo=2026&turno=2`)
  const popup = context.waitForEvent('page')
  await back.click()
  const opened = await popup
  await opened.waitForLoadState()
  await expect(opened.getByRole('heading', { level: 1 })).toContainText('Cidade Exemplo')
})

test('a city without data in the cycles says so instead of inventing a sentence', async ({ page }) => {
  await page.goto(`${base}embed/mt/boa-esperanca-do-norte/`)
  await expect(page.locator('[data-headline]')).toContainText('Boa Esperança do Norte')
})

test.describe('the page that makes the snippet', () => {
  test('picks a city, previews the widget at 390 and 320 px and copies a snippet that works in another site', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto(`${base}widget/`)
    await page.waitForFunction(() => document.querySelector('[data-widget-builder]'))
    await expect(page.getByText('Escolha uma cidade para ver o widget.')).toBeVisible()
    await page.getByRole('combobox', { name: 'Cidade' }).fill('exemplo paulista')
    await page.locator('[data-place-option]', { hasText: 'Cidade Exemplo Paulista' }).click()
    await expect(page.locator('[data-widget-builder]')).toHaveAttribute('data-ready', 'yes')
    for (const w of ['390', '320']) {
      const box = (await page.locator(`[data-preview="${w}"]`).boundingBox())!
      // the column of the page is 350 px on a phone: the 390 preview takes all of it, the 320 one fits as is
      expect(Math.round(box.width)).toBe(Math.min(Number(w), 350))
      await expect(page.frameLocator(`[data-preview="${w}"]`).locator('h1')).toHaveText('Cidade Exemplo Paulista · SP')
    }
    const shown = await page.locator('[data-snippet]').textContent()
    expect(shown).toMatch(/^<iframe src="https:\/\/votoavoto\.exemplo\.br\/(.*)embed\/sp\/cidade-exemplo-paulista\/" width="100%" height="200" style="border:0" title="Resultado de Cidade Exemplo Paulista"><\/iframe>$/)
    await page.getByRole('button', { name: 'Copiar snippet' }).click()
    await expect(page.locator('[data-status]')).toHaveText('Snippet copiado.')
    const copied = await page.evaluate(() => navigator.clipboard.readText())
    expect(copied).toBe(shown)
    // The copied snippet, pasted in another site (its absolute address pointed at this server), renders the widget.
    const local = copied.replace(/src="https:\/\/votoavoto\.exemplo\.br/, `src="${new URL(page.url()).origin}`)
    await hostPage(page, 360, [local])
    await expect(page.frameLocator('iframe').locator('h1')).toHaveText('Cidade Exemplo Paulista · SP')
  })

  test('with ?cidade= in the address the city is already chosen', async ({ page }) => {
    await page.goto(`${base}widget/?cidade=rj/cidade-exemplo`)
    await expect(page.locator('[data-widget-builder]')).toHaveAttribute('data-ready', 'yes')
    await expect(page.locator('[data-snippet]')).toContainText('embed/rj/cidade-exemplo/')
  })

  test('"Sobre os dados" has a section for journalists and associations that leads here', async ({ page }) => {
    await page.goto(`${base}sobre-os-dados/`)
    const section = page.locator('#jornalistas')
    await expect(section).toHaveText('Para jornalistas e associações')
    await page.locator('[data-component="for-newsrooms"] a').click()
    await expect(page).toHaveURL(new RegExp(`${base}widget/$`))
  })

  test('without JavaScript it says what it needs', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false })
    const p = await ctx.newPage()
    await p.goto(`${base}widget/`)
    await expect(p.locator('[data-nojs]')).toContainText('precisa de JavaScript')
    await ctx.close()
  })
})
