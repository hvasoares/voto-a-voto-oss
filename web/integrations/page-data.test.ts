import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadCityRoutes } from '../src/lib/city-routes'
import { validatePageData } from '../src/shared/page-data'
import { joinPageData, pageDataFiles, writePageData, type PageRecords } from './page-data'

const FP = '0123456789abcdef'
const FAMILY = 'fixture'
const addresses = async (): Promise<string[]> => (await loadCityRoutes()).map((c) => `${c.uf}/${c.slug}`).sort()
/** The synthetic family: each page's records are its city and a few fictitious numbers. */
const pagesOf = (routes: string[]): PageRecords[] => routes.map((path, i) => ({ path, data: { n: i, city: path.split('/')[1], list: [i, i * 2] } }))

describe('the data file of each page (golden)', () => {
  it('pins the bytes of all the files of the fixture family', async () => {
    const routes = await addresses()
    const files = pageDataFiles(FP, FAMILY, pagesOf(routes))
    expect(files).toHaveLength(routes.length)
    expect(files[0]).toEqual({
      path: `v${FP}/fixture/mt/boa-esperanca-do-norte.json`,
      json: '{"data":{"city":"boa-esperanca-do-norte","list":[0,0],"n":0},"family":"fixture","path":"mt/boa-esperanca-do-norte","sum":"99f316b2","v":1}',
    })
    expect(files).toMatchSnapshot()
  })

  it('is deterministic: the order of the keys of the records does not change the bytes', () => {
    const a = pageDataFiles(FP, FAMILY, [{ path: 'rj/x', data: { a: 1, b: { c: 1, d: 2 } } }])
    const b = pageDataFiles(FP, FAMILY, [{ path: 'rj/x', data: { b: { d: 2, c: 1 }, a: 1 } }])
    expect(a).toEqual(b)
  })

  it('every file passes the shape validator', async () => {
    for (const f of pageDataFiles(FP, FAMILY, pagesOf(await addresses()))) expect(validatePageData(JSON.parse(f.json), { family: FAMILY })).toMatchObject({ ok: true })
  })

  it('writes the files under data/v<fingerprint>/<family>/', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'page-data-'))
    try {
      const [written] = writePageData(dir, FP, FAMILY, pagesOf(await addresses()))
      expect(readFileSync(join(dir, written!), 'utf8')).toBe(pageDataFiles(FP, FAMILY, pagesOf(await addresses()))[0]!.json)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('refuses two pages with one address', () => {
    expect(() => pageDataFiles(FP, FAMILY, [{ path: 'a/b', data: 1 }, { path: 'a/b', data: 2 }])).toThrow(/share the address a\/b/)
  })
})

describe('the join: one file per page of the route list', () => {
  it('holds for the fixture family over the cities of the route list', async () => {
    const routes = await addresses()
    expect(routes.length).toBeGreaterThan(1)
    expect(joinPageData(FAMILY, FP, routes, pageDataFiles(FP, FAMILY, pagesOf(routes)).map((f) => f.path))).toEqual([])
  })

  it('fails when a page has no file', async () => {
    const routes = await addresses()
    const files = pageDataFiles(FP, FAMILY, pagesOf(routes)).map((f) => f.path).slice(1)
    expect(joinPageData(FAMILY, FP, routes, files)).toEqual([`no file for v${FP}/fixture/${routes[0]}.json`])
  })

  it('fails when a page has two files', async () => {
    const routes = await addresses()
    const files = pageDataFiles(FP, FAMILY, pagesOf(routes)).map((f) => f.path)
    expect(joinPageData(FAMILY, FP, routes, [...files, files[0]!])).toEqual([`2 files for v${FP}/fixture/${routes[0]}.json`])
  })

  it('fails on a file with no page, and on a route listed twice', () => {
    expect(joinPageData(FAMILY, FP, ['a/b', 'a/b'], [`v${FP}/fixture/a/b.json`, `v${FP}/fixture/c/d.json`])).toEqual([
      `file v${FP}/fixture/c/d.json has no page`,
      'two pages for a/b',
    ])
  })
})
