import { measureOptions, rateOfRow, type MeasureOption } from './rates'
import type { PanelData, PanelRecord } from './panels'
import { placeName } from './view'
import type { LevelShard, Row } from './types'

/**
 * The map panel (#78): the static UF map as a chart AND a geography selector. Brasil: the 27 UFs shaded by one measure for one turno, five region chips below (each printing its value);
 * região: its UFs shaded, the others neutral; estado: a slot that points at the municipality map. Colour comes from FIVE steps over the values of the shaded places, printed in a
 * numeric legend; every state is also printed by abbreviation and value, so colour is never the only cue. Pure: the page draws the SVG, the island only recolours it.
 */
export const STEP_FILLS = ['#e6f0f0', '#b9d6d9', '#80b2b9', '#3f8791', '#14505c'] as const
export const STEP_FGS = ['#1c1b18', '#1c1b18', '#1c1b18', '#ffffff', '#ffffff'] as const
export const NEUTRAL_FILL = '#f1ecdf'

export interface Shading {
  /** The four inner edges between the five steps, in percent. */
  edges: [number, number, number, number]
  /** The numeric legend: "até 80%", "80–82%", ..., "86% ou mais". */
  legend: string[]
}

const fmt = (n: number) => String(n).replace('.', ',')

/** Five equal steps of whole percentage points over the values (floor of the lowest to ceil of the highest). */
export function shading(values: number[]): Shading {
  const lo = Math.floor(Math.min(...values))
  const hi = Math.ceil(Math.max(...values))
  const step = Math.max(1, Math.ceil((hi - lo) / 5))
  const edges = [1, 2, 3, 4].map((i) => lo + step * i) as Shading['edges']
  const legend = [`até ${fmt(edges[0])}%`, `${fmt(edges[0])}–${fmt(edges[1])}%`, `${fmt(edges[1])}–${fmt(edges[2])}%`, `${fmt(edges[2])}–${fmt(edges[3])}%`, `${fmt(edges[3])}% ou mais`]
  return { edges, legend }
}

/** The step (0-4) of a value: the first step whose upper edge is above it. */
export const stepOf = (value: number, s: Shading): number => {
  const i = s.edges.findIndex((edge) => value < edge)
  return i < 0 ? 4 : i
}

export interface Cell {
  /** printed, "82,3%" */
  text: string
  value: number
  step: number
}
export interface MapView {
  shading: Shading
  /** UF -> cell, only the shaded places. */
  cells: Record<string, Cell>
  /** Brasil only: region -> its printed value. */
  chips?: Record<string, { text: string; value: number }>
}
export interface MapSpec {
  kind: 'map'
  recordId: string
  level: 'brasil' | 'regiao' | 'estado'
  options: MeasureOption[]
  /** `${ano}-${turno}-${measure}` -> the view. */
  views: Record<string, MapView>
  /** The view the HTML opens on: latest cycle, 1º turno, the record's measure. */
  initial: { ano: number; turno: 1 | 2; measure: string; key: string }
  cycles: number[]
  /** UFs that may be drawn linked (they have a page). */
  linked: string[]
  /** UFs of the place (the whole country on Brasil): the others are neutral. */
  scope: string[]
  weight: { files: number; gzipBytes: number }
}

const key = (ano: number, turno: number, measure: string) => `${ano}-${turno}-${measure}`

export function buildMapa(record: PanelRecord, data: PanelData, level: MapSpec['level'], known: readonly string[]): MapSpec {
  const ids = record.measure.options ?? []
  const options = measureOptions(ids, data.all.values(), !!record.measure.candidatos)
  const views: Record<string, MapView> = {}
  const shards = [...data.all.values()]
  const cycles = [...new Set(shards.map((s) => s.ano))].sort((a, b) => a - b)
  const rowsOf = (s: LevelShard): Row[] => s.children.ufs ?? []
  for (const shard of shards) {
    for (const { id } of options) {
      const rates = rowsOf(shard).flatMap((row) => { const r = rateOfRow(row, id, shard.candidatos); return r && row.id !== 'zz' ? [[row.id, r] as const] : [] })
      if (!rates.length) continue
      const sh = shading(rates.map(([, r]) => r.value))
      const view: MapView = { shading: sh, cells: Object.fromEntries(rates.map(([uf, r]) => [uf, { text: r.text, value: r.value, step: stepOf(r.value, sh) }])) }
      if (level === 'brasil') {
        view.chips = Object.fromEntries((shard.children.regioes ?? []).filter((r) => r.id !== 'exterior').flatMap((row) => { const r = rateOfRow(row, id, shard.candidatos); return r ? [[row.id, { text: r.text, value: r.value }] as const] : [] }))
      }
      views[key(shard.ano, shard.turno, id)] = view
    }
  }
  const latest = Math.max(...cycles)
  const scope = level === 'estado' ? [] : [...new Set(shards.flatMap(rowsOf).map((r) => r.id).filter((id) => id !== 'zz'))].sort()
  return {
    kind: 'map', recordId: record.id, level,
    options,
    views,
    initial: { ano: latest, turno: 1, measure: record.measure.id, key: key(latest, 1, record.measure.id) },
    cycles,
    linked: scope.filter((uf) => known.includes(uf)),
    scope,
    weight: { files: shards.length, gzipBytes: shards.reduce((t, s) => t + s.gzipBytes, 0) },
  }
}

export const viewKey = key
export { placeName }
