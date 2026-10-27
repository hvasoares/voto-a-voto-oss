/**
 * Bytes the home page ships, gzipped, as the browser requests them (HTML, JS, CSS, fonts, data).
 *   tsx scripts/measure.ts <url | dist directory> [--search] [--path /brasil/] [--size 1440x900]
 *   --search: type into the search first, to count the island; --path: the page to load (default "/", a directory target only);
 *   --size: the viewport (default 390x844, the phone).
 * A directory is served in-process (Pages-like, base "/") on port 4178 while measuring. Exits when done.
 */
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import { chromium } from '@playwright/test'
import { startServer } from './serve'

const [target, ...flags] = process.argv.slice(2)
if (!target) throw new Error('usage: measure.ts <url|dist-dir> [--search]')
const server = existsSync(target) ? await startServer(resolve(target), 4178, '/') : undefined
const flag = (name: string) => flags[flags.indexOf(name) + 1] ?? ''
const [width = 390, height = 844] = (flags.includes('--size') ? flag('--size') : '390x844').split('x').map(Number)
const url = server ? `http://localhost:4178${(flag('--path') || '/')}` : target
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width, height } })
const rows: { path: string; type: string; raw: number; gzip: number }[] = []
page.on('response', async (r) => {
  const type = r.request().resourceType()
  if (!['document', 'script', 'stylesheet', 'font', 'fetch', 'xhr'].includes(type)) return
  const body = await r.body().catch(() => undefined)
  if (body) rows.push({ path: new URL(r.url()).pathname, type, raw: body.length, gzip: gzipSync(body).length })
})
await page.goto(url)
await page.waitForLoadState('networkidle')
if (flags.includes('--search')) {
  const box = page.getByRole('combobox').or(page.getByRole('searchbox')).first()
  await box.click()
  await box.fill('cidade')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(300)
}
await browser.close()
server?.close()
const sum = (type: string[], key: 'raw' | 'gzip') => rows.filter((r) => type.includes(r.type)).reduce((n, r) => n + r[key], 0)
for (const r of rows) console.log(`${r.type.padEnd(10)} ${String(r.raw).padStart(8)} ${String(r.gzip).padStart(8)}  ${r.path}`)
console.log(JSON.stringify({ js_gzip: sum(['script'], 'gzip'), js_raw: sum(['script'], 'raw'), css_gzip: sum(['stylesheet'], 'gzip'), html_gzip: sum(['document'], 'gzip'), data_gzip: sum(['fetch', 'xhr'], 'gzip') }))

process.exit(0)
