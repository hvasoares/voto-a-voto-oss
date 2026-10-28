/**
 * "Cidades fora da curva" (#34), PURE: for each city, how far its turnout and its swing since 2022 are from the typical of its peer cities, and the
 * list of the cities furthest away, with the state and minimum-size filters. It is a SCREENING list: a place to start checking the data, never a conclusion
 * about any city. The method is written in web/docs/cidades-fora-da-curva.md; this file is that note in code.
 *
 *  - Peers: the five nearest cities of `peers.ts` (#23: size band, round-1 turnout, margin and history of the three cycles). It says nothing about why.
 *  - Turnout: comparecimento / aptos of the 2nd round of 2026, in %. Valid votes of that round are the volume printed next to it.
 *  - Swing since 2022: the margin of the 2nd round of 2026 minus the margin of the 2nd round of 2022, in pp of each round's valid votes, between the SAME
 *    two ballot numbers (the pair of the 2026 runoff, "first" = the lower number, as in the other reports). + means the margin moved toward the first.
 *  - Typical = the MEDIAN of the peers that have the measure (needs at least three of the five). Gap = the city's value minus the typical, in pp.
 *  - Distance = sqrt(zT^2 + zS^2) where zT and zS are the turnout gap and the swing gap divided by the standard deviation of that gap over all the cities
 *    compared. Both measures weigh the same; the sign of a gap does not matter for the order, but both signs are printed.
 *  - Order: largest distance first; equal distances (at 1e-9) by "uf/slug" in code-point order. Overseas posts (uf "zz") are never cities here.
 * Deterministic: the same dataset gives the same list.
 */
import type { Candidate, City, Turnout, Vote } from '@/data'
import type { PeersResult } from '../peers'
import { runoffPair } from './compute'

export const OVERSEAS_UF = 'zz'
/** The cycle compared with 2026 and the runoff round of both. */
export const OUTLIER_YEAR = 2026
export const OUTLIER_SINCE = 2022
/** Minimum valid votes (2nd round of 2026) of the filter, and the one the page opens with. */
export const MIN_OPTIONS = [1_000, 5_000, 20_000, 50_000] as const
export const DEFAULT_MIN = 5_000
/** Rows the page lists. */
export const OUTLIERS_SHOWN = 25
/** A typical needs this many peers with the measure. */
export const MIN_PEERS_WITH_MEASURE = 3

export interface PeerFigure {
  /** "uf/slug". */
  key: string
  uf: string
  slug: string
  nome: string
  /** In %, or undefined for a peer without the 2nd round of 2026 ("sem dados", never zero). */
  turnout?: number
  /** In pp, or undefined for a peer without the 2nd round of 2022 or of 2026. */
  swing?: number
}

export interface OutlierRow {
  uf: string
  slug: string
  cdMunicipio: string
  nome: string
  aptos: number
  comparecimento: number
  /** Valid votes of the 2nd round of 2026: the volume next to the rate. */
  validos: number
  turnout: number
  typicalTurnout: number
  turnoutGap: number
  /** The pair's votes in both rounds, and the valid votes of 2022: the inputs of the swing. */
  votos26: { primeiro: number; segundo: number }
  validos22: number
  votos22: { primeiro: number; segundo: number }
  margin26: number
  margin22: number
  swing: number
  typicalSwing: number
  swingGap: number
  distance: number
  /** The peers, in the order of the peers file (closest first). */
  peers: PeerFigure[]
}

export interface OutlierInput {
  cities: readonly City[]
  turnout: readonly Turnout[]
  votes: readonly Vote[]
  candidates: readonly Candidate[]
  peers: PeersResult
}

export interface Outliers {
  /** Every city compared, furthest first. */
  rows: OutlierRow[]
  /** Standard deviation of each gap over `rows` (the scale of the distance). */
  sdTurnoutGap: number
  sdSwingGap: number
  pair: { primeiro: number; segundo: number; nomePrimeiro: string; nomeSegundo: string }
}

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b)
  const m = s.length >> 1
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2
}
const sd = (xs: number[]): number => {
  const mean = xs.reduce((a, b) => a + b, 0) / (xs.length || 1)
  return Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (xs.length || 1))
}
const byText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

interface Measure {
  aptos: number
  comparecimento: number
  validos: number
  turnout: number
  votos26: { primeiro: number; segundo: number }
  validos22?: number
  votos22?: { primeiro: number; segundo: number }
  margin26?: number
  margin22?: number
  swing?: number
}

