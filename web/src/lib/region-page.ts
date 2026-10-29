/**
 * The numbers of the region page (#183, `/brasil/<regiao>/`), PURE apart from the loader at the end: one page per region of "Brasil e regiões". The result bar
 * is the region's own (`BrasilRegion`, the numbers that page prints), the rows are its states with the signed margin and the valid votes of the same cycle and
 * round (`computeMargins`, the pair and the sign of the Mapa por estado), and the counts are the states and municipalities the dataset has in the region.
 * A region with no data in the dataset has no page (the fixtures carry fewer regions than the real dataset).
 */
import { createNodeStore } from '@/data/node'
import type { State } from '@/data'
import { candidateName } from '@/shared/candidate-name'
import type { BrasilRegion, BrasilView } from './brasil'
import { loadBrasil } from './brasil-load'
import { computeMargins, type Margins } from './margins'
import { REGION_ORDER } from './regions'
import { shortName } from './state-map-data'
import { UF_NOME } from './uf-names'

export interface RegionStateRow {
  uf: string
  nome: string
  /** Exact pp of valid votes, side A minus side B. */
  margin2: number
  validos2: number
  votosA2: number
  votosB2: number
}

export interface RegionSide {
  /** Full display name ("Lula") and the short form of the rows ("Lula", "Flávio"). */
  nome: string
  short: string
}

export interface RegionPage {
  regiao: string
  label: string
  ano: number
  turno: number
  /** The region's own numbers: the bar, the turnout, the shares (the ones "Brasil e regiões" prints). */
  region: BrasilRegion
  /** The sides of the margin: A is the one that leads nationally, as in the state map. */
  ladoA: RegionSide
  ladoB: RegionSide
  /** The region's states in the dataset, by valid votes (most first), ties by UF. */
  states: RegionStateRow[]
  municipios: number
}

/** The pages of the regions the view has numbers for, in the display order of the five regions. Throws when a state of a region has no margin row (it would print no row for a state it counts). */
export function buildRegionPages(view: BrasilView, states: readonly State[], margins: Margins): RegionPage[] {
  const byUf = new Map(margins.states.map((s) => [s.uf, s]))
  const side = (nome: string): RegionSide => ({ nome: candidateName(nome), short: shortName(nome) })
  return REGION_ORDER.flatMap((regiao) => {
    const region = view.regions.find((r) => r.regiao === regiao)
    if (!region) return []
    const own = states.filter((s) => s.regiao === regiao)
    const rows = own.map((s): RegionStateRow => {
      const m = byUf.get(s.uf)
      if (!m) throw new Error(`region ${regiao}: the state ${s.uf} has no margin row for ${margins.ano}`)
      return { uf: s.uf, nome: UF_NOME[s.uf] ?? s.uf.toUpperCase(), margin2: m.margin2, validos2: m.validos2, votosA2: m.votosA2, votosB2: m.votosB2 }
    })
    rows.sort((a, b) => b.validos2 - a.validos2 || a.uf.localeCompare(b.uf))
    return [{ regiao, label: region.label, ano: view.ano, turno: view.turno, region, ladoA: side(margins.ladoA.nome), ladoB: side(margins.ladoB.nome), states: rows, municipios: own.reduce((n, s) => n + s.municipios, 0) }]
  })
}

let memo: Promise<RegionPage[]> | undefined
/** The region pages of the chosen dataset, built once per build. */
export function loadRegionPages(): Promise<RegionPage[]> {
  return (memo ??= (async () => {
    const store = createNodeStore()
    const view = await loadBrasil()
    const [states, turnout, votes, candidates] = await Promise.all([store.states(), store.turnout(), store.votes(), store.candidates()])
    return buildRegionPages(view, states, computeMargins({ ano: view.ano, turnout, votes, candidates }))
  })())
}
