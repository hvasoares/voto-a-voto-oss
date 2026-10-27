/**
 * Generates public/geo/municipios-<uf>.json: the simplified geometry of one state's municipalities
 * for the inline-SVG municipality map (ticket #16 = Rio de Janeiro; #17 = all 27 UFs).
 * The output file is COMMITTED and is the shipped artifact -- the production build never contacts the
 * network; the island fetches this file only when a visitor opens the map view. Run this only to
 * refresh the geometry:
 *
 *   curl "https://servicodados.ibge.gov.br/api/v3/malhas/estados/33?formato=application/vnd.geo%2Bjson&intrarregiao=municipio&qualidade=intermediaria" -o .cache/ibge/rj.geojson
 *   npx tsx scripts/generate-municipality-polygons.ts .cache/ibge/rj.geojson rj
 *
 * (State code 33 = RJ; see IBGE. The file name inside the site is public/geo/municipios-<uf>.json.)
 *
 * Deterministic steps (a second run over the same input writes identical bytes):
 * 1. largest ring per municipality (small coastal islands are dropped: invisible at this scale);
 * 2. Douglas-Peucker simplification in degrees, --tolerance (default 0.008, the #16 RJ value);
 * 3. equirectangular projection scaled by cos of the mean latitude of the state, rounded to 2 decimals;
 * 4. municipalities sorted by their 7-digit IBGE code; stable key order in the JSON.
 *
 * The computation is exported (`meshOutput`) so the vitest suite can prove determinism on a
 * synthetic mesh and pin the exact bytes; the bottom of the file is only the CLI.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { mkdirSync } from 'node:fs'

const TOLERANCE_DEFAULT = 0.008
const SCALE = 90 // px per degree: RJ fits in a ~330px-wide map box at 390px viewport width

type Pt = [number, number]
type Geo = { features: { properties: { codarea: string }; geometry: { type: string; coordinates: unknown } }[] }

/** IBGE state code per UF (same table as scripts/generate-uf-polygons.ts), for the provenance string. */
export const IBGE_CODE: Record<string, string> = {
  ro: '11', ac: '12', am: '13', rr: '14', pa: '15', ap: '16', to: '17',
  ma: '21', pi: '22', ce: '23', rn: '24', pb: '25', pe: '26', al: '27', se: '28', ba: '29',
  mg: '31', es: '32', rj: '33', sp: '35', pr: '41', sc: '42', rs: '43', ms: '50', mt: '51', go: '52', df: '53',
}

/** Signed area of a ring (input units). */
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

/**
 * Simplifies a ring at TOLERANCE; a very small municipality that loses its shape under it is
 * simplified at TOLERANCE/3, and finally kept raw (the checks below pin a minimum of 4 distinct
 * vertices -- the coarsest mesh municipality of the 27 states, PB 2510105, ships exactly that at
 * qualidade=intermediaria).
 */
function simplifyShape(ring: Pt[], tolerance: number): Pt[] {
  for (const t of [tolerance, tolerance / 3, 0]) {
    const pts = simplify([...ring], t)
    if (pts.length >= 8) return pts
  }
  return [...ring]
}

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100
const roundUp2 = (n: number): number => Math.ceil(n * 100) / 100

interface Shape {
  codarea: string
  pts: Pt[]
  cx: number
  cy: number
}

/** The shape of the artifact the generator writes (public/geo/municipios-<uf>.json, minus the trailing newline). */
export interface MunicipalityMeshOutput {
  fonte: string
  metodo: string
  uf: string
  cdUf: string
  largura: number
  altura: number
  formas: Record<string, { p: Pt[]; c: Pt }>
}

/**
 * The deterministic core: geojson in, the mesh artifact out. Pure (no IO, reading process.argv, or
 * locale dependence), so the same input always yields the same object -- the unit test pins it.
 */
