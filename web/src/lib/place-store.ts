/**
 * The place the visitor picked (a city or a state), remembered in this browser only: nothing here is sent
 * anywhere. Every access is guarded: storage can be blocked, full or absent (private window), and the site
 * must keep working, just without remembering. Tests inject a fake storage; the browser one is looked up lazily.
 *
 * `forgetAll` ("esquecer meus dados") clears every key of `storage-keys.ts`, the same list the privacy text of the
 * data page is drawn from (`stored-items.ts`). Kept free of other imports: the Home page loads it on every visit.
 */
import { PLACE_KEY, STORED_KEYS } from './storage-keys'

export { PLACE_KEY }

export type Place = { kind: 'city'; uf: string; slug: string; nome: string } | { kind: 'state'; uf: string; nome: string }

export interface PlaceStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const browserStorage = (): PlaceStorage | undefined => {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

const UF = /^[a-z]{2}$/
const SLUG = /^[a-z0-9-]+$/

function parse(raw: string | null | undefined): Place | undefined {
  if (!raw) return undefined
  try {
    const p = JSON.parse(raw) as Record<string, unknown>
    if (typeof p?.uf !== 'string' || !UF.test(p.uf)) return undefined
    if (typeof p.nome !== 'string' || !p.nome.trim()) return undefined
    if (p.kind === 'state') return { kind: 'state', uf: p.uf, nome: p.nome }
    if (p.kind === 'city' && typeof p.slug === 'string' && SLUG.test(p.slug)) return { kind: 'city', uf: p.uf, slug: p.slug, nome: p.nome }
  } catch {
    // Not ours or damaged: no place.
  }
  return undefined
}

export function readPlace(store: PlaceStorage | undefined = browserStorage()): Place | undefined {
  try {
    return parse(store?.getItem(PLACE_KEY))
  } catch {
    return undefined
  }
}

export function savePlace(place: Place, store: PlaceStorage | undefined = browserStorage()): void {
  // Only the fields of a place are written, whatever the caller holds (never a position).
  const clean: Place = place.kind === 'city' ? { kind: 'city', uf: place.uf, slug: place.slug, nome: place.nome } : { kind: 'state', uf: place.uf, nome: place.nome }
  try {
    store?.setItem(PLACE_KEY, JSON.stringify(clean))
  } catch {
    // Blocked or full storage: the pick then lasts only until the page closes.
  }
}

/** "Esquecer meus dados": removes every key the site writes. */
export function forgetAll(store: PlaceStorage | undefined = browserStorage()): void {
  for (const key of STORED_KEYS) {
    try {
      store?.removeItem(key)
    } catch {
      // Nothing persisted to forget.
    }
  }
}

/** Site-relative path (before the base) of the page the shortcut opens. */
export const placeHref = (p: Place): string => (p.kind === 'city' ? `/${p.uf}/${p.slug}/` : `/${p.uf}/`)

export const placeLabel = (p: Place): string => (p.kind === 'city' ? `${p.nome} · ${p.uf.toUpperCase()}` : p.nome)
