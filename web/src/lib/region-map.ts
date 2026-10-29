import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadUfMap, type UfMap, type UfShape } from './uf-map'
import { REGION_ORDER } from './regions'

export { REGION_ORDER }

/**
 * The static region map of the dashboard "Dados para nerds" (ticket #71). No second geometry exists: a region is its states' outlines from `data/geo/uf-outlines.json`
 * (via `loadUfMap`, the Home/Mapa por estado projection), grouped by the committed membership file `data/geo/regions.json`. Its outline is therefore exactly the union
 * of its states' outlines - the drawing is the same paths, and a region's `d` is the concatenation of its states' `d`.
 */
export interface RegionFile {
  regioes: Record<string, string[]>
}

export interface RegionShape {
  regiao: string
  /** The states of the region, in the file's order. */
  ufs: string[]
  /** Path data: the paths of its states, one after the other. */
  d: string
  /** Where the name is printed: the middle of the states' label points. */
  labelX: number
  labelY: number
}

export interface RegionMap {
  width: number
  height: number
  shapes: RegionShape[]
  /** The states' own shapes, for the drawing that draws both from the same outlines. */
  ufs: UfShape[]
}

export function groupRegions(map: UfMap, file: RegionFile): RegionMap {
  const byUf = new Map(map.shapes.map((s) => [s.uf, s]))
  const shapes = REGION_ORDER.filter((r) => file.regioes[r]).map((regiao): RegionShape => {
    const ufs = file.regioes[regiao]!
    const members = ufs.map((uf) => {
      const shape = byUf.get(uf)
      if (!shape) throw new Error(`region ${regiao}: ${uf} has no outline`)
      return shape
    })
    const mean = (pick: (s: UfShape) => number) => Math.round((members.reduce((sum, s) => sum + pick(s), 0) / members.length) * 10) / 10
    return { regiao, ufs, d: members.map((s) => s.d).join(''), labelX: mean((s) => s.labelX), labelY: mean((s) => s.labelY) }
  })
  return { width: map.width, height: map.height, shapes, ufs: map.shapes }
}

let cached: RegionMap | undefined

/** The committed membership over the committed outlines, projected once for the build. Relative to web/, like `loadUfMap`. */
export function loadRegionMap(file = resolve(process.cwd(), '../data/geo/regions.json')): RegionMap {
  return (cached ??= groupRegions(loadUfMap(), JSON.parse(readFileSync(file, 'utf8')) as RegionFile))
}
