import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * The SVG state map of Brazil (tickets #53 Home, #54 Mapa por estado): the 27 outlines of the committed file
 * `data/geo/uf-outlines.json` (made by `make data`, see src/voto_a_voto/outlines.py) projected to one drawing.
 * Pure geometry, no election data. Build time only (Node): the pages draw it as static inline SVG.
 */

export interface OutlineFile {
  ufs: { uf: string; code: string; rings: [number, number][][] }[]
}

/** The small coastal states are named outside the map, with a key square and a leader line (frame "1 Home (desktop)"), in this order top to bottom. */
export const CALLOUTS_RIGHT = ['ce', 'rn', 'pb', 'pe', 'al', 'se', 'df', 'es', 'rj', 'sc'] as const
/** Acre sits at the far left edge: its name goes to the left of the map. */
export const CALLOUTS_LEFT = ['ac'] as const

export interface Callout {
  /** Top-left of the 15 px key square. */
  keyX: number
  keyY: number
  /** Where the label text starts (to the right of the key) and its baseline. */
  textX: number
  textY: number
  /** The leader line: from the state's anchor to the key. */
  lineFrom: [number, number]
  lineTo: [number, number]
}

export interface UfShape {
  uf: string
  /** SVG path data of every ring, 1 decimal. */
  d: string
  /** Where the abbreviation or value is printed inside the state (the centre of its largest ring). */
  labelX: number
  labelY: number
  /** Present for the small coastal states and Acre: the name is printed outside, at `callout`. */
  callout?: Callout
}

export interface UfMap {
  width: number
  height: number
  shapes: UfShape[]
}

/** Pixels per degree of latitude; longitude is scaled by the cosine of the mean latitude (equirectangular). */
const PX_PER_DEG = 10
const LEFT = 56
const RIGHT = 120
const KEY = 15
const ROW = 26

const fmt = (n: number): string => String(Math.round(n * 10) / 10)

/** `M x y l dx dy dx dy ... z` per ring, relative after the first point, minus signs as separators: the file is HTML on every Home load. */
export function pathData(rings: [number, number][][]): string {
  return rings
    .map((ring) => {
      const [first, ...rest] = ring.slice(0, -1) // the ring is closed by `z`
      let [px, py] = [Math.round(first![0] * 10) / 10, Math.round(first![1] * 10) / 10]
      let out = `M${fmt(px)} ${fmt(py)}l`
      let previous = ''
      for (const [x, y] of rest) {
        const [rx, ry] = [Math.round(x * 10) / 10, Math.round(y * 10) / 10]
        for (const delta of [rx - px, ry - py]) {
          const text = fmt(delta)
          out += previous !== '' && !text.startsWith('-') ? ` ${text}` : text
          previous = text
        }
        ;[px, py] = [rx, ry]
      }
      return `${out}z`
    })
    .join('')
}

/** Area-weighted centroid of a closed ring. */
function centroid(ring: [number, number][]): [number, number] {
  let [a, cx, cy] = [0, 0, 0]
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i]!
    const [x2, y2] = ring[i + 1]!
    const cross = x1 * y2 - x2 * y1
    a += cross
    cx += (x1 + x2) * cross
    cy += (y1 + y2) * cross
  }
  return a === 0 ? ring[0]! : [cx / (3 * a), cy / (3 * a)]
}

export function projectOutlines(file: OutlineFile): UfMap {
  const points = file.ufs.flatMap((u) => u.rings.flat())
  const lons = points.map((p) => p[0])
  const lats = points.map((p) => p[1])
  const [lonMin, lonMax, latMin, latMax] = [Math.min(...lons), Math.max(...lons), Math.min(...lats), Math.max(...lats)]
  const k = Math.cos((((latMin + latMax) / 2) * Math.PI) / 180)
  const project = ([lon, lat]: [number, number]): [number, number] => [LEFT + (lon - lonMin) * k * PX_PER_DEG, (latMax - lat) * PX_PER_DEG]
  const mapWidth = (lonMax - lonMin) * k * PX_PER_DEG
  const mapHeight = (latMax - latMin) * PX_PER_DEG

  const projected = file.ufs.map((u) => {
    const rings = u.rings.map((ring) => ring.map(project))
    return { uf: u.uf, rings, anchor: centroid(rings[0]!) }
  })
  const byUf = new Map(projected.map((p) => [p.uf, p]))
  const callouts = new Map<string, Callout>()
  const place = (names: readonly string[], keyX: number, textX: number, firstY: number) => {
    names.forEach((uf, i) => {
      const anchor = byUf.get(uf)!.anchor
      const keyY = firstY + i * ROW
      callouts.set(uf, { keyX, keyY, textX, textY: keyY + 12, lineFrom: anchor, lineTo: [keyX, keyY + KEY / 2] })
    })
  }
  place(CALLOUTS_RIGHT, LEFT + mapWidth + 28, LEFT + mapWidth + 52, byUf.get(CALLOUTS_RIGHT[0])!.anchor[1] - KEY / 2)
  // Acre: key at the left edge, below its anchor.
  const ac = byUf.get('ac')!.anchor
  callouts.set('ac', { keyX: 0, keyY: ac[1] + 28, textX: 22, textY: ac[1] + 40, lineFrom: ac, lineTo: [KEY / 2, ac[1] + 28] })

  const round = (n: number) => Math.round(n * 10) / 10
  return {
    width: Math.ceil(LEFT + mapWidth + RIGHT),
    height: Math.ceil(Math.max(mapHeight, ...[...callouts.values()].map((c) => c.keyY + KEY)) + 4),
    shapes: projected.map((p) => {
      const callout = callouts.get(p.uf)
      return {
        uf: p.uf,
        d: pathData(p.rings),
        labelX: round(p.anchor[0]),
        labelY: round(p.anchor[1]),
        ...(callout && {
          callout: {
            ...callout,
            lineFrom: [round(callout.lineFrom[0]), round(callout.lineFrom[1])] as [number, number],
            lineTo: [round(callout.lineTo[0]), round(callout.lineTo[1])] as [number, number],
          },
        }),
      }
    }),
  }
}

let cached: UfMap | undefined

/** The committed outline file, projected (cached for the build). Relative to web/, like the dataset directory. */
export function loadUfMap(file = resolve(process.cwd(), '../data/geo/uf-outlines.json')): UfMap {
  if (file !== undefined && cached && file.endsWith('uf-outlines.json')) return cached
  const map = projectOutlines(JSON.parse(readFileSync(file, 'utf8')) as OutlineFile)
  cached = map
  return map
}
