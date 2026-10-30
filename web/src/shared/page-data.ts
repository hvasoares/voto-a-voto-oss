/**
 * The shape of the one data file a secondary page loads (private#205, the lighter-site milestone): the pure
 * half shared by the build's writer (`integrations/page-data.ts`) and the loader. It holds the version of the
 * shape, the page's address, the payload and a checksum of the payload; it touches neither the file system
 * nor the network, and runs in Node and in the browser.
 */
export const PAGE_DATA_VERSION = 1

/** The file as written: keys always in this order. */
export interface PageDataFile<T = unknown> {
  v: number
  family: string
  /** The page's address inside its family, e.g. `rj/cidade-exemplo`; the file is `<family>/<path>.json`. */
  path: string
  data: T
  /** `checksum(data)`: catches a truncated or edited file before the page draws it. */
  sum: string
}

/** JSON with the keys of every object in code-point order, so the same records give the same bytes. */
export function stableJson(value: unknown): string {
  return JSON.stringify(sortKeys(value))
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys)
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => [k, sortKeys(v)]),
    )
  }
  return value
}

/** FNV-1a (32 bit) of the payload's stable JSON, 8 hex digits: an integrity check, not a security one. */
export function checksum(data: unknown): string {
  let h = 0x811c9dc5
  for (const byte of new TextEncoder().encode(stableJson(data))) h = Math.imul(h ^ byte, 0x01000193)
  return (h >>> 0).toString(16).padStart(8, '0')
}

/** Where a page's file lives, relative to the `data` folder (the writer writes it, the page script fetches it): `v<fingerprint>/<family>/<path>.json`. */
export function pageDataPath(fingerprint: string, family: string, path: string): string {
  return `v${fingerprint}/${family}/${path}.json`
}

/** The file for one page (what the writer serialises with `stableJson`). */
export function pageDataFile<T>(family: string, path: string, data: T): PageDataFile<T> {
  return { v: PAGE_DATA_VERSION, family, path, data, sum: checksum(data) }
}

export type PageDataCheck<T = unknown> = { ok: true; file: PageDataFile<T> } | { ok: false; error: string }

/** Validates a parsed file; `expected` (family and path) also pins the address the loader asked for. */
export function validatePageData(value: unknown, expected?: { family?: string; path?: string }): PageDataCheck {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return { ok: false, error: 'not an object' }
  const f = value as Record<string, unknown>
  for (const key of ['v', 'family', 'path', 'data', 'sum']) if (!(key in f)) return { ok: false, error: `missing field ${key}` }
  if (f.v !== PAGE_DATA_VERSION) return { ok: false, error: `wrong version ${String(f.v)} (expected ${PAGE_DATA_VERSION})` }
  if (typeof f.family !== 'string' || typeof f.path !== 'string' || typeof f.sum !== 'string') return { ok: false, error: 'family, path and sum must be strings' }
  if (expected?.family !== undefined && f.family !== expected.family) return { ok: false, error: `wrong family ${f.family}` }
  if (expected?.path !== undefined && f.path !== expected.path) return { ok: false, error: `wrong address ${f.path}` }
  if (checksum(f.data) !== f.sum) return { ok: false, error: 'bad checksum' }
  return { ok: true, file: f as unknown as PageDataFile }
}
