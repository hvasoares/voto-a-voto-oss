/**
 * The demo pages rule (#137), tested twice: seeded fixtures prove each rule can go red (a dropped meta, a link, a sitemap entry),
 * then the same function runs over the real fixture build for both base values.
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, sep } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { withBuildLock } from './build-lock'
import { demoPageProblems } from './demo-pages'
import { walkFiles } from './walk'

const NOINDEX = '<head><meta name="robots" content="noindex"></head>'
const clean = (): Record<string, string> => ({
  'qr/index.html': `${NOINDEX}<a href="/compartilhar/">Voltar</a>`,
  'compartilhar/index.html': `${NOINDEX}<a href="/qr/">Mostrar QR</a>`,
  'rj/cidade-exemplo/index.html': '<a href="/rj/cidade-exemplo/qr/">QR</a><a href="/rj/cidade-exemplo/compartilhar/">Compartilhar</a>',
  'index.html': '<a href="/brasil/qr/">x</a><a href="https://example.com/qr/">y</a>',
})

describe('demo pages stay noindex and unlinked (#137), seeded', () => {
  it('passes the clean site: the demos link each other, the city routes are not the demos', () => {
    expect(demoPageProblems(clean(), '/', { 'sitemap.xml': '<loc>https://x.br/rj/cidade-exemplo/qr/</loc>' })).toEqual([])
  })

  it('fails when a demo drops the robots meta', () => {
    const pages = { ...clean(), 'qr/index.html': '<head></head><a href="/compartilhar/">Voltar</a>' }
    expect(demoPageProblems(pages, '/')).toEqual([expect.stringMatching(/^qr\/index\.html: the demo page must emit <meta name="robots" content="noindex">/)])
  })

  it('fails when a demo page is not built', () => {
    const { 'compartilhar/index.html': _gone, ...pages } = clean()
    expect(demoPageProblems(pages, '/')).toEqual([expect.stringMatching(/^compartilhar\/index\.html: the demo page is not built/)])
  })

  it.each([
    ['a plain link', '<a href="/qr/">x</a>', '/', 'qr/'],
    ['a link with a query', '<a href="/compartilhar/?ciclo=2022">x</a>', '/', 'compartilhar/'],
    ['a link with the file name', "<a href='/qr/index.html'>x</a>", '/', 'qr/'],
    ['a link behind the base', '<a href="/voto-a-voto-oss/qr/">x</a>', '/voto-a-voto-oss/', 'qr/'],
  ])('fails on %s from another page, naming the page', (_label, link, base, demo) => {
    const pages = { ...clean(), 'sobre-os-dados/index.html': link }
    expect(demoPageProblems(pages, base)).toEqual([expect.stringContaining(`sobre-os-dados/index.html: links to the demo page ${base}${demo}`)])
  })

  it('fails when a sitemap lists a demo', () => {
    const sitemaps = { 'sitemap-0.xml': '<urlset><url><loc>https://x.br/voto-a-voto-oss/qr/</loc></url></urlset>' }
    expect(demoPageProblems(clean(), '/voto-a-voto-oss/', sitemaps)).toEqual([expect.stringMatching(/^sitemap-0\.xml: lists the demo page \/voto-a-voto-oss\/qr\//)])
  })
})

describe('demo pages stay noindex and unlinked (#137), the real build', () => {
  const WEB = join(import.meta.dirname, '..')
  const out = mkdtempSync(join(tmpdir(), 'demo-pages-'))
  const builds = ['/', '/voto-a-voto-oss/'].map((base, i) => ({ base, dir: join(out, `build-${i}`) }))

  beforeAll(() => {
    for (const b of builds) {
      const env: NodeJS.ProcessEnv = { ...process.env, SITE_BASE: b.base, OUT_DIR: b.dir }
      delete env.DATA_DIR // the committed fixtures: the same pages in every checkout
      // vitest's own Vite env would leak into the child build and override its base
      for (const key of ['BASE_URL', 'MODE', 'DEV', 'PROD', 'SSR', 'NODE_ENV', 'VITEST', 'VITEST_MODE', 'VITEST_POOL_ID', 'VITEST_WORKER_ID']) delete env[key]
      withBuildLock(WEB, () => execFileSync('npx', ['astro', 'build'], { cwd: WEB, env, stdio: 'pipe' }))
    }
  }, 240_000)

  afterAll(() => rmSync(out, { recursive: true, force: true }))

  it.each([0, 1])('build %i: both demos emit noindex, no page links to them, no sitemap lists them', (i) => {
    const { base, dir } = builds[i]!
    const files = walkFiles(dir).map((p) => [relative(dir, p).split(sep).join('/'), p] as const)
    const read = (ext: string) => Object.fromEntries(files.filter(([rel]) => rel.endsWith(ext)).map(([rel, p]) => [rel, readFileSync(p, 'utf8')]))
    const pages = read('.html')
    expect(Object.keys(pages).length, 'the build produced pages').toBeGreaterThan(100)
    expect(demoPageProblems(pages, base, read('.xml')).join('\n')).toBe('')
  })
})
