/**
 * Generates src/lib/uf-polygons.ts: the simplified geometry of the 27 federative units for the
 * inline-SVG map view of the state map (ticket #11). The output file is COMMITTED and is the
 * shipped artifact - the build never needs the network. Run this only to refresh the geometry:
 *
 *   curl "https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/vnd.geo%2Bjson&intrarregiao=UF&qualidade=minima" -o br-uf-minima.geojson
 *   npx tsx scripts/generate-uf-polygons br-uf-minima.geojson
 *
 * Deterministic steps (a second run over the same input writes identical bytes):
 * 1. largest ring per UF only (small coastal islands are dropped: this map is for orientation);
 * 2. Douglas-Peucker simplification in degrees, tolerance 0.08;
 * 3. equirectangular projection scaled by cos(mean latitude), then rounded to 2 decimals;
 * 4. centroid and bbox of each ring, computed on the projected points (label + callout anchors).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const fileHeader = () => `/**
 * Simplified geometry of the 27 federative units for the state-map SVG view (ticket #11).
 * COMMITTED ARTIFACT - generated ONCE by scripts/generate-uf-polygons.ts; the production build
 * never contacts the network. Source: IBGE "malhas" API v3, /malhas/paises/BR with
 * intrarregiao=UF and qualidade=minima, downloaded 2026-10-26. Provenance: IBGE open data.
 * Steps there: largest ring per UF, Douglas-Peucker at 0.08 degrees, equirectangular projection
 * (x scaled by cos of the mean latitude ${round1((latMin + latMax) / 2)}), rounded to 2 decimals.
 * Regenerate with the command in that script's header only when ticket #17's finer geometry lands.
 */
