/**
 * The daily game "Adivinhe a cidade" (#69), PURE: the daily pick (deterministic by date, from a precomputed order), the closed list of five clues, the feedback of a guess
 * (distance and direction from the municipality centres, turnout and size) and the result grid (#70, never the city name). Nothing here reads the network or the clock.
 */
import { DEFAULT_VOICE, message as say, type MessageKey } from './sentences/catalog'
import './sentences/catalog-game'

const EARTH_KM = 6371
const rad = (d: number) => (d * Math.PI) / 180

/** Great-circle distance (haversine), in kilometres. */
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(a)))
}

/** One city of the game's data file: `[uf, slug, name, lat, lon, aptos, turnoutPct, swings, region]`; `swings` is -1 when the city has a cycle missing or a tie (never the daily city). */
export type GameCity = [uf: string, slug: string, name: string, lat: number, lon: number, aptos: number, turnoutPct: number, swings: number, region: string]
export interface GameData {
  edition: string
  cities: GameCity[]
  /** Indices of `cities` that may be the daily city, in the precomputed order of the days. */
  daily: number[]
  /** UF name by code, for the state clue. */
  states: Record<string, string>
}

export const MAX_GUESSES = 6
export const FIRST_DAY = '2026-01-01'

/** `2026-10-27` -> days since the first day (whole days, UTC arithmetic on the calendar date: no time zone surprise). */
export function dayNumber(dateKey: string): number {
  return Math.round((Date.parse(`${dateKey}T00:00:00Z`) - Date.parse(`${FIRST_DAY}T00:00:00Z`)) / 86_400_000)
}

/** The index in `cities` of the daily city: the same for everyone on the same date. */
export function dailyIndex(dateKey: string, daily: readonly number[]): number {
  if (!daily.length) throw new RangeError('dailyIndex: no eligible city')
  const n = dayNumber(dateKey)
  return daily[((n % daily.length) + daily.length) % daily.length]!
}

/** The calendar date in Brazil's time (America/Sao_Paulo), `YYYY-MM-DD`: the day changes at midnight there. */
export function brazilDate(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

/** Milliseconds until the next midnight in Brazil's time (the next city). */
export function msToNext(now: Date): number {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(now).map((p) => [p.type, Number(p.value)])) as Record<string, number>
  return 86_400_000 - (((parts.hour! * 60 + parts.minute!) * 60 + parts.second!) * 1000 + now.getMilliseconds())
}

export function countdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  const two = (n: number) => String(n).padStart(2, '0')
  return `${two(Math.floor(s / 3600))}:${two(Math.floor((s % 3600) / 60))}:${two(s % 60)}`
}

/** The size bands, by number of registered voters: 0 up to 5 mil, 1 up to 20 mil, 2 up to 100 mil, 3 up to 500 mil, 4 above. */
export const SIZE_LIMITS = [5000, 20000, 100000, 500000] as const
export const sizeBand = (aptos: number): number => SIZE_LIMITS.findIndex((l) => aptos <= l) === -1 ? SIZE_LIMITS.length : SIZE_LIMITS.findIndex((l) => aptos <= l)

export const CLUE_IDS = ['size', 'turnout', 'swings', 'region', 'state'] as const
export type ClueId = (typeof CLUE_IDS)[number]

const t = (key: string, params: Record<string, string | number> = {}) => say(DEFAULT_VOICE, key as MessageKey, params)

/** The five clues of a city: a closed list, one rule each. Only these rules ever produce a clue; none reads a candidate, a party or a result. */
export function clueText(id: ClueId, city: GameCity, states: Record<string, string>): string {
  const [uf, , , , , aptos, turnout, swings, region] = city
  switch (id) {
    case 'size':
      return t(`game.clue.size.${sizeBand(aptos)}`)
    case 'turnout': {
      const lo = Math.floor(turnout / 10) * 10
      return t('game.clue.turnout', { lo, hi: Math.min(lo + 10, 100) })
    }
    case 'swings':
      return t(`game.clue.swings.${Math.min(Math.max(swings, 0), 2)}`)
    case 'region':
      return t('game.clue.region', { region: regionName(region) })
    case 'state':
      return t('game.clue.state', { state: states[uf] ?? uf.toUpperCase() })
  }
}

const REGIONS: Record<string, string> = { norte: 'Norte', nordeste: 'Nordeste', 'centro-oeste': 'Centro-Oeste', sudeste: 'Sudeste', sul: 'Sul' }
export const regionName = (r: string): string => REGIONS[r] ?? r

/** The clue `i` (0-based) shows after `i + 1` guesses. */
export const unlockedClues = (guesses: number): number => Math.min(guesses, CLUE_IDS.length)

const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const
export type Direction = (typeof DIRS)[number]
export const ARROWS: Record<Direction, string> = { N: '↑', NE: '↗', E: '→', SE: '↘', S: '↓', SW: '↙', W: '←', NW: '↖' }

/** The compass direction from (lat1, lon1) to (lat2, lon2), 8 points. */
export function direction(lat1: number, lon1: number, lat2: number, lon2: number): Direction {
  const rad = (d: number) => (d * Math.PI) / 180
  const y = Math.sin(rad(lon2 - lon1)) * Math.cos(rad(lat2))
  const x = Math.cos(rad(lat1)) * Math.sin(rad(lat2)) - Math.sin(rad(lat1)) * Math.cos(rad(lat2)) * Math.cos(rad(lon2 - lon1))
  const bearing = (Math.atan2(y, x) * 180) / Math.PI
  return DIRS[Math.round(((bearing + 360) % 360) / 45) % 8]!
}

export type Compare = 'more' | 'less' | 'equal'
export interface Feedback {
  km: number
  dir: Direction
  /** What the SECRET city has compared with the guess: more, fewer or the same turnout (whole percent) and size band. */
  turnout: Compare
  size: Compare
  correct: boolean
}

const compare = (secret: number, guess: number): Compare => (secret > guess ? 'more' : secret < guess ? 'less' : 'equal')

export function feedback(guess: GameCity, secret: GameCity): Feedback {
  const km = Math.round(distanceKm(guess[3], guess[4], secret[3], secret[4]))
  const correct = guess[0] === secret[0] && guess[1] === secret[1]
  return { km, dir: correct ? 'N' : direction(guess[3], guess[4], secret[3], secret[4]), turnout: compare(secret[6], guess[6]), size: compare(sizeBand(secret[5]), sizeBand(guess[5])), correct }
}

/** The result grid: one row per guess, three squares (distance, turnout, size). Never the city's name. */
export function gridRow(f: Feedback): string {
  const distance = f.correct || f.km <= 100 ? '🟩' : f.km <= 500 ? '🟨' : '⬜'
  return `${distance}${f.turnout === 'equal' ? '🟩' : '⬜'}${f.size === 'equal' ? '🟩' : '⬜'}`
}

export interface Outcome {
  won: boolean
  finished: boolean
  /** Number of guesses used. */
  guesses: number
}
export const outcome = (feedbacks: readonly Feedback[]): Outcome => {
  const won = feedbacks.some((f) => f.correct)
  return { won, finished: won || feedbacks.length >= MAX_GUESSES, guesses: feedbacks.length }
}

/** The text that is shared: the heading, the grid and the address of the game; no name of the city. */
export function shareText(n: number, feedbacks: readonly Feedback[], url: string): string {
  const o = outcome(feedbacks)
  const head = o.won ? t('game.share.head', { n, score: o.guesses }) : t('game.share.head.lost', { n })
  return [head, ...feedbacks.map(gridRow), url].join('\n')
}
