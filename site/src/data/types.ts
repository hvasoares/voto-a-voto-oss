/**
 * Typed view of the dataset produced by ticket #1 (`make data`).
 * Column names in the CSVs are snake_case; this interface is camelCase and is the
 * ONLY shape screens may depend on. If the dataset schema changes, change the csv.ts
 * mapping, not the screens.
 */

export type Turno = 1 | 2

export interface City {
  /** Lower-case UF code (as in the dataset and in routes), e.g. 'rj'. Overseas posts use 'zz'. Display upper-case only where the design shows it. */
  uf: string
  cdMunicipio: string
  cdIbge: string
  nome: string
  /** Unique within the UF; used in the real path /{uf lower-case}/{slug}/ */
  slug: string
  regiao: string
  /** Cycles (years) with data for this city, e.g. [2018, 2022, 2026]. A 2026-only city has [2026]. */
  ciclos: number[]
}

export interface Turnout {
  ano: number
  turno: Turno
  uf: string
  cdMunicipio: string
  aptos: number
  comparecimento: number
  abstencoes: number
  brancos: number
  nulos: number
  anuladosApuSep: number
  validos: number
}

export interface Vote {
  ano: number
  turno: Turno
  uf: string
  cdMunicipio: string
  candidatoNumero: number
  votos: number
}

export interface Candidate {
  ano: number
  turno: Turno
  candidatoNumero: number
  nomeUrna: string
  partido: string
}

export interface State {
  /** Lower-case UF code. Overseas ('zz') is never listed as a state. */
  uf: string
  regiao: string
  municipios: number
}

export interface Manifest {
  /** true for the committed fixture set; absent/false for the real dataset. */
  fixture?: boolean
  sources?: Record<string, unknown>[]
  [key: string]: unknown
}

export interface CityKey {
  uf: string
  cdMunicipio: string
}

export interface TurnoutQuery extends Partial<CityKey> {
  ano?: number
  turno?: Turno
}

/**
 * Stable, documented interface over the dataset. Backed by fixtures until real
 * data lands; see site/README.md for the data-directory switch.
 * All methods are async so a future lazily-fetched/sharded backend needs no screen changes.
 */
export interface DataStore {
  cities(): Promise<City[]>
  /** `uf` is case-insensitive (stored lower-case). */
  city(uf: string, slug: string): Promise<City | undefined>
  citiesByUf(uf: string): Promise<City[]>
  /** The states (no overseas post), sorted by UF. */
  states(): Promise<State[]>
  turnout(query?: TurnoutQuery): Promise<Turnout[]>
  votes(query?: TurnoutQuery): Promise<Vote[]>
  candidates(query?: { ano?: number; turno?: Turno }): Promise<Candidate[]>
  manifest(): Promise<Manifest>
}

export const DATA_FILES = ['cities.csv', 'turnout.csv', 'votes.csv', 'candidates.csv', 'manifest.json'] as const

/** Reads one file of the dataset as UTF-8 text. Node: from disk. Browser: fetch from the site's own origin. */
export type TextSource = (file: (typeof DATA_FILES)[number]) => Promise<string>