export function computeOutliers({ cities, turnout, votes, candidates, peers }: OutlierInput): Outliers {
  const pair = runoffPair([...candidates], OUTLIER_YEAR)
  const t = new Map<string, Turnout>()
  for (const x of turnout) if (x.turno === 2 && (x.ano === OUTLIER_YEAR || x.ano === OUTLIER_SINCE)) t.set(`${x.uf}|${x.cdMunicipio}|${x.ano}`, x)
  const v = new Map<string, number>()
  for (const x of votes) if (x.turno === 2 && (x.ano === OUTLIER_YEAR || x.ano === OUTLIER_SINCE) && (x.candidatoNumero === pair.primeiro || x.candidatoNumero === pair.segundo)) v.set(`${x.uf}|${x.cdMunicipio}|${x.ano}|${x.candidatoNumero}`, x.votos)
  const cityOf = new Map(cities.filter((c) => c.uf !== OVERSEAS_UF).map((c) => [`${c.uf}/${c.slug}`, c]))

  const measures = new Map<string, Measure>()
  for (const [key, c] of cityOf) {
    const id = `${c.uf}|${c.cdMunicipio}`
    const now = t.get(`${id}|${OUTLIER_YEAR}`)
    if (!now || now.aptos <= 0) continue
    const votos = (ano: number) => ({ primeiro: v.get(`${id}|${ano}|${pair.primeiro}`) ?? 0, segundo: v.get(`${id}|${ano}|${pair.segundo}`) ?? 0 })
    const m: Measure = { aptos: now.aptos, comparecimento: now.comparecimento, validos: now.validos, turnout: (now.comparecimento / now.aptos) * 100, votos26: votos(OUTLIER_YEAR) }
    const before = t.get(`${id}|${OUTLIER_SINCE}`)
    if (before && before.validos > 0 && now.validos > 0) {
      m.validos22 = before.validos
      m.votos22 = votos(OUTLIER_SINCE)
      m.margin26 = ((m.votos26.primeiro - m.votos26.segundo) / now.validos) * 100
      m.margin22 = ((m.votos22.primeiro - m.votos22.segundo) / before.validos) * 100
      m.swing = m.margin26 - m.margin22
    }
    measures.set(key, m)
  }

  type Draft = Omit<OutlierRow, 'distance'>
  const drafts: Draft[] = []
  peers.keys.forEach((key, i) => {
    const m = measures.get(key)
    const c = cityOf.get(key)
    if (!m || !c || m.swing === undefined || m.validos22 === undefined || !m.votos22) return
    const figures: PeerFigure[] = peers.peers[i]!.map((j) => {
      const pk = peers.keys[j]!
      const pc = cityOf.get(pk)
      const pm = measures.get(pk)
      return { key: pk, uf: pc?.uf ?? pk.slice(0, pk.indexOf('/')), slug: pc?.slug ?? pk.slice(pk.indexOf('/') + 1), nome: pc?.nome ?? pk, turnout: pm?.turnout, swing: pm?.swing }
    })
    const turnouts = figures.flatMap((p) => (p.turnout === undefined ? [] : [p.turnout]))
    const swings = figures.flatMap((p) => (p.swing === undefined ? [] : [p.swing]))
    if (turnouts.length < MIN_PEERS_WITH_MEASURE || swings.length < MIN_PEERS_WITH_MEASURE) return
    const typicalTurnout = median(turnouts)
    const typicalSwing = median(swings)
    drafts.push({
      uf: c.uf, slug: c.slug, cdMunicipio: c.cdMunicipio, nome: c.nome,
      aptos: m.aptos, comparecimento: m.comparecimento, validos: m.validos,
      turnout: m.turnout, typicalTurnout, turnoutGap: m.turnout - typicalTurnout,
      votos26: m.votos26, validos22: m.validos22, votos22: m.votos22, margin26: m.margin26!, margin22: m.margin22!,
      swing: m.swing, typicalSwing, swingGap: m.swing - typicalSwing,
      peers: figures,
    })
  })

  const sdT = sd(drafts.map((d) => d.turnoutGap))
  const sdS = sd(drafts.map((d) => d.swingGap))
  const rows = drafts
    .map<OutlierRow>((d) => ({ ...d, distance: Math.sqrt((sdT > 0 ? d.turnoutGap / sdT : 0) ** 2 + (sdS > 0 ? d.swingGap / sdS : 0) ** 2) }))
    .sort((a, b) => Math.round(b.distance * 1e9) - Math.round(a.distance * 1e9) || byText(`${a.uf}/${a.slug}`, `${b.uf}/${b.slug}`))
  return { rows, sdTurnoutGap: sdT, sdSwingGap: sdS, pair }
}

export interface OutlierFilter {
  /** A state code, or undefined for all of them. */
  uf: string | undefined
  /** Minimum valid votes of the 2nd round of 2026. */
  min: number
}

export interface PickedOutliers {
  shown: OutlierRow[]
  /** Cities the filter compared (the list is the first `OUTLIERS_SHOWN` of them). */
  compared: number
}

/** The first rows of the ranking that pass the filters, and how many passed. The rank of a row is its position in `shown`. */
export function pickOutliers(rows: readonly OutlierRow[], { uf, min }: OutlierFilter): PickedOutliers {
  const passing = rows.filter((r) => r.validos >= min && (uf === undefined || r.uf === uf))
  return { shown: passing.slice(0, OUTLIERS_SHOWN), compared: passing.length }
}

const ROOT = '/relatorios/cidades-fora-da-curva/'
/** `/relatorios/cidades-fora-da-curva/<uf|todos>/<min>/` (base-relative). */
export const outlierPath = (uf: string | undefined, min: number): string => `${ROOT}${uf ?? 'todos'}/${min}/`

export function parseOutlierPath(uf: string, min: string): OutlierFilter | undefined {
  const n = Number(min)
  return (MIN_OPTIONS as readonly number[]).includes(n) && /^\d+$/.test(min) ? { uf: uf === 'todos' ? undefined : uf, min: n } : undefined
}
