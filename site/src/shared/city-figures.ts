import type { City, DataStore, Turno } from '../data'
import type { TurnoutBarProps } from './components'

const pct = (n: number, d: number) => (d === 0 ? 0 : Math.round((n / d) * 100))

/**
 * Derives the props of the voted/not-voted bar for one city, cycle and round from the data layer.
 * "Voted" means VALID votes over the electorate (as in the Sketch frames); blank and null count as not voted.
 * Returns undefined when the city has no data in that cycle (screens must show "sem dados nesse ciclo", never zeros).
 */
export async function turnoutBarProps(data: DataStore, city: City, ano: number, turno: Turno): Promise<TurnoutBarProps | undefined> {
  const [t] = await data.turnout({ ano, turno, uf: city.uf, cdMunicipio: city.cdMunicipio })
  if (!t) return undefined
  const [candidates, votes] = await Promise.all([data.candidates({ ano, turno }), data.votes({ ano, turno, uf: city.uf, cdMunicipio: city.cdMunicipio })])
  const ordered = [...votes].sort((x, y) => x.candidatoNumero - y.candidatoNumero)
  const name = (n: number | undefined) => candidates.find((c) => c.candidatoNumero === n)?.nomeUrna ?? '?'
  const [a, b] = ordered
  const notVoted = t.aptos - t.validos
  return {
    votedPct: pct(t.validos, t.aptos),
    notVoted: { abstencaoPct: pct(t.abstencoes, notVoted), brancosPct: pct(t.brancos, notVoted), nulosPct: pct(t.nulos, notVoted) },
    candidates: {
      a: { label: name(a?.candidatoNumero), pct: pct(a?.votos ?? 0, t.validos) },
      b: { label: name(b?.candidatoNumero), pct: pct(b?.votos ?? 0, t.validos) },
    },
  }
}

export interface CandidateRowData {
  kind: 'a' | 'b' | 'abstencao' | 'brancos' | 'nulos'
  label: string
  votes: number
  shareLabel: string
}

/** The five legend rows of the city card (frame 2), from the data layer. */
export async function candidateRows(data: DataStore, city: City, ano: number, turno: Turno): Promise<CandidateRowData[]> {
  const [t] = await data.turnout({ ano, turno, uf: city.uf, cdMunicipio: city.cdMunicipio })
  if (!t) return []
  const [candidates, votes] = await Promise.all([data.candidates({ ano, turno }), data.votes({ ano, turno, uf: city.uf, cdMunicipio: city.cdMunicipio })])
  const name = (n: number) => candidates.find((c) => c.candidatoNumero === n)?.nomeUrna ?? '?'
  const [a, b] = [...votes].sort((x, y) => x.candidatoNumero - y.candidatoNumero)
  const notVoted = t.aptos - t.validos
  const rows: CandidateRowData[] = []
  if (a) rows.push({ kind: 'a', label: name(a.candidatoNumero), votes: a.votos, shareLabel: `${pct(a.votos, t.validos)}% dos votos` })
  if (b) rows.push({ kind: 'b', label: name(b.candidatoNumero), votes: b.votos, shareLabel: `${pct(b.votos, t.validos)}% dos votos` })
  rows.push(
    { kind: 'abstencao', label: 'Abstenção', votes: t.abstencoes, shareLabel: `${pct(t.abstencoes, notVoted)}% dos que não votaram` },
    { kind: 'brancos', label: 'Brancos', votes: t.brancos, shareLabel: `${pct(t.brancos, notVoted)}% dos que não votaram` },
    { kind: 'nulos', label: 'Nulos', votes: t.nulos, shareLabel: `${pct(t.nulos, notVoted)}% dos que não votaram` },
  )
  return rows
}