export function meshOutput(
  geo: Geo,
  { uf, cdUf, tolerance, downloaded }: { uf: string; cdUf: string; tolerance: number; downloaded: string },
): MunicipalityMeshOutput {
  if (!/^\d{7}$/.test(geo.features[0]!.properties.codarea)) throw new Error('mesh features do not carry 7-digit municipality codes')
  for (const f of geo.features) {
    if (!f.properties.codarea.startsWith(cdUf)) throw new Error(`mesh feature ${f.properties.codarea} is outside UF ${cdUf}`)
  }

  // One municipality: the largest ring only, in degrees.
  const raw = new Map<string, Pt[]>()
  for (const f of geo.features) {
    const codarea = f.properties.codarea
    if (raw.has(codarea)) throw new Error(`codarea ${codarea} appears twice in the mesh`)
    const coords = f.geometry.coordinates as unknown as (Pt[][] | Pt[][][])
    const polys: Pt[][][] = f.geometry.type === 'MultiPolygon' ? (coords as Pt[][][]) : [coords as Pt[][]]
    const rings = polys.map((p) => p[0]!)
    rings.sort((a, b) => ringArea(b) - ringArea(a))
    raw.set(codarea, rings[0]!)
  }

  // Projection: x scaled by cos of the mean latitude (like scripts/generate-uf-polygons.ts, but state-wide).
  const all = [...raw.values()]
  const latMin = Math.min(...all.flat().map((p) => p[1]))
  const latMax = Math.max(...all.flat().map((p) => p[1]))
  const lonMin = Math.min(...all.flat().map((p) => p[0]))
  const lonMax = Math.max(...all.flat().map((p) => p[0]))
  const COS = Math.cos((((latMin + latMax) / 2) * Math.PI) / 180)
  const project = ([lon, lat]: Pt): Pt => [
    round2((lon - lonMin) * SCALE * COS),
    round2((latMax - lat) * SCALE),
  ]

  const codes = [...raw.keys()].sort() // 7-digit IBGE codes sort numerically as strings
  const shapes: Shape[] = codes.map((codarea) => {
    const pts = simplifyShape(raw.get(codarea)!, tolerance).map(project)
    if (pts.length < 5) throw new Error(`codarea ${codarea}: simplification left only ${pts.length} points`)
    const [cx, cy] = centroid(pts)
    return { codarea, pts, cx: Math.round(cx * 10) / 10, cy: Math.round(cy * 10) / 10 }
  })

  const width = roundUp2(Math.max(...shapes.flatMap((s) => s.pts.map((p) => p[0]))))
  const height = roundUp2(Math.max(...shapes.flatMap((s) => s.pts.map((p) => p[1]))))

  return {
    // Provenance recorded in the artifact itself (the acceptance of the data half): source, download date,
    // method -- and the deterministic steps so a reviewer can redo the run byte by byte.
    fonte: `IBGE "malhas" API v3, /malhas/estados/${cdUf}?intrarregiao=municipio&qualidade=intermediaria, downloaded ${downloaded}`,
    metodo: `largest ring per municipality, Douglas-Peucker at ${tolerance} degrees, equirectangular projected (x scaled by cos of the mean latitude ${Math.round(((latMin + latMax) / 2) * 10) / 10}), scale ${SCALE} px/degree, 2 decimals. Generated by web/scripts/generate-municipality-polygons.ts.`,
    uf,
    cdUf,
    largura: width,
    altura: height,
    formas: Object.fromEntries(shapes.map((s) => [s.codarea, { p: s.pts, c: [s.cx, s.cy] }])),
  }
}

/** CLI only (the module is also imported by the vitest determinism test). */
function readArg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag)
  return i >= 0 ? process.argv[i + 1] : undefined
}

function runningCli(): boolean {
  return process.argv[1]?.endsWith('generate-municipality-polygons.ts') === true
}

if (runningCli()) {
  const inputPath = process.argv[2]
  if (!inputPath) throw new Error('usage: tsx scripts/generate-municipality-polygons.ts <IBGE geojson of the state> <uf>')
  const uf = readArg('--uf') ?? process.argv[3]
  if (!uf) throw new Error('usage: tsx scripts/generate-municipality-polygons.ts <IBGE geojson> <uf lower-case>')
  const cdUf = readArg('--cd-uf') ?? IBGE_CODE[uf]
  if (!cdUf) throw new Error(`no IBGE state code for UF "${uf}"; pass --cd-uf`)
  const toleranceArg = readArg('--tolerance')
  if (toleranceArg !== undefined) {
    const n = Number(toleranceArg)
    if (!Number.isFinite(n) || n <= 0) throw new Error(`--tolerance needs a positive number, got "${toleranceArg}"`)
  }
  // #17 raises the tolerance only where a large state's fit-all view would render 0.008 invisibly
  // anyway; every value is a documented, per-file provenance field (metodo) and is recorded in
  // web/docs/checkpoints/issue-17.md.
  const tolerance = Number(toleranceArg ?? TOLERANCE_DEFAULT)
  // Download date recorded in the artifact's provenance (default = the #16 RJ run; a re-download of
  // any state must pass its own date so the provenance never lies).
  const downloaded = readArg('--downloaded') ?? '2026-10-26'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(downloaded)) throw new Error(`--downloaded wants YYYY-MM-DD, got "${downloaded}"`)

  const geo: Geo = JSON.parse(readFileSync(resolve(inputPath), 'utf8'))
  const outputObj = meshOutput(geo, { uf, cdUf, tolerance, downloaded })
  const outPath = resolve(import.meta.dirname!, '..', 'public', 'geo', `municipios-${uf}.json`)
  mkdirSync(resolve(outPath, '..'), { recursive: true })
  writeFileSync(outPath, `${JSON.stringify(outputObj)}\n`)

  const shapes = Object.keys(outputObj.formas)
  const points = shapes.reduce((n, k) => n + outputObj.formas[k]!.p.length, 0)
  console.log(
    `wrote ${outPath}: ${shapes.length} municipalities, viewBox ${outputObj.largura}x${outputObj.altura}, ` +
      `${points} points after simplification`,
  )
}