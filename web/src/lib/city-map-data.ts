/**
 * Build-time (Node) assembly for the municipality-map page of one state (`/mapa/<uf>/`, ticket #16 =
 * Rio de Janeiro): the dataset of `DATA_DIR` becomes the island's props, keyed by `uf` +
 * `cd-municipio` (TSE) and carrying the 7-digit IBGE code that joins the committed mesh file
 * `public/geo/municipios-<uf>.json`. Everything else is pure (`margins-city.ts`, `margins.ts`,
 * `scale.ts`); no election number is hard-coded here. #17 (the other UFs) reuses this loader as is.
 */
import { createStore } from '@site/data/store'
import { diskSource } from '@site/data/node'
import { displayName } from '@site/shared/city-search'
import type { City, Turnout, Vote } from '@site/data'
import { computeMargins, type Margins } from './margins'
import { computeCityMargins, type CityMarginRow } from './margins-city'
import { dataDir } from './data-dir'
import { shortName } from './state-map-data'

export interface CityMapData {
  ano: number
  /** Lower-case UF the municipality map is for ('rj'). */
  uf: string
  /** Short names as the pages write them ("Lula", "Flavio"; fixtures: "Candidato"). */
  ladoANome: string
  ladoBNome: string
  /** Full display names for the sentences (they repeat the candidates, colour never alone). */
  ladoANomeCompleto: string
  ladoBNomeCompleto: string
  /** One row per municipality of the UF the dataset lists, sorted by TSE code. */
  rows: CityMarginRow[]
}

/** The rows of one UF from the state margins' own pair derivation (the same pair as both #11 pages). */
export function cityRowsFor(m: Margins, uf: string, citiesOfUf: readonly City[], turnout: readonly Turnout[], votes: readonly Vote[], ano: number): CityMarginRow[] {
  if (!m.states.some((s) => s.uf === uf)) return [] // the dataset has no geography for this state
  return computeCityMargins({ ano, uf, pair: [m.ladoA, m.ladoB], cities: citiesOfUf, turnout, votes })
}

export async function loadCityMapData(uf: string): Promise<CityMapData> {
  const store = createStore(diskSource(dataDir()))
  const [turnout, votes, candidates, cities] = await Promise.all([store.turnout(), store.votes(), store.candidates(), store.cities()])
  // The state's newest cycle with turnout data (a fixture state keeps only the cycles it has).
  const anoOf = (t: Turnout) => t.ano
  const ano = Math.max(...new Set(turnout.filter((t) => t.uf === uf).map(anoOf)))
  const citiesOfUf = cities.filter((c) => c.uf === uf)
  const m = computeMargins({ ano, turnout, votes, candidates })
  return cityMapData(turnout, votes, citiesOfUf, ano, uf, m)
}

/** Same assembly, pure (unit-tested with fixtures; the loader above only reads the dataset). */
export function cityMapData(turnout: readonly Turnout[], votes: readonly Vote[], citiesOfUf: readonly City[], ano: number, uf: string, m: Margins): CityMapData {
  return {
    ano,
    uf,
    ladoANome: shortName(m.ladoA.nome),
    ladoBNome: shortName(m.ladoB.nome),
    ladoANomeCompleto: displayName(m.ladoA.nome),
    ladoBNomeCompleto: displayName(m.ladoB.nome),
    rows: cityRowsFor(m, uf, citiesOfUf, turnout, votes, ano),
  }
}