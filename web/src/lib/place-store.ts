/**
 * The place the visitor picked (a city or a state), remembered in this browser only: nothing here is sent
 * anywhere. Every access is guarded: storage can be blocked, full or absent (private window), and the site
 * must keep working, just without remembering. Tests inject a fake storage; the browser one is looked up lazily.
 *
 * `STORED_ITEMS` is the single list of what the site writes to the device: the privacy text of the data page is
 * drawn from it and `forgetAll` ("esquecer meus dados") clears exactly those keys, so the text, the control and
 * the code cannot drift apart. A new key written anywhere must be added here (the test pins the list).
 */
import { NOTICE_STORAGE_KEY } from './consent'
import { REGISTER_KEY } from './sentences/register-store'
import { UF_NOME } from './uf-names'

export const PLACE_KEY = 'voto-a-voto:place'

export type Place = { kind: 'city'; uf: string; slug: string; nome: string } | { kind: 'state'; uf: string }

export interface PlaceStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** What is kept on the device, key by key, in the words the privacy section shows. */
export const STORED_ITEMS: { key: string; what: string }[] = [
  { key: PLACE_KEY, what: 'a cidade ou o estado que você escolheu na página inicial, para o atalho "Sua cidade"' },
  { key: REGISTER_KEY, what: 'a linguagem escolhida no cartão da cidade (padrão ou simples)' },
  { key: NOTICE_STORAGE_KEY, what: 'o aviso de medição já visto (o botão "Prosseguir")' },
]

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
    if (p.kind === 'state') return { kind: 'state', uf: p.uf }
    if (p.kind === 'city' && typeof p.slug === 'string' && SLUG.test(p.slug) && typeof p.nome === 'string' && p.nome.trim()) {
      return { kind: 'city', uf: p.uf, slug: p.slug, nome: p.nome }
    }
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
  const clean: Place = place.kind === 'city' ? { kind: 'city', uf: place.uf, slug: place.slug, nome: place.nome } : { kind: 'state', uf: place.uf }
  try {
    store?.setItem(PLACE_KEY, JSON.stringify(clean))
  } catch {
    // Blocked or full storage: the pick then lasts only until the page closes.
  }
}

/** "Esquecer meus dados": removes every key of `STORED_ITEMS`. */
export function forgetAll(store: PlaceStorage | undefined = browserStorage()): void {
  for (const { key } of STORED_ITEMS) {
    try {
      store?.removeItem(key)
    } catch {
      // Nothing persisted to forget.
    }
  }
}

/** Site-relative path (before the base) of the page the shortcut opens. */
export const placeHref = (p: Place): string => (p.kind === 'city' ? `/${p.uf}/${p.slug}/` : `/${p.uf}/`)

export const placeLabel = (p: Place): string => (p.kind === 'city' ? `${p.nome} · ${p.uf.toUpperCase()}` : (UF_NOME[p.uf] ?? p.uf.toUpperCase()))
