/**
 * The visitor's guess to the question of a city (#44), kept in this browser only: one key (`GUESS_KEY`, listed on the data page and cleared by
 * "esquecer meus dados"). The value is `{ "<uf>/<slug>": "yes" | "no" }`, nothing else (no time, no counter), the last 30 cities at most.
 * Nothing here sends anything. Every access is guarded: with storage blocked a guess lives only until the page closes and nothing throws.
 */
import { GUESS_KEY } from './storage-keys'

export type Guess = 'yes' | 'no'
export interface GuessStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}
const MAX_CITIES = 30
const CITY = /^[a-z]{2}\/[a-z0-9-]+$/

function read(storage?: GuessStorage): Record<string, Guess> {
  try {
    const raw: unknown = JSON.parse(storage?.getItem(GUESS_KEY) ?? '{}')
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {}
    return Object.fromEntries(Object.entries(raw).filter((e): e is [string, Guess] => CITY.test(e[0]) && (e[1] === 'yes' || e[1] === 'no')))
  } catch {
    return {}
  }
}

export function readGuess(city: string, storage?: GuessStorage): Guess | undefined {
  return read(storage)[city]
}

/** Keeps `guess` for `city` (undefined takes it back). Returns whether it was kept in the browser. */
export function saveGuess(city: string, guess: Guess | undefined, storage?: GuessStorage): boolean {
  if (!CITY.test(city)) return false
  try {
    if (!storage) return false
    const { [city]: _old, ...rest } = read(storage)
    const next = guess ? { ...rest, [city]: guess } : rest
    const kept = Object.fromEntries(Object.entries(next).slice(-MAX_CITIES))
    storage.setItem(GUESS_KEY, JSON.stringify(kept))
    return true
  } catch {
    return false
  }
}

/** The browser's storage, or undefined when it is blocked. */
export function browserStorage(): GuessStorage | undefined {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}
