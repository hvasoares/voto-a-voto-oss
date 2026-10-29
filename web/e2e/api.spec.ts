import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { datasetFingerprintFromDisk } from '../integrations/shards-fingerprint'
import { base, collectRequests } from './helpers'
import { DESKTOP } from './presets'

/*
 * The static JSON API and the per-page data download (ticket #64). The API is the shards the pages read, so the checks
 * compare bytes with the files on disk and numbers with what the page draws.
 */
const fixture = (...p: string[]) => resolve('fixtures/data', ...p)

test.describe('static JSON API', () => {
  test('the reference lists the endpoints, the fields and the edition, and its example resolves', async ({ page, request }) => {
    const version = await datasetFingerprintFromDisk()
    await page.goto(base + 'api/')
    await expect(page.locator('h1')).toHaveText('API de dados abertos')
    await expect(page.locator('[data-api-edition]')).toHaveAttribute('data-api-edition', '2026-10-26')
    await expect(page.locator('[data-component="api-endpoints"] [data-endpoint]')).toHaveText([/Cidade/, /Estado/, /Totais/, /Busca/])
    await expect(page.locator('[data-endpoint="Cidade"]')).toContainText(`${base}data/v${version}/city/{uf}/{slug}.json`)
    await expect(page.locator('[data-endpoint="Cidade"]')).toContainText('anuladosApuSep')
    await expect(page.locator('[data-component="api-rules"]')).toContainText('CORS aberto')
    const example = await request.get((await page.locator('[data-api-example]').getAttribute('href'))!)
    expect(example.status()).toBe(200)
  })

  test('latest.json points at the shards of the edition the site shows', async ({ request }) => {
    const latest = await (await request.get(base + 'api/latest.json')).json()
    const version = await datasetFingerprintFromDisk()
    expect(latest.edition).toBe('2026-10-26')
    expect(latest.fingerprint).toBe(version)
    expect(latest.endpoints.city).toContain(`/data/v${version}/city/{uf}/{slug}.json`)
    const total = await request.get(latest.endpoints.totals.replace(/^https?:\/\/[^/]+/, ''))
    expect(total.status()).toBe(200)
  })

  test('every JSON file is readable from another origin (open CORS)', async ({ page, baseURL, request }) => {
    const version = await datasetFingerprintFromDisk()
    const other = baseURL!.replace('localhost', '127.0.0.1') // a different origin than the site
    await page.goto(other + base + 'sobre-os-dados/')
    const paths = ['api/latest.json', `data/v${version}/city/rj/cidade-exemplo.json`, `data/v${version}/state/rj.json`, `data/v${version}/totals.json`, 'edicoes/2026-10-26/edition.json']
    for (const path of paths) {
      const result = await page.evaluate(async (url) => {
        const response = await fetch(url, { mode: 'cors' })
        return { ok: response.ok, parsed: typeof (await response.json()) } // a cross-origin fetch only succeeds when the server allows it
      }, baseURL + base + path)
      expect(result, path).toEqual({ ok: true, parsed: 'object' })
      expect((await request.get(baseURL + base + path)).headers()['access-control-allow-origin'], path).toBe('*')
    }
  })

  test('reading the API makes no analytics call and no request beyond the files', async ({ page, baseURL }) => {
    const version = await datasetFingerprintFromDisk()
    await page.goto(base + 'api/')
    const seen = collectRequests(page)
    await page.evaluate(async (url) => { await (await fetch(url)).json() }, `${base}data/v${version}/city/rj/cidade-exemplo.json`)
    expect(seen.map((r) => new URL(r.url).pathname)).toEqual([`${base}data/v${version}/city/rj/cidade-exemplo.json`])
    expect(seen.every((r) => new URL(r.url).origin === new URL(baseURL!).origin)).toBe(true)
  })
})

test.describe('Baixar os dados desta página', () => {
  const desktop = DESKTOP

  test('on the city card the link downloads the city shard byte for byte', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ viewport: desktop, baseURL })
    const page = await context.newPage()
    await page.goto(base + 'rj/cidade-exemplo/')
    const link = page.locator('[data-page-data-download]')
    await expect(link).toBeVisible()
    await expect(link).toHaveText('Baixar os dados desta página ›')
    const version = await datasetFingerprintFromDisk()
    const [download] = await Promise.all([page.waitForEvent('download'), link.click()])
    expect(download.suggestedFilename()).toBe('rj-cidade-exemplo.json')
    const bytes = readFileSync((await download.path())!)
    expect(bytes.equals(readFileSync(resolve('public/data', `v${version}`, 'city/rj/cidade-exemplo.json')))).toBe(true)
    await context.close()
  })

  test('the downloaded city data holds the numbers the card draws', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ viewport: desktop, baseURL })
    const page = await context.newPage()
    await page.goto(base + 'rj/cidade-exemplo/')
    const href = (await page.locator('[data-page-data-download]').getAttribute('href'))!
    const shard = await (await page.request.get(href)).json()
    const block = shard.cycles['2026']['2']
    await expect(page.locator('#main')).toContainText(new Intl.NumberFormat('pt-BR').format(block.votes[Object.keys(block.votes)[0]!]))
    await context.close()
  })

  test('on /brasil/ the link downloads the data the page is drawn from', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ viewport: desktop, baseURL })
    const page = await context.newPage()
    await page.goto(base + 'brasil/')
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('[data-page-data-download]').click()])
    const view = JSON.parse(readFileSync((await download.path())!, 'utf8'))
    expect(download.suggestedFilename()).toBe('brasil.json')
    for (const region of view.regions) {
      const row = page.locator(`[data-regiao="${region.regiao}"]`)
      await expect(row).toContainText(`${region.shareText}% dos votos válidos do país`)
      for (const c of region.candidates) await expect(row).toContainText(`${c.label} ${c.pctText}%`)
    }
    await context.close()
  })

  test('on the state page the link downloads the state shard', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ viewport: desktop, baseURL })
    const page = await context.newPage()
    await page.goto(base + 'rj/')
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('[data-page-data-download]').click()])
    expect(readFileSync((await download.path())!).equals(readFileSync(resolve('public/data', `v${await datasetFingerprintFromDisk()}`, 'state/rj.json')))).toBe(true)
    await context.close()
  })

  test('on the three-cycle page the link is the city shard too', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ viewport: desktop, baseURL })
    const page = await context.newPage()
    await page.goto(base + 'rj/cidade-exemplo/tres-ciclos/')
    await expect(page.locator('[data-page-data-download]')).toHaveAttribute('href', new RegExp(`data/v[0-9a-f]{16}/city/rj/cidade-exemplo\\.json$`))
    await context.close()
  })

  test('on the phone the link is not shown', async ({ page }) => {
    await page.goto(base + 'rj/cidade-exemplo/')
    await expect(page.locator('[data-page-data-download]')).toBeHidden()
    await page.goto(base + 'brasil/')
    await expect(page.locator('[data-page-data-download]')).toBeHidden()
  })
})
