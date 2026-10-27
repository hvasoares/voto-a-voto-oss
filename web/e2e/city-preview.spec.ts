import { expect, test } from '@playwright/test'
import { base, collectRequests, violations } from './helpers'

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
    expect(d).toMatch(/Resultado de Cidade Exemplo \(RJ\), 2026, 2º turno: votaram \d+% do eleitorado e Candidato A recebeu \d+% dos votos válidos\./)
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