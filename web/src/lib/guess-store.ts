/**
 * The visitor's guess to the question of a city (#44), kept in this browser only: one key (`GUESS_KEY`, listed on the data page and cleared by
 * "esquecer meus dados"). The value is `{ "<uf>/<slug>": "yes" | "no" }`, nothing else (no time, no counter), the last 30 cities at most.
 * Nothing here sends anything. Every access goes through the safe-storage helper (#141): with storage blocked a guess lives only until the page
 * closes and nothing throws. The browser's storage lookup is the helper's `browserStorage`, re-exported.
 */
import { browserStorage, readStoredJson, writeStored } from './safe-storage'
import { GUESS_KEY } from './storage-keys'

export { browserStorage }

export type Guess = 'yes' | 'no'
export interface GuessStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}
const MAX_CITIES = 30
const CITY = /^[a-z]{2}\/[a-z0-9-]+$/

function read(storage?: GuessStorage): Record<string, Guess> {
  const raw: unknown = readStoredJson(storage, GUESS_KEY, () => ({}))
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {}
  return Object.fromEntries(Object.entries(raw).filter((e): e is [string, Guess] => CITY.test(e[0]) && (e[1] === 'yes' || e[1] === 'no')))
}

export function readGuess(city: string, storage?: GuessStorage): Guess | undefined {
  return read(storage)[city]
}

/** Keeps `guess` for `city` (undefined takes it back). Returns whether it was kept in the browser. */
export function saveGuess(city: string, guess: Guess | undefined, storage?: GuessStorage): boolean {
  if (!CITY.test(city)) return false
  if (!storage) return false
  const { [city]: _old, ...rest } = read(storage)
  const next = guess ? { ...rest, [city]: guess } : rest
  const kept = Object.fromEntries(Object.entries(next).slice(-MAX_CITIES))
  return writeStored(storage, GUESS_KEY, JSON.stringify(kept))
}
