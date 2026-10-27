/**
 * City search, pure and synchronous: runs in the browser over the cities of `ctx.data` (and in Node for tests).
 * Matching is accent-, case- and punctuation-insensitive; every typed word must match; a typed UF ("belem pa")
 * narrows the result. Ranking: exact name, name prefix, word prefix, substring; overseas posts come after
 * domestic cities of the same rank. No network, no state outside the index.
 */
import type { City } from '../data'

/** Fewer characters than this are not searched (one letter matches thousands of cities). */
export const MIN_QUERY = 2
export const DEFAULT_LIMIT = 20
const OVERSEAS_UF = 'zz'
const PARTICLES = new Set(['de', 'da', 'do', 'das', 'dos', 'e'])

export function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function ufLabel(uf: string): string {
  return uf === OVERSEAS_UF ? 'Exterior' : uf.toUpperCase()
}

const capital = (w: string) => (w ? w[0]!.toUpperCase() + w.slice(1) : w)

/** The TSE writes names in upper case; show them as people write them. Names already in mixed case are kept. */
export function displayName(nome: string): string {
  if (nome !== nome.toUpperCase()) return nome
  let first = true
  return nome
    .toLowerCase()
    .split(/([ -])/)
    .map((part) => {
      if (part === ' ' || part === '-' || part === '') return part
      const word = part
        .split("'")
        .map((piece, i, all) => (i === 0 && all.length > 1 && piece === 'd' ? piece : capital(piece)))
        .join("'")
      const out = !first && PARTICLES.has(part) ? part : word
      first = false
      return out
    })
    .join('')
}

interface Entry {
  city: City
  nameKey: string
  words: string[]
  ufWords: string[]
}

export type SearchIndex = Entry[]

export function buildIndex(cities: City[]): SearchIndex {
  return cities.map((city) => {
    const nameKey = fold(city.nome)
    return { city, nameKey, words: nameKey.split(' '), ufWords: city.uf === OVERSEAS_UF ? ['zz', 'exterior'] : [city.uf] }
  })
}

export interface SearchHit {
  uf: string
  slug: string
  /** Display name (Title Case). */
  nome: string
  /** "RJ", or "Exterior" for overseas posts. */
  ufLabel: string
}

export interface SearchResult {
  /** Number of matching cities (can be larger than hits.length). */
  total: number
  hits: SearchHit[]
}

interface Ranked {
  entry: Entry
  score: number
}

function rank(entry: Entry, tokens: string[]): Ranked | undefined {
  const nameTokens: string[] = []
  let substring = false
  for (const t of tokens) {
    if (entry.words.some((w) => w.startsWith(t))) nameTokens.push(t)
    else if (entry.ufWords.includes(t)) continue
    else if (entry.nameKey.includes(t)) (nameTokens.push(t), (substring = true))
    else return undefined
  }
  if (nameTokens.length === 0) return { entry, score: 4 }
  const q = nameTokens.join(' ')
  const score = entry.nameKey === q ? 0 : entry.nameKey.startsWith(q) ? 1 : substring ? 3 : 2
  return { entry, score }
}

export function searchCities(index: SearchIndex, query: string, opts: { limit?: number } = {}): SearchResult {
  const key = fold(query)
  if (key.length < MIN_QUERY) return { total: 0, hits: [] }
  const tokens = key.split(' ')
  const ranked = index.flatMap((e) => rank(e, tokens) ?? [])
  ranked.sort(
    (a, b) =>
      a.score - b.score ||
      Number(a.entry.city.uf === OVERSEAS_UF) - Number(b.entry.city.uf === OVERSEAS_UF) ||
      a.entry.nameKey.length - b.entry.nameKey.length ||
      a.entry.nameKey.localeCompare(b.entry.nameKey) ||
      a.entry.city.uf.localeCompare(b.entry.city.uf),
  )
  const hits = ranked.slice(0, opts.limit ?? DEFAULT_LIMIT).map(({ entry: { city } }) => ({ uf: city.uf, slug: city.slug, nome: displayName(city.nome), ufLabel: ufLabel(city.uf) }))
  return { total: ranked.length, hits }
}
