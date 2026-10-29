/**
 * What the daily game keeps on the device (#69, #70): today's guesses (city ids) and the history of finished games (the day number and the result, never the city's name).
 * Browser only, one key (`GAME_KEY`, listed on the data page). Every access goes through the safe-storage helper (#141): with storage blocked the game keeps working
 * in memory and `persistent` says it will not be remembered. Tests inject a fake storage.
 */
import { GAME_KEY } from './storage-keys'
import { browserStorage, readStored, writeStored, type StorageLike } from './safe-storage'

export type { StorageLike as GameStorage } from './safe-storage'

export interface HistoryEntry {
  /** The game's number (the day). */
  n: number
  /** Guesses used when won, 0 when lost. */
  score: number
}

export interface GameSave {
  /** The day the guesses belong to, `YYYY-MM-DD`. */
  day: string
  /** `uf/slug` of each guess. */
  guesses: string[]
  history: HistoryEntry[]
  /** The game number whose result the player cleared: today's finished game is not added to the history again on reload. */
  skipped?: number
}

export const EMPTY_SAVE: GameSave = { day: '', guesses: [], history: [] }

export const browserGameStorage = (): StorageLike | undefined => browserStorage()

const ID = /^[a-z]{2}\/[a-z0-9-]+$/

export function parseSave(raw: string | null | undefined): GameSave {
  try {
    const p = JSON.parse(raw ?? 'null') as Partial<GameSave> | null
    if (!p || typeof p !== 'object') return { ...EMPTY_SAVE }
    const history = Array.isArray(p.history) ? p.history.filter((h): h is HistoryEntry => !!h && Number.isInteger(h.n) && Number.isInteger(h.score) && h.score >= 0 && h.score <= 6) : []
    const guesses = Array.isArray(p.guesses) ? p.guesses.filter((g): g is string => typeof g === 'string' && ID.test(g)).slice(0, 6) : []
    return { day: typeof p.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.day) ? p.day : '', guesses, history: history.slice(-365), ...(Number.isInteger(p.skipped) ? { skipped: p.skipped } : {}) }
  } catch {
    return { ...EMPTY_SAVE }
  }
}

export function loadSave(storage: StorageLike | undefined = browserGameStorage()): GameSave {
  return parseSave(readStored(storage, GAME_KEY))
}

/** Writes the save; returns false when the browser would not keep it (the game goes on in memory). */
export function writeSave(save: GameSave, storage: StorageLike | undefined = browserGameStorage()): boolean {
  return writeStored(storage, GAME_KEY, JSON.stringify(save))
}

/** Today's guesses, or none when the saved ones are from another day. */
export const guessesOf = (save: GameSave, day: string): string[] => (save.day === day ? save.guesses : [])

/** Adds a finished game to the history once (one entry per game number). */
export function withResult(save: GameSave, entry: HistoryEntry): GameSave {
  return save.skipped === entry.n || save.history.some((h) => h.n === entry.n) ? save : { ...save, history: [...save.history, entry] }
}

/** Empties the history; `today` is the number of the game on screen, whose result is not put back by a reload. */
export function clearHistory(save: GameSave, today: number, storage: StorageLike | undefined = browserGameStorage()): GameSave {
  const next: GameSave = { ...save, history: [], skipped: today }
  writeSave(next, storage)
  return next
}
