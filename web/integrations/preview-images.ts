/**
 * The link-preview images of every city (ticket #8), build time only. Each image is THE share picture
 * (`shareCardSvg` through `previewSvg`, the same drawing the share sheet inlines), rasterised to a compact
 * PNG at og:image size by sharp; the city page tags the file with og:image/twitter:card (static strings,
 * no JS). File path: `preview/<uf>/<slug>.png` — slugs are unique within each UF (locked by the shard
 * builder), so paths and og:url never collide.
 *
 * Runs at `astro:config:setup` (like the shards generator of #49) — before Astro copies `public/` into the
 * output: it writes `public/preview/` and reads the shards that `dataset()` (registered BEFORE it) wrote.
 *
 * CACHE (resumable builds): rasters live in `.cache/previews/v<shard-fingerprint>/<uf>/<slug>.png` — the
 * fingerprint keys the dataset, the path keys the city. A rebuild without a dataset change rasterises only
 * the cities its cache has no file for (writes go to a `.part` temp + atomic rename, so a crashed run
 * leaves no half raster); the published copies are reused when they already match the cache. `.cache/` is
 * gitignored and machine-local: rasters are not byte-identical across machines (system fonts differ) and
 * no published page depends on their bytes — the og tags reference the files, not their content.
 */
import type { AstroIntegration } from 'astro'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import sharp from 'sharp'
import { datasetFingerprintFromDisk } from './shards-fingerprint'
import { datasetFixture, loadCityShard } from '../src/lib/shard-files'
import { loadCityRoutes } from '../src/lib/city-routes'
import { cityShardResult } from '../src/lib/city-shard'
import { defaultView } from '../src/slots/city/city-view'
import { normalizeBase } from '../src/paths'
import { siteOrigin } from '../src/lib/share-url'
import { previewFile, previewSvg } from '../src/lib/link-preview'
import type { Turno } from '../src/data'

/** Version of the rasteriser's contract (format, size, quality of the picture): cached version directories are rebuilt when it changes. */
export const PREVIEW_SPEC = 'voto-previews/1'
/** Parallel rasterisations (sharp keeps its own libvips thread pool; a small pool is enough to saturate it). */
export const PREVIEW_CONCURRENCY = 8

/** The picture of one city to rasterise, at the og:image size (`previewSvg`: the share drawing, display size set). */
export interface PreviewPlanItem {
  uf: string
  slug: string
  nome: string
  svg?: string
}

export interface PreviewReport {
  fingerprint: string
  cities: number
  /** Rasterised this run. */
  drawn: number
  /** Served from the cache (their rasterisation was skipped). */
  reused: number
  /** Cities with no result: no image is drawn and the page tags no og:image. */
  absent: number
  /** Preview files published (copied into public/preview this run or already matching). */
  files: number
  /** Bytes of the published preview files. */
  bytes: number
}

export type Rasterize = (svg: string) => Promise<Buffer>

/** The og:image raster of one svg. The svg already declares its display size (one px per SVG unit at 72 dpi). */
export async function rasterizePreview(svg: string): Promise<Buffer> {
  return sharp(Buffer.from(svg), { density: 72 }).png({ palette: true, quality: 100 }).toBuffer()
}

/** Every city of the dataset: the default view's picture (the latest result) or nothing to draw. */
export async function buildPreviewPlan(): Promise<PreviewPlanItem[]> {
  const routes = (await loadCityRoutes()) ?? []
  const origin = siteOrigin()
  const base = normalizeBase(process.env.SITE_BASE)
  const fixture = await datasetFixture()
  const id = (route: (typeof routes)[number]) => ({ uf: route.uf, slug: route.slug, nome: route.nome })
  return Promise.all(
    routes.map(async (route) => {
      const shard = await loadCityShard(route.uf, route.slug)
      if (!shard) return id(route)
      const has = (ano: number, turno: Turno) => !!cityShardResult(shard, ano, turno)
      const view = defaultView(has)
      const result = cityShardResult(shard, view.ano, view.turno)
      if (!result) return id(route)
      return { ...id(route), svg: previewSvg(result, route, { origin, base, fixture }) }
    }),
  )
}

async function mapPool<T, R>(items: T[], concurrency: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(concurrency, Math.max(items.length, 1)) }, async () => {
    while (true) {
      const i = next++
      if (i >= items.length) return
      out[i] = await fn(items[i]!, i)
    }
  })
  await Promise.all(workers)
  return out
}

/** The directory's `.generator` line: the version of the contract, and for the published one the dataset too. */
const cacheSentinel = `${PREVIEW_SPEC}\n`
const outSentinel = (fingerprint: string) => `${PREVIEW_SPEC} ${fingerprint}\n`

