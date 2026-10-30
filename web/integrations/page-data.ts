import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { pageDataFile, pageDataPath, stableJson } from '../src/shared/page-data'

/**
 * The one writer of the per-page data files (private#205): given a family and its pages with their records, it
 * produces `data/v<fingerprint>/<family>/<path>.json` for each, in a stable key order, in the same version
 * directory as the shards (a stale copy is never served). Families pass their records and write no file
 * themselves; the shape is `src/shared/page-data.ts`, which the loader also uses.
 */
export interface PageRecords<T = unknown> {
  /** The page's address inside the family, e.g. `rj/cidade-exemplo`. */
  path: string
  data: T
}

export { pageDataPath }

export interface PageDataOutput {
  /** Relative to `public/data`. */
  path: string
  json: string
}

/** Pure half: the files (path and text) for a family. Two pages with the same address are a build error. */
export function pageDataFiles(fingerprint: string, family: string, pages: readonly PageRecords[]): PageDataOutput[] {
  const seen = new Set<string>()
  return pages.map((page) => {
    if (seen.has(page.path)) throw new Error(`page data: two pages of ${family} share the address ${page.path}`)
    seen.add(page.path)
    return { path: pageDataPath(fingerprint, family, page.path), json: stableJson(pageDataFile(family, page.path, page.data)) }
  })
}

/** I/O half: writes the files under `publicData` and returns their paths. Existing files of the family are overwritten. */
export function writePageData(publicData: string, fingerprint: string, family: string, pages: readonly PageRecords[]): string[] {
  const files = pageDataFiles(fingerprint, family, pages)
  for (const f of files) {
    const file = resolve(publicData, f.path)
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, f.json)
  }
  return files.map((f) => f.path)
}

/**
 * The join: every page of the route list has exactly one file, and no file belongs to no page. Returns the
 * problems (empty when the join holds); the test of each family fails on a non-empty list.
 */
export function joinPageData(family: string, fingerprint: string, routes: readonly string[], files: readonly string[]): string[] {
  const count = new Map<string, number>()
  for (const f of files) count.set(f, (count.get(f) ?? 0) + 1)
  const wanted = new Set(routes.map((r) => pageDataPath(fingerprint, family, r)))
  return [
    ...[...wanted].filter((f) => !count.has(f)).map((f) => `no file for ${f}`),
    ...[...count].filter(([, n]) => n > 1).map(([f, n]) => `${n} files for ${f}`),
    ...[...count.keys()].filter((f) => !wanted.has(f)).map((f) => `file ${f} has no page`),
    ...routes.filter((r, i) => routes.indexOf(r) !== i).map((r) => `two pages for ${r}`),
  ]
}