`

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function roundUp2(n: number): number {
  return Math.ceil(n * 100) / 100
}

const inputPath = process.argv[2]
const outPath = resolve(import.meta.dirname!, '../src/lib/uf-polygons.ts')
if (!inputPath) throw new Error('usage: tsx scripts/generate-uf-polygons.ts <IBGE geojson file>')

/** IBGE area code -> lower-case UF (the dataset's uf codes). */
const UF_BY_AREA: Record<string, string> = {
  11: 'ro', 12: 'ac', 13: 'am', 14: 'rr', 15: 'pa', 16: 'ap', 17: 'to',
  21: 'ma', 22: 'pi', 23: 'ce', 24: 'rn', 25: 'pb', 26: 'pe', 27: 'al', 28: 'se', 29: 'ba',
  31: 'mg', 32: 'es', 33: 'rj', 35: 'sp', 41: 'pr', 42: 'sc', 43: 'rs', 50: 'ms', 51: 'mt', 52: 'go', 53: 'df',
}

type Pt = [number, number]

/** Signed area of a ring (positive = counter-clockwise), in the input units. */
function ringArea(ring: Pt[]): number {
  let a = 0
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i]!
    const [x2, y2] = ring[(i + 1) % ring.length]!
    a += x1 * y2 - x2 * y1
  }
  return Math.abs(a / 2)
}

/** Douglas-Peucker; keeps the ring's first and last point. */
function simplify(ring: Pt[], tolerance: number): Pt[] {
  const dist = (p: Pt, a: Pt, b: Pt): number => {
    const [px, py] = p, [ax, ay] = a, [bx, by] = b
    const dx = bx - ax, dy = by - ay
    const l2 = dx * dx + dy * dy
    if (l2 === 0) return Math.hypot(px - ax, py - ay)
    let t = ((px - ax) * dx + (py - ay) * dy) / l2
    t = Math.max(0, Math.min(1, t))
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
  }
  const keep = (pts: Pt[]): Pt[] => {
    if (pts.length <= 2) return pts
    const [a, , ...mid] = pts
    const b = pts[pts.length - 1]!
    let idx = -1
    let max = -1
    for (let i = 1; i < pts.length - 1; i++) {
      const d = dist(pts[i]!, a!, b)
      if (d > max) { max = d; idx = i }
    }
    if (max <= tolerance) return [a!, b]
    return [...keep(pts.slice(0, idx + 1)).slice(0, -1), ...keep(pts.slice(idx))]
  }
  return keep(ring)
}

/** Polygon centroid of a ring (projected units). */
function centroid(ring: Pt[]): Pt {
  let x = 0
  let y = 0
  let area = 0
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i]!
    const [x2, y2] = ring[(i + 1) % ring.length]!
    const cross = x1 * y2 - x2 * y1
    area += cross
    x += (x1 + x2) * cross
    y += (y1 + y2) * cross
  }
  area /= 2
  return [x / (6 * area), y / (6 * area)]
}

type Geo = { features: { properties: { codarea: string }; geometry: { type: string; coordinates: unknown } }[] }

const geo: Geo = JSON.parse(readFileSync(resolve(inputPath), 'utf8'))

const raw = new Map<string, Pt[]>()
for (const f of geo.features) {
  const uf = UF_BY_AREA[f.properties.codarea]
  if (!uf) throw new Error(`unknown codarea ${f.properties.codarea}`)
  const coords = f.geometry.coordinates as unknown as (Pt[][] | Pt[][][])
  const polys: Pt[][][] = f.geometry.type === 'MultiPolygon' ? (coords as Pt[][][]) : [coords as Pt[][]]
  const rings = polys.map((p) => p[0]!)
  // Largest ring only (the main landmass at this scale; islands would be single-pixel specks).
  rings.sort((a, b) => ringArea(b) - ringArea(a))
  raw.set(uf, rings[0]!)
}

// Projection: the frame map is ~330 px wide for Brazil; scale from degrees to px here, at render
// time only the viewBox scales.
const all = [...raw.values()]
const latMin = Math.min(...all.flat().map((p) => p[1]))
const latMax = Math.max(...all.flat().map((p) => p[1]))
const lonMin = Math.min(...all.flat().map((p) => p[0]))
const lonMax = Math.max(...all.flat().map((p) => p[0]))
const SCALE = 10 // px per degree
const COS = Math.cos((((latMin + latMax) / 2) * Math.PI) / 180) // x correction near the mean latitude
const project = ([lon, lat]: Pt): Pt => [
  Math.round(((lon - lonMin) * SCALE * COS + Number.EPSILON) * 100) / 100,
  Math.round(((latMax - lat) * SCALE + Number.EPSILON) * 100) / 100,
]

const TOLERANCE = 0.08

interface Shape {
  uf: string
  pts: Pt[]
  // centroid (rounded) and half extents, used for inline labels and callout leader lines
  cx: number
  cy: number
  w: number
  h: number
}

const shapes: Shape[] = [...raw.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([uf, ring]) => {
  const pts = simplify([...ring], TOLERANCE).map(project)
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const [cx, cy] = (() => {
    const [x, y] = centroid(pts)
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10]
  })()
  return {
    uf,
    pts,
    cx,
    cy,
    w: Math.round((Math.max(...xs) - Math.min(...xs)) * 10) / 10,
    h: Math.round((Math.max(...ys) - Math.min(...ys)) * 10) / 10,
  }
})

const width = Math.max(...shapes.flatMap((s) => s.pts.map((p) => p[0])))
const height = Math.max(...shapes.flatMap((s) => s.pts.map((p) => p[1])))

const body = shapes
  .map((s) => `  { uf: '${s.uf}', pts: [${s.pts.map((p) => `[${p[0]},${p[1]}]`).join(',')}], cx: ${s.cx}, cy: ${s.cy}, w: ${s.w}, h: ${s.h} },`)
  .join('\n')

const output = `${fileHeader()}
export interface UfShape {
  /** Lower-case UF code (no overseas: the dataset has no geography for it). */
  uf: string
  /** Simplified outline, projected units (px per degree is fixed below by the viewBox). */
  pts: [number, number][]
  /** Centroid (10x the degree scale above), anchor of inline labels and callout leader lines. */
  cx: number
  cy: number
  /** Projected bbox extents; small/narrow states are labelled outside the map (callouts). */
  w: number
  h: number
}

/** Projected size of the map (px), rounded UP so every point fits: draw in a viewBox of 0 0 ${roundUp2(width)} ${roundUp2(height)}. */
export const MAP_WIDTH = ${roundUp2(width)}
export const MAP_HEIGHT = ${roundUp2(height)}

/** The 27 federal units in IBGE area-code order. */
export const UF_SHAPES: UfShape[] = [
${body}
]

/**
 * The callouts (small/narrow states labelled outside the map, in the Sketch frame order) and where
 * their leader line touches the state. Design decision of ticket #11, same list as the frame.
 */
export const CALLOUT_RIGHT: string[] = ['ce', 'rn', 'pb', 'pe', 'al', 'se', 'df', 'es', 'rj', 'sc']
export const CALLOUT_LEFT: string[] = ['ac']
`

writeFileSync(outPath, output)
console.log(`wrote ${outPath}: ${shapes.length} UFs, viewBox ${roundUp2(width)}x${roundUp2(height)}, ${shapes.reduce((n, s) => n + s.pts.length, 0)} points`)