/** The directory must be rebuilt when it is not there, was written empty, or holds another contract's sentinel. */
function dirIsStale(dir: string, sentinel: string): boolean {
  try {
    return readFileSync(resolve(dir, '.generator'), 'utf8') !== sentinel
  } catch {
    return true
  }
}

/**
 * Rasterises the plan into `cacheDir` (the resumable cache) and publishes every image under `publicPreview`
 * (what Astro copies into the output). The mechanics around the injected `rasterize`; plan and fingerprint
 * are parameters, so tests drive it with stubs and temp directories. One rasterisation per cache miss — a
 * rebuild of an unchanged dataset draws nothing (`reused` = every drawable city) and only refreshes copies.
 */
export async function generatePreviews(o: {
  publicPreview: string
  cacheDir: string
  plan: PreviewPlanItem[]
  fingerprint: string
  rasterize: Rasterize
  concurrency?: number
}): Promise<PreviewReport> {
  const version = `v${o.fingerprint}`
  const cacheVersion = resolve(o.cacheDir, version)

  // A cache version directory written by another contract (or half-written) is rebuilt from scratch, and
  // older version directories never accumulate: one dataset in, one directory out.
  if (dirIsStale(cacheVersion, cacheSentinel)) rmSync(cacheVersion, { recursive: true, force: true })
  try {
    for (const entry of readdirSync(o.cacheDir)) if (entry !== version) rmSync(resolve(o.cacheDir, entry), { recursive: true, force: true })
  } catch {
    // no cache yet
  }

  // The published directory is rebuilt when it does not match this generator and dataset (files of cities
  // the dataset no longer has must not survive); an interrupted run resumes into it file by file.
  if (dirIsStale(o.publicPreview, outSentinel(o.fingerprint))) rmSync(o.publicPreview, { recursive: true, force: true })
  mkdirSync(o.publicPreview, { recursive: true })

  const drawable = o.plan.filter((item): item is PreviewPlanItem & { svg: string } => item.svg !== undefined)
  let drawn = 0
  await mapPool(drawable, o.concurrency ?? PREVIEW_CONCURRENCY, async (item) => {
    const cached = resolve(cacheVersion, previewFile(item.uf, item.slug))
    if (existsSync(cached)) return
    drawn++
    const buf = await o.rasterize(item.svg)
    mkdirSync(dirname(cached), { recursive: true })
    const part = `${cached}.part`
    writeFileSync(part, buf)
    renameSync(part, cached)
  })

  let bytes = 0
  for (const item of drawable) {
    const rel = previewFile(item.uf, item.slug)
    const cached = resolve(cacheVersion, rel)
    const out = resolve(o.publicPreview, rel)
    const size = statSync(cached).size
    if (!existsSync(out) || statSync(out).size !== size) {
      mkdirSync(dirname(out), { recursive: true })
      const part = `${out}.part`
      copyFileSync(cached, part)
      renameSync(part, out)
    }
    bytes += size
  }

  // The sentinels go in last: an interrupted run leaves its work stale and the next rebuild starts over,
  // redrawing nothing (the cache already holds every raster the interrupted run managed to finish).
  mkdirSync(cacheVersion, { recursive: true })
  writeFileSync(resolve(cacheVersion, '.generator'), cacheSentinel)
  writeFileSync(resolve(o.publicPreview, '.generator'), outSentinel(o.fingerprint))

  return {
    fingerprint: o.fingerprint,
    cities: o.plan.length,
    drawn,
    reused: drawable.length - drawn,
    absent: o.plan.length - drawable.length,
    files: drawable.length,
    bytes,
  }
}

/** The build integration. Register it AFTER `dataset()` in astro.config.ts: it reads the shards that one writes. */
export function previewImages(): AstroIntegration {
  return {
    name: 'voto-previews',
    hooks: {
      'astro:config:setup': ({ config, logger }) => {
        const root = new URL(config.root).pathname
        return (async () => {
          const t0 = Date.now()
          const report = await generatePreviews({
            publicPreview: resolve(root, 'public/preview'),
            cacheDir: resolve(root, '.cache/previews'),
            plan: await buildPreviewPlan(),
            fingerprint: await datasetFingerprintFromDisk(),
            rasterize: rasterizePreview,
          })
          logger.info(
            `previews: ${report.files} imagens (${report.drawn} rasterizadas, ${report.reused} do cache, ${report.absent} sem dados), ` +
              `${(report.bytes / 1_000_000).toFixed(1)} MB em ${((Date.now() - t0) / 1000).toFixed(1)} s`,
          )
        })()
      },
    },
  }
}