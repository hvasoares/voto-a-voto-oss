/**
 * What the screen "Ficaram em casa" (#32) prints, PURE and built once at build time: every sentence and number of the phone's island and of the
 * desktop fragment, as strings, so neither carries the sentence catalog (the island gets this model as props). The value of each state, its colour
 * step, its screen-reader label and the two lines of the selected-state panel; the cycle and round links; the legend; the claim of the measure
 * note (per cycle and round, with its limits) when the dataset has cities for it.
 *
 * Order and first selection follow the size of the electorate, never the value: nothing here ranks states by how many stayed home.
 */
import { UF_NAMES, ufFullLabel } from '@/lib/uf-names'
import { formatInt } from '@/shared/city-model'
import { formatShare, stayHomeBin, stayHomeInk, stayHomeLegend, STAY_HOME_COLOR, type Claim, type StayHomeBin, type StayHomeRow, type StayHomeView } from './stay-home'
import type { Register } from './sentences/catalog'
import { claimLines, selectedLines, stayhomeAlt, stayhomeSay, subtitle, turnoLabel, viewLabel, type StayHomeVoice } from './sentences/stayhome'

export const viewSlug = (v: StayHomeView): string => `${v.ano}-${v.turno}`

export function parseViewSlug(slug: string): StayHomeView | undefined {
  const m = /^(\d{4})-([12])$/.exec(slug)
  return m ? { ano: Number(m[1]), turno: Number(m[2]) as 1 | 2 } : undefined
}

export interface StayHomeCell {
  uf: string
  bin: StayHomeBin
  fill: string
  fg: string
  /** "21,1%": printed on the tile, the map shape or its callout. */
  text: string
  name: string
  /** `aria-label` of the state's link (map shapes, table rows). */
  label: string
  /** The same sentence with the state's name only, read after the printed bits of a tile (a name taken from the content, as in the margin map). */
  detail: string
  /** "SP · selecionado". */
  selected: string
  lines: [string, string]
  /** For the table: "33.482.119" and "21,1". */
  aptos: string
  share: string
}

export interface StayHomeModel {
  ano: number
  turno: 1 | 2
  subtitle: string
  /** Set when the view has no state at all. */
  empty?: string
  alt: string
  viewsLabel: string
  views: { label: string; ano: number; turno: string; slug: string; current: boolean }[]
  legend: { caption: string; edges: string[]; fills: string[]; scaleSr: string; size: string; mapNote: string }
  claim?: { line: string; limits: string }
  cells: Record<string, StayHomeCell>
  order: string[]
  defaultUf: string
  ui: { open: string; table: string; thUf: string; thAptos: string; thShare: string; failed: string; nojs: string }
}

export interface StayHomeModelInput {
  view: StayHomeView
  views: readonly StayHomeView[]
  rows: readonly StayHomeRow[]
  claim?: Claim
  register?: Register
}

export function stayHomeModel({ view, views, rows, claim, register }: StayHomeModelInput): StayHomeModel {
  const voice: StayHomeVoice = { register }
  const say = (key: string, params: Record<string, string | number> = {}) => stayhomeSay(voice, key, params)
  const cells: Record<string, StayHomeCell> = {}
  for (const r of rows) {
    const bin = stayHomeBin(r.share)
    const pct = formatShare(r.share)
    cells[r.uf] = {
      uf: r.uf,
      bin,
      fill: STAY_HOME_COLOR[bin],
      fg: stayHomeInk(bin),
      text: `${pct}%`,
      name: UF_NAMES[r.uf] ?? r.uf.toUpperCase(),
      label: say('stayhome.cell.label', { place: ufFullLabel(r.uf), pct, nao: formatInt(r.naoVotaram), aptos: formatInt(r.aptos) }),
      detail: say('stayhome.cell.label', { place: UF_NAMES[r.uf] ?? r.uf.toUpperCase(), pct, nao: formatInt(r.naoVotaram), aptos: formatInt(r.aptos) }),
      selected: say('stayhome.selected', { uf: r.uf.toUpperCase() }),
      lines: selectedLines(voice, r),
      aptos: formatInt(r.aptos),
      share: pct,
    }
  }
  const order = [...rows].sort((a, b) => b.aptos - a.aptos || (a.uf < b.uf ? -1 : 1)).map((r) => r.uf)
  const legend = stayHomeLegend()
  const edges = legend.edges
  return {
    ano: view.ano,
    turno: view.turno,
    subtitle: subtitle(voice, view.ano, view.turno),
    empty: rows.length ? undefined : stayhomeAlt([], view.ano, view.turno, voice),
    alt: stayhomeAlt(rows, view.ano, view.turno, voice),
    viewsLabel: say('stayhome.views.label'),
    views: views.map((v) => ({ label: viewLabel(voice, v.ano, v.turno), ano: v.ano, turno: turnoLabel(voice, v.turno), slug: viewSlug(v), current: v.ano === view.ano && v.turno === view.turno })),
    legend: {
      caption: say('stayhome.legend'),
      edges,
      fills: legend.bins.map((b) => STAY_HOME_COLOR[b]),
      scaleSr: say('stayhome.legend.scale', { edges: edges.join(', ') }),
      size: say('stayhome.legend.size'),
      mapNote: say('stayhome.legend.map'),
    },
    claim: claim ? (([line, limits]) => ({ line, limits }))(claimLines(claim, view.ano, view.turno, voice)) : undefined,
    cells,
    order,
    defaultUf: order[0] ?? '',
    ui: {
      open: say('stayhome.open'),
      table: say('stayhome.table'),
      thUf: say('stayhome.table.uf'),
      thAptos: say('stayhome.table.aptos'),
      thShare: say('stayhome.table.share'),
      failed: say('stayhome.failed'),
      nojs: say('stayhome.nojs'),
    },
  }
}
