/**
 * The preview-image build mechanics (ticket #8): the cache (resumable builds) and the published copies —
 * driven here with stub rasters, and once through the real rasteriser (sharp) for format, size and content.
 */
import { existsSync, readFileSync, rmSync, statSync, mkdtempSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { buildShards } from './shards'
import { createHash } from 'node:crypto'
import { generatePreviews, PREVIEW_SPEC, rasterizePreview, type PreviewPlanItem } from './preview-images'
import { previewSvg } from '../src/lib/link-preview'
import { cityShardResult } from '../src/lib/city-shard'
import { defaultView } from '../src/slots/city/city-view'

const plan = (svgs: (string | undefined)[]): PreviewPlanItem[] =>
  svgs.map((svg, i) => ({ uf: 'rj', slug: `cidade-${i}`, nome: `Cidade ${i}`, svg }))

/** The cache file of the picture `svg` of city `n`: the city path plus the digest of the svg. */
const cachedFile = (n: number, svg: string) =>
  `content/rj/cidade-${n}.${createHash('sha256').update(svg).digest('hex').slice(0, 16)}.png`

const one = 'rj/cidade-0.png'
const two = 'rj/cidade-1.png'

function harness(rasterize?: (svg: string) => Promise<Buffer>) {
  const root = mkdtempSync(resolve(tmpdir(), 'previews-'))
  const out = resolve(root, 'public/preview')
  const cache = resolve(root, '.cache/previews')
  const calls: string[] = []
  const raster = rasterize ?? (async (svg: string) => (calls.push(svg), Buffer.from(`raster:${calls.length}:${svg}`)))
  return {
    out,
    cache,
    calls,
    run: (planItems: PreviewPlanItem[], fingerprint = 'aaaa0000aaaa0000', concurrency?: number) =>
      generatePreviews({ publicPreview: out, cacheDir: cache, plan: planItems, fingerprint, rasterize: raster, concurrency }),
  }
}

describe('generatePreviews: cache and copies', () => {
  it('the first run rasterises every drawable city, publishes one file per city and writes the sentinels', async () => {
    const h = harness()
    const report = await h.run(plan(['a', 'b', undefined]))
    expect(report).toMatchObject({ fingerprint: 'aaaa0000aaaa0000', cities: 3, drawn: 2, reused: 0, absent: 1, files: 2 })
    expect(h.calls).toHaveLength(2)
    expect(existsSync(resolve(h.out, one))).toBe(true)
    expect(existsSync(resolve(h.out, two))).toBe(true)
    expect(existsSync(resolve(h.out, '.generator'))).toBe(true)
    expect(existsSync(resolve(h.cache, cachedFile(0, 'a')))).toBe(true)
    expect(readdirSync(resolve(h.cache, 'content/rj'))).toHaveLength(2)
    expect(readFileSync(resolve(h.out, '.generator'), 'utf8')).toBe(`${PREVIEW_SPEC} aaaa0000aaaa0000\n`)
    expect(readFileSync(resolve(h.cache, 'content', '.generator'), 'utf8')).toBe(`${PREVIEW_SPEC}\n`)
    // the published copy IS the cached raster
    expect(readFileSync(resolve(h.out, one))).toEqual(readFileSync(resolve(h.cache, cachedFile(0, 'a'))))
  })

  it('a rebuild of the same dataset rasterises nothing (reused = every drawable city)', async () => {
    const h = harness()
    await h.run(plan(['a', 'b', undefined]))
    const calls = h.calls.length
    const report = await h.run(plan(['a', 'b', undefined]))
    expect(report).toMatchObject({ drawn: 0, reused: 2, files: 2, absent: 1 })
    expect(h.calls).toHaveLength(calls)
  })

  it('a half-published run resumes in place: a missing copy is replaced from the cache', async () => {
    const h = harness()
    await h.run(plan(['a', 'b', undefined]))
    const out1 = resolve(h.out, one)
    const bytes = statSync(out1).size
    rmSync(out1)
    const report = await h.run(plan(['a', 'b', undefined]))
    expect(report.files).toBe(2)
    expect(existsSync(out1)).toBe(true)
    expect(statSync(out1).size).toBe(bytes)
    expect(readFileSync(out1)).toEqual(readFileSync(resolve(h.cache, cachedFile(0, 'a'))))
  })

  it('a crashed run leaves no half raster behind and the next run redraws only what the cache lacks', async () => {
    const h = harness()
    await h.run(plan(['a', 'b', undefined]))
    rmSync(resolve(h.cache, cachedFile(1, 'b')))
    const report = await h.run(plan(['a', 'b', undefined]))
    expect(report).toMatchObject({ drawn: 1, reused: 1 })
    expect(existsSync(resolve(h.cache, cachedFile(1, 'b')))).toBe(true)
  })

  it('a dataset change that leaves a city\'s picture as it was rasterises nothing for that city (private#201)', async () => {
    const h = harness()
    await h.run(plan(['a', 'b']), 'aaaa0000aaaa0000')
    const report = await h.run(plan(['a', 'b']), 'bbbb0000bbbb0000')
    expect(report).toMatchObject({ fingerprint: 'bbbb0000bbbb0000', drawn: 0, reused: 2 })
    expect(readFileSync(resolve(h.out, '.generator'), 'utf8')).toBe(`${PREVIEW_SPEC} bbbb0000bbbb0000\n`)
  })

  it('a changed picture is redrawn alone, and the cache keeps no file of a picture the plan no longer has', async () => {
    const h = harness()
    await h.run(plan(['a', 'b']))
    const report = await h.run(plan(['a', 'b2']), 'bbbb0000bbbb0000')
    expect(report).toMatchObject({ drawn: 1, reused: 1 })
    expect(readdirSync(resolve(h.cache, 'content/rj')).sort()).toEqual([cachedFile(0, 'a'), cachedFile(1, 'b2')].map((f) => f.replace('content/rj/', '')).sort())
  })

  it('files of cities the dataset no longer has do not survive the rebuild (a published stale image would still resolve)', async () => {
    const h = harness()
    await h.run(plan(['a']), 'aaaa0000aaaa0000')
    const stray = resolve(h.out, 'rj/cidade-97.png')
    mkdirSync(resolve(h.out, 'rj'), { recursive: true })
    writeFileSync(stray, 'stale')
    await h.run(plan(['a']), 'bbbb0000bbbb0000')
    expect(existsSync(stray)).toBe(false)
  })

  it('a raster written by another PREVIEW_SPEC contract is redrawn, not served', async () => {
    const h = harness()
    await h.run(plan(['a']), 'aaaa0000aaaa0000')
    const cached = resolve(h.cache, cachedFile(0, 'a'))
    writeFileSync(resolve(h.cache, 'content', '.generator'), `voto-previews/0\n`)
    const report = await h.run(plan(['a']), 'aaaa0000aaaa0000')
    expect(report.drawn).toBe(1)
    expect(existsSync(cached)).toBe(true)
  })

  it('no scratch file survives: rasterisations and copies land atomically, nothing partial remains', async () => {
    const h = harness()
    await h.run(plan(['a', 'b', undefined]))
    expect(readdirSync(resolve(h.out, 'rj')).sort()).toEqual(['cidade-0.png', 'cidade-1.png'])
    expect(readFileSync(resolve(h.out, '.generator'), 'utf8')).toBe(`${PREVIEW_SPEC} aaaa0000aaaa0000\n`)
  })
})

describe('the real rasteriser', () => {
  it('rasterises the share picture into a PNG of exactly the og:image size it is declared at', async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="476" viewBox="0 0 1080 1070"><rect width="1080" height="1070" fill="#faf7f0"/><text x="98" y="200" font-family="Georgia, serif" font-size="100">Cidade</text></svg>`
    const buf = await rasterizePreview(svg)
    const meta = await sharp(buf).metadata()
    expect(meta.format).toBe('png')
    expect(meta.width).toBe(480)
    expect(meta.height).toBe(476)
  })

  it('the fixture city picture is a compact PNG worth publishing (the size budget of the ticket)', async () => {
    // the drawing itself comes from the shared function (the fixture city's latest round)
    const shardSources: Record<string, string> = {}
    for (const f of ['candidates.csv', 'centroids.csv', 'cities.csv', 'manifest.json', 'turnout.csv', 'votes.csv'])
      shardSources[f] = readFileSync(resolve('fixtures/data', f), 'utf8')
    const built = buildShards(shardSources as never)
    const shard = JSON.parse(built.files.find((f) => f.path.endsWith('/city/rj/cidade-exemplo.json'))!.json)
    const view = defaultView((ano, turno) => !!cityShardResult(shard, ano, turno))
    const result = cityShardResult(shard, view.ano, view.turno)!
    const svg = previewSvg(result, { uf: 'rj', slug: 'cidade-exemplo', nome: 'CIDADE EXEMPLO' }, { fixture: true })
    const buf = await rasterizePreview(svg)
    expect(buf.length).toBeLessThan(30_000)
    expect(buf.length).toBeGreaterThan(5_000)
  })
})