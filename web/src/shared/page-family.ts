/**
 * The one classification table of the lighter-site milestone (private#203): a pure function that maps the
 * path of a built file, relative to the build folder, to its page family. The size script, the stubs' route
 * list and the join tests import it; it never touches the file system (the caller walks the files, see
 * `scripts/walk.ts`), and a path that matches no family is `other`, never an error.
 */
export const PAGE_FAMILIES = [
  'compartilhar',
  'fato',
  'city-card',
  'qr',
  'tres-ciclos',
  'state',
  'region',
  'report',
  'previews',
  'data-shards',
  'other',
] as const

export type PageFamily = (typeof PAGE_FAMILIES)[number]

const REGIONS = new Set(['norte', 'nordeste', 'sudeste', 'sul', 'centro-oeste'])
/** The three secondary pages of a city, by the folder under `<uf>/<city>/`. */
const CITY_SUBPAGES: Record<string, PageFamily> = { compartilhar: 'compartilhar', qr: 'qr', 'tres-ciclos': 'tres-ciclos' }
/** Top-level folders that are a UF: two letters (`zz` is the not-a-state placeholder of the build). */
const UF_SEGMENT = /^[a-z]{2}$/

export function classifyPath(path: string): PageFamily {
  const segs = path.replace(/\\/g, '/').split('/').filter((s) => s !== '' && s !== '.')
  const [first, second, third] = segs
  if (first === undefined) return 'other'
  if (first === 'fato') return 'fato'
  if (first === 'data') return 'data-shards'
  if (first === 'preview' || first === 'preview.png') return 'previews'
  if (first === 'relatorios') return 'report'
  if (first === 'brasil') return second !== undefined && REGIONS.has(second) && segs.length === 3 && third === 'index.html' ? 'region' : 'other'
  if (!UF_SEGMENT.test(first)) return 'other'
  if (segs.length === 2 && second === 'index.html') return 'state'
  if (second === undefined || third === undefined) return 'other'
  if (segs.length === 3 && third === 'index.html') return 'city-card'
  return CITY_SUBPAGES[third] ?? 'other'
}
