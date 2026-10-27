/**
 * Margins of one state's municipalities (screens 10/5, ticket #16), PURE (no HTML, no data access or
 * IO): same definitions as `src/lib/margins.ts` (the state aggregate of ticket #11), at the
 * municipality granularity.
 *
 * - The runoff pair comes from the caller and is the pair `computeMargins` derives for the whole
 *   country (2026: 13 x 22) -- never a hard-coded candidate number.
 * - Margin = share of the pair member "Lula side" minus the share of the other, in pp of the SAME
 *   round's valid votes of the CITY. Swing = R2 margin minus R1 margin on the UNROUNDED margins.
 * - A city enters the list of `/mapa/<uf>/` with `margin2: null` when its round 2 has no valid votes
 *   or no vote of the pair at all (an invalid pairing): the page shows it without fill and the legend
 *   carries the note. Same rule for the round 1 (a city that only votes in 2026 has `margin1: null`
 *   and, with it, `swing: null`).
 *
 * Everything here is deterministic given the arrays of the store (`@site/data`).
 */
import type { City, Turnout, Vote } from '@site/data'
import type { PairMember } from './margins'

export interface CityMarginRow {
  /** TSE municipality code (the dataset's own key, as `cd-municipio` everywhere else). */
  cdMunicipio: string
  /** 7-digit IBGE code of the mesh file (public/geo/municipios-<uf>.json). */
  cdIbge: string
  nome: string
  /** The city path /{uf}/{slug}/ (the same slug the city page is pre-rendered at). */
  slug: string
  validos1: number
  validos2: number
  /** Pair votes in each round. */
  votosA1: number
  votosB1: number
  votosA2: number
  votosB2: number
  /** Exact pp of valid votes (side A minus side B), per round; null = no margin (no fill). */
  margin1: number | null
  margin2: number | null
  /** Exact swing = margin2 - margin1, only when BOTH margins are computable. */
  swing: number | null
}

export interface CityMarginsInput {
  ano: number
  uf: string
  /** The two candidates of the round 2 (computeMargins derives it; A first = "Lula side"). */
  pair: readonly PairMember[]
  /** The cities of this UF from cities.csv (they carry the IBGE code and the slug). */
  cities: readonly City[]
  turnout: readonly Turnout[]
  votes: readonly Vote[]
}

/** Round-2 pairing rule: the pair must have at least one vote at the round of the margin. */
function pairingVotes(votosA: number, votosB: number): number {
  return votosA + votosB
}

export function computeCityMargins({ ano, uf, pair, cities, turnout, votes }: CityMarginsInput): CityMarginRow[] {
  const [numA, numB] = [pair[0]!.numero, pair[1]!.numero]

  // Aggregates by TSE municipality code for this UF and cycle only.
  const validos = new Map<string, [number, number]>() // round 1 | round 2
  for (const t of turnout) {
    if (t.ano !== ano || t.uf !== uf) continue
    const s = validos.get(t.cdMunicipio) ?? [0, 0]
    if (t.turno === 1) s[0] += t.validos
    else s[1] += t.validos
    validos.set(t.cdMunicipio, s)
  }
  const votos = new Map<string, Map<number, [number, number]>>()
  for (const v of votes) {
    if (v.ano !== ano || v.uf !== uf) continue
    if (v.candidatoNumero !== numA && v.candidatoNumero !== numB) continue
    const s = votos.get(v.cdMunicipio) ?? new Map()
    const list = s.get(v.candidatoNumero) ?? [0, 0]
    if (v.turno === 1) list[0] += v.votos
    else list[1] += v.votos
    s.set(v.candidatoNumero, list)
    votos.set(v.cdMunicipio, s)
  }

  const rows: CityMarginRow[] = []
  for (const city of [...cities].sort((a, b) => a.cdMunicipio.localeCompare(b.cdMunicipio))) {
    const val = validos.get(city.cdMunicipio) ?? [0, 0]
    const a = votos.get(city.cdMunicipio)
    const a1 = a?.get(numA)?.[0] ?? 0
    const b1 = a?.get(numB)?.[0] ?? 0
    const a2 = a?.get(numA)?.[1] ?? 0
    const b2 = a?.get(numB)?.[1] ?? 0
    const margin1 = val[0] > 0 && pairingVotes(a1, b1) > 0 ? ((a1 - b1) / val[0]) * 100 : null
    const margin2 = val[1] > 0 && pairingVotes(a2, b2) > 0 ? ((a2 - b2) / val[1]) * 100 : null
    rows.push({
      cdMunicipio: city.cdMunicipio,
      cdIbge: city.cdIbge,
      nome: city.nome,
      slug: city.slug,
      validos1: val[0],
      validos2: val[1],
      votosA1: a1,
      votosB1: b1,
      votosA2: a2,
      votosB2: b2,
      margin1,
      margin2,
      swing: margin1 === null || margin2 === null ? null : margin2 - margin1,
    })
  }
  return rows
}