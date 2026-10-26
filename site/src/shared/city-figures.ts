import type { City, DataStore, Turno } from '../data'
import type { CandidateRowProps, TurnoutBarProps } from './components'
import { buildCityResult, type CityResult, type Segment } from './city-model'

/**
 * Loads the numbers of one city, cycle and round from the data layer and builds the pure model.
 * Returns undefined when the city has no data in that cycle and round (screens show "sem dados nesse ciclo", never zeros).
 */
export async function loadCityResult(data: DataStore, city: City, ano: number, turno: Turno): Promise<CityResult | undefined> {
  const [t] = await data.turnout({ ano, turno, uf: city.uf, cdMunicipio: city.cdMunicipio })
  if (!t) return undefined
  const [candidates, votes] = await Promise.all([data.candidates({ ano, turno }), data.votes({ ano, turno, uf: city.uf, cdMunicipio: city.cdMunicipio })])
  return buildCityResult({ turnout: t, votes, candidates })
}

const seg = (s: Segment | undefined) => ({ label: s?.label ?? '—', pct: s?.pct ?? 0, votos: s?.votos ?? 0 })

/** Props of the shared voted / not-voted bars. */
export function toTurnoutBarProps(r: CityResult): TurnoutBarProps {
  const [a, b, outros] = [r.voted[0], r.voted[1], r.voted[2]]
  const [abstencao, brancos, nulos] = r.notVoted
  return {
    votedPct: r.votedPct,
    notVoted: { abstencaoPct: abstencao!.pct, brancosPct: brancos!.pct, nulosPct: nulos!.pct },
    candidates: { a: seg(a), b: seg(b) },
    others: outros ? seg(outros) : undefined,
  }
}

/** Legend rows of the card: A, B, (Outros), Abstenção, Brancos, Nulos. */
export function toLegendRows(r: CityResult): CandidateRowProps[] {
  return [...r.voted, ...r.notVoted].map((s) => ({
    kind: s.key,
    label: s.label,
    votes: s.votos,
    shareLabel: `${s.pct}% ${s.key === 'abstencao' || s.key === 'brancos' || s.key === 'nulos' ? 'dos que não votaram' : 'dos votos'}`,
  }))
}

/** Stable entry point used by #6: props of the bars for one city, cycle and round (undefined = no data). */
export async function turnoutBarProps(data: DataStore, city: City, ano: number, turno: Turno): Promise<TurnoutBarProps | undefined> {
  const r = await loadCityResult(data, city, ano, turno)
  return r && toTurnoutBarProps(r)
}

/** Stable entry point: legend rows of the card ([] = no data). */
export async function candidateRows(data: DataStore, city: City, ano: number, turno: Turno): Promise<CandidateRowProps[]> {
  const r = await loadCityResult(data, city, ano, turno)
  return r ? toLegendRows(r) : []
}
