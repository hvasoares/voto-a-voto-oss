import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { activateSearch, allowedOrigins, base, collectRequests, violations } from './helpers'

/*
 * CDN mechanism, against a PRODUCTION build that takes React from a fake CDN (test double, see playwright.cdn.config.ts).
 * Real provider: not chosen yet; cdn.config.json is empty and the normal production build bundles locally.
 */
type Config = { approvedOrigins: string[]; libraries: Record<string, { url: string; integrity: string }> }
// The file is written by the fake CDN web server, which starts after the spec files are loaded: read it when the tests run.
let config: Config
let cdnOrigin: string
test.beforeAll(() => {
  config = JSON.parse(readFileSync(resolve(process.env.CDN_CONFIG!), 'utf8')) as Config
  cdnOrigin = config.approvedOrigins[0]!
})
const MARKER = 'react.memo_cache_sentinel' // string inside ReactDOM (which brings React): code that only uses React does not contain it
const dist = resolve('dist-cdn-test')

test('the page gets an import map with a pinned URL and an integrity hash for every CDN library', async ({ request }) => {
  const html = await (await request.get(base)).text()
  const map = JSON.parse(/<script type="importmap">([\s\S]*?)<\/script>/.exec(html)![1]!) as { imports: Record<string, string>; integrity: Record<string, string> }
  expect(Object.keys(map.imports).sort()).toEqual(['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime'])
  for (const [spec, lib] of Object.entries(config.libraries)) {
    expect(map.imports[spec]).toBe(lib.url)
    expect(map.integrity[lib.url]).toMatch(/^sha384-/)
    expect(lib.url.startsWith(cdnOrigin + '/')).toBe(true)
  }
})

test('React is not in the local bundle (copies of ReactDOM in local files: 0)', async () => {
  const local = readdirSync(resolve(dist, '_astro')).filter((f) => f.endsWith('.js'))
  expect(local.length).toBeGreaterThan(0)
  for (const f of local) expect(readFileSync(resolve(dist, '_astro', f), 'utf8'), f).not.toContain(MARKER)
})

test('the search works with React from the CDN, one copy of React runs, and only allowed origins are requested', async ({ page, baseURL }) => {
  const seen = collectRequests(page)
  const withReact: string[] = []
  page.on('response', async (r) => {
    if (r.request().resourceType() === 'script' && (await r.text().catch(() => '')).includes(MARKER)) withReact.push(r.url())
  })
  await page.goto(base)
  const box = await activateSearch(page)
  await box.fill('boa esperanca')
  await expect(page.locator('a[data-position]')).toHaveCount(1) // a hook ran: two Reacts would throw "invalid hook call"
  await page.waitForLoadState('networkidle')
  const cdnUrls = seen.filter((r) => r.url.startsWith(cdnOrigin)).map((r) => r.url)
  expect(cdnUrls.sort()).toEqual(Object.values(config.libraries).map((l) => l.url).sort()) // each library fetched once
  expect(withReact).toEqual([config.libraries['react-dom/client']!.url]) // exactly one copy of ReactDOM runs on the page, and it is the CDN one
  expect(violations(seen, await allowedOrigins(new URL(baseURL!).origin))).toEqual([])
})

test('an origin that is not approved is still a violation in production mode (canary)', async ({ page, baseURL }) => {
  const seen = collectRequests(page)
  await page.goto(base)
  await page.evaluate(() => fetch('https://example.invalid/x.js').catch(() => undefined))
  expect(violations(seen, await allowedOrigins(new URL(baseURL!).origin)).some((v) => v.includes('example.invalid'))).toBe(true)
})

test.describe('CDN unreachable: pre-rendered HTML stays readable and the island degrades', () => {
  test('blocked origin', async ({ page }) => {
    await page.route(`${cdnOrigin}/**`, (route) => route.abort('connectionrefused'))
    await page.goto(base)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Voto a Voto')
    await expect(page.locator('a[data-uf]').first()).toBeVisible()
    await expect(page.getByPlaceholder('Busque sua cidade')).toBeVisible()
    await page.getByPlaceholder('Busque sua cidade').click()
    await expect(page.getByText('A busca não está disponível agora')).toBeVisible()
    // still not a blank screen, and the plain links still work
    await expect(page.getByRole('link', { name: /SP · São Paulo/ })).toBeVisible()
    expect((await page.locator('body').innerText()).length).toBeGreaterThan(300)
    await page.getByRole('link', { name: /Brasil e regiões/ }).click()
    await expect(page).toHaveURL(new RegExp(`${base}brasil/$`))
  })

  test('a file whose hash does not match is refused (integrity)', async ({ page }) => {
    await page.route(config.libraries.react!.url, async (route) => {
      const res = await route.fetch()
      await route.fulfill({ response: res, body: (await res.text()) + '\n/* tampered */' })
    })
    await page.goto(base)
    await page.getByPlaceholder('Busque sua cidade').click()
    await expect(page.getByText('A busca não está disponível agora')).toBeVisible()
    await expect(page.locator('a[data-uf]').first()).toBeVisible()
  })
})
