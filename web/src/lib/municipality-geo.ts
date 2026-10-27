/**
 * The committed municipality mesh file (`public/geo/municipios-<uf>.json`, ticket #16 = RJ), SHARED
 * by the island (which parses it at runtime) and the tests (which read the file from disk and pin
 * the join with the dataset). The file is generated once by `scripts/generate-municipality-polygons.ts`
 * and committed; this module only parses and validates, it never fetches and never computes geometry.
 */

export type Pt = [number, number]

export interface MunicipalityMesh {
  /** Provenance recorded in the artifact itself. */
  fonte: string
  metodo: string
  uf: string
  /** The IBGE state code the mesh covers (municipality codes start with it). */
  cdUf: string
  /** Projected size of the map (px, scale recorded in `metodo`): the viewBox of the map view. */
  largura: number
  altura: number
  /** Municipality shapes by their 7-digit IBGE code: outline (closed ring) and centroid. */
  formas: Record<string, { p: Pt[]; c: Pt }>
}

type Unknown = Record<string, unknown>

function isPt(p: unknown): p is Pt {
  return (
    Array.isArray(p) && p.length === 2 && typeof p[0] === 'number' && typeof p[1] === 'number' && Number.isFinite(p[0]) && Number.isFinite(p[1])
  )
}

/** Parses and validates the mesh file; throws on anything unexpected (a broken join must fail loud). */
export function parseMunicipalityMesh(json: unknown): MunicipalityMesh {
  const o = json as Unknown
  if (typeof o !== 'object' || o === null) throw new Error('malha: not an object')
  for (const key of ['fonte', 'metodo', 'uf', 'cdUf']) {
    if (typeof o[key] !== 'string' || (o[key] as string).length === 0) throw new Error(`malha: ${key} ausente ou sem texto`)
  }
  if (typeof o.largura !== 'number' || typeof o.altura !== 'number' || (o.largura as number) <= 0 || (o.altura as number) <= 0) {
    throw new Error('malha: largura/altura ausentes ou invalidas')
  }
  const formas = o.formas as Unknown
  if (typeof formas !== 'object' || formas === null) throw new Error('malha: sem formas')
  const out: MunicipalityMesh = {
    fonte: o.fonte as string,
    metodo: o.metodo as string,
    uf: o.uf as string,
    cdUf: o.cdUf as string,
    largura: o.largura as number,
    altura: o.altura as number,
    formas: {},
  }
  for (const [cdIbge, raw] of Object.entries(formas)) {
    if (!/^\d{7}$/.test(cdIbge) || !cdIbge.startsWith(out.cdUf)) throw new Error(`malha: codigo IBGE invalido "${cdIbge}"`)
    const s = raw as Unknown
    const p = s.p
    if (!Array.isArray(p) || p.length < 7 || !isPt(p[0]) || !isPt(p[p.length - 1]!)) {
      throw new Error(`malha: municipio ${cdIbge} com anel invalido`)
    }
    if (p[0]!.join(',') !== (p[p.length - 1] as Pt).join(',')) throw new Error(`malha: municipio ${cdIbge} com anel aberto`)
    for (const pt of p as unknown[]) {
      if (!isPt(pt)) throw new Error(`malha: municipio ${cdIbge} com ponto invalido`)
    }
    if (!isPt(s.c)) throw new Error(`malha: municipio ${cdIbge} sem centroide`)
    out.formas[cdIbge] = { p: p as Pt[], c: s.c as Pt }
  }
  return out
}

/** One shape joined with the city row of the dataset (by the IBGE code); unmatched polygons stay out of the list. */
export interface JoinedShape {
  codarea: string
  pts: Pt[]
  cx: number
  cy: number
}

/** The map's shapes in file order, each joined to nothing here: the caller joins by cdIbge. */
export function meshShapes(mesh: MunicipalityMesh): JoinedShape[] {
  return Object.entries(mesh.formas).map(([codarea, { p, c }]) => ({ codarea, pts: p, cx: c[0]!, cy: c[1]! }))
}