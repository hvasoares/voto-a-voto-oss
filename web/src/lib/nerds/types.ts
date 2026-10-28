/** The level shards of "Dados para nerds" (#72), decoded: see src/voto_a_voto/nerds.py and docs/shards.md. */

export const METRICS = ['eleitorado', 'comparecimento', 'abstencao', 'brancos_nulos', 'validos', 'nao_instalados'] as const
export type Metric = (typeof METRICS)[number]

export interface Candidate {
  numero: number
  nome: string
  partido: string
}

/** One row of a shard: the measures of a place, and its candidates' votes in the shard's ballot-number order. */
export interface Row extends Record<Metric, number> {
  id: string
  /** Present on municipality rows only (the shard carries the name); UF and region names are fixed geography. */
  nome?: string
  votos: number[]
}

export interface LevelShard {
  edition: string
  hash: string
  /** The shard's own level key: `brasil`, `regiao` or `uf` (the address calls the last one `estado`). */
  level: 'brasil' | 'regiao' | 'uf'
  /** Region key or UF; null for Brasil. */
  id: string | null
  ano: number
  turno: 1 | 2
  candidatos: Candidate[]
  total: Row
  /** The children, by kind: Brasil has regioes and ufs, a regiao has ufs, an estado has municipios. */
  children: { regioes?: Row[]; ufs?: Row[]; municipios?: Row[] }
  /** The region of an estado shard. */
  regiao?: string
  /** gzip size of the file on disk, for the "peso do shard" printed in the footer. */
  gzipBytes: number
  rawBytes: number
}

/** The cycles and rounds that exist for a place: `${ano}-${turno}`. */
export type Available = ReadonlySet<string>
