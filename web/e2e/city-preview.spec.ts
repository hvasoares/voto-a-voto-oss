import { expect, test } from '@playwright/test'
import { base, collectRequests, violations } from './helpers'
import { EXAMPLE_URLS, NO_PREVIEW_EXCLUSIONS } from './routes-inventory'

/*
 * The link-preview head of every city page (ticket #8), over the fixture dataset: the title, the meta
 * description and the og/twitter tags are pre-rendered static strings (no script can add or change them —
 * the tags are checked as they arrive in the HTML), og:image is the build-rasterised PNG served by this
 * same site, the page as a whole keeps loading nothing beyond itself (no /data/ request — the tags carry
 * no image data, only the reference).
 */

const city = `${base}rj/cidade-exemplo/`

async function meta(page: import('@playwright/test').Page, selector: string): Promise<string> {
  return (await page.locator(selector).getAttribute('content')) ?? ''
}

test.describe('city page head: the preview tags', () => {
  test('title and description describe the city with the frame numbers of its latest result', async ({ page }) => {
    await page.goto(city)
    await expect(page).toHaveTitle('Cidade Exemplo (RJ): resultado das eleições de 2026 · Voto a Voto')
    const d = await meta(page, 'meta[name=description]')
    expect(d).toContain('Dados fictícios (EXEMPLO). ')
    expect(d).toMatch(/Resultado de Cidade Exemplo \(RJ\), 2026, 2º turno: votaram \d+% do eleitorado; dos votos válidos, Candidato A recebeu \d+% e Candidato B \d+%\./)
  })

  test('og:url is the page itself, absolute at the built origin', async ({ page }) => {
    await page.goto(city)
    expect(await meta(page, 'meta[property="og:url"]')).toMatch(/\/rj\/cidade-exemplo\/$/)
    expect(await meta(page, 'meta[property="og:title"]')).toMatch(/^Cidade Exemplo \(RJ\): resultado das eleições de 2026$/)
    expect(await meta(page, 'meta[property="og:description"]')).not.toBe('')
  })

  test('og:image is THIS city file, sized at the build constants, with the svg title as alt', async ({ page }) => {
    await page.goto(city)
    expect(await meta(page, 'meta[property="og:image"]')).toMatch(/\/preview\/rj\/cidade-exemplo\.png$/)
    expect(await meta(page, 'meta[property="og:image:type"]')).toBe('image/png')
    expect(await meta(page, 'meta[property="og:image:width"]')).toBe('480')
    expect(await meta(page, 'meta[property="og:image:height"]')).toBe('476')
    const alt = await meta(page, 'meta[property="og:image:alt"]')
    expect(alt).toMatch(/^Em Cidade Exemplo, no 2º turno de 2026, \d+(,\d)?% do eleitorado não votou, .+\.$/)
  })

  test('twitter card mirrors the og tags', async ({ page }) => {
    await page.goto(city)
    expect(await meta(page, 'meta[name="twitter:card"]')).toBe('summary_large_image')
    const og = await meta(page, 'meta[property="og:image"]')
    expect(await meta(page, 'meta[name="twitter:image"]')).toBe(og)
    expect(await meta(page, 'meta[name="twitter:title"]')).toBe(await meta(page, 'meta[property="og:title"]'))
  })

  test('og:image resolves: 200, a PNG, and a file with bytes (one per city, the right one per page)', async ({ page }) => {
    for (const [route, file] of [
      ['rj/cidade-exemplo/', 'preview/rj/cidade-exemplo.png'],
      ['sp/cidade-exemplo-paulista/', 'preview/sp/cidade-exemplo-paulista.png'],
      ['zz/exterior-exemplo/', 'preview/zz/exterior-exemplo.png'],
    ] as const) {
      await page.goto(`${base}${route}`)
      const promised = await meta(page, 'meta[property="og:image"]')
      // the tag is absolute at the built origin; the served file is the same path on this server
      const response = await page.request.get(`${new URL(promised).pathname}`)
      expect(new URL(promised).pathname, route).toBe(`${base}${file}`)
      expect(response.ok(), route).toBe(true)
      expect(response.headers()['content-type'], route).toBe('image/png')
      expect((await response.body()).length, route).toBeGreaterThan(5_000)
    }
  })

  test('the tags are static: no script runs to produce them and the page still fetches nothing beyond itself', async ({ page, baseURL }) => {
    const seen = collectRequests(page)
    await page.goto(city)
    const preview = await meta(page, 'meta[property="og:description"]')
    expect(preview).not.toBe('')
    // nothing is fetched from the shards either: the tags, the card and everything is in the HTML
    expect(violations(seen, [new URL(baseURL!).origin])).toEqual([])
    expect(seen.filter((r) => r.url.includes('/data/'))).toEqual([])
  })
})

test.describe('every public route carries the preview tags (#151)', () => {
  const tags = ['og:title', 'og:description', 'og:type', 'og:url', 'og:image']
  const names = ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']
  const content = (html: string, attr: string, key: string) =>
    new RegExp(`<meta (?:${attr}="${key}" content="([^"]*)"|content="([^"]*)" ${attr}="${key}")`).exec(html)?.slice(1).find(Boolean) ?? ''

  for (const [template, url] of Object.entries(EXAMPLE_URLS)) {
    if (template in NO_PREVIEW_EXCLUSIONS) continue
    test(`${template} has title, description, type, url and an absolute image`, async ({ request }) => {
      const html = await (await request.get(`${base}${url}`)).text()
      expect(html, 'the page asks not to be indexed but is not in NO_PREVIEW_EXCLUSIONS').not.toContain('content="noindex"')
      const missing = [...tags.map((t) => [t, content(html, 'property', t)]), ...names.map((n) => [n, content(html, 'name', n)])].filter(([, v]) => !v).map(([k]) => k)
      expect(missing, `${template} lacks ${missing.join(', ')}`).toEqual([])
      expect(content(html, 'property', 'og:image')).toMatch(/^https?:\/\/.+\.png$/)
      expect(content(html, 'property', 'og:url')).toMatch(/^https?:\/\//)
    })
  }

  test('the two demo pages stay noindex and carry no preview', async ({ request }) => {
    for (const url of ['compartilhar/', 'qr/']) {
      const html = await (await request.get(`${base}${url}`)).text()
      expect(html).toContain('content="noindex"')
      expect(html).not.toContain('og:title')
    }
  })

  test('the generic picture is 1200x630, under 300 KB and served from the site', async ({ request }) => {
    const res = await request.get(`${base}preview.png`)
    expect(res.ok()).toBe(true)
    const png = await res.body()
    expect(png.length).toBeLessThan(300 * 1024)
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630])
  })
})
