import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import { dataDir } from '../data-dir'
import { METRICS, type Candidate, type LevelShard, type Row } from './types'

/**
 * Build-time reader of the level shards (#72): `<DATA_DIR>/nerds/<level>/<key>/<ano>-<turno>.json`. Nothing here runs in a browser; the pages print the numbers as tables
 * and a shard is never copied to `dist`.
 */
export const CYCLES = [2018, 2022, 2026] as const
export const TURNOS = [1, 2] as const

export type ShardLevel = 'brasil' | 'regiao' | 'uf'

export function shardPath(level: ShardLevel, id: string | null, ano: number, turno: number, root = resolve(dataDir(), 'nerds')): string {
  return resolve(root, level, ...(id ? [id] : []), `${ano}-${turno}.json`)
}

interface RawShard {
  edition: string
  hash: string
  level: LevelShard['level']
  id: string | null
  columns: string[]
  candidatos: Candidate[]
  total: unknown[]
  regiao?: string
  regioes?: unknown[][]
  ufs?: unknown[][]
  municipios?: unknown[][]
}

function decodeRow(columns: string[], cells: unknown[]): Row {
  const start = columns.indexOf('eleitorado')
  const row = Object.fromEntries(columns.slice(0, start).map((name, i) => [name, cells[i]])) as unknown as Row
  METRICS.forEach((name, i) => ((row as unknown as Record<string, number>)[name] = cells[start + i] as number))
  row.votos = cells.slice(start + METRICS.length) as number[]
  if (row.nome === null) delete row.nome
  return row
}

/** One shard, or `undefined` when that turno did not happen (the file is absent: never zeros). */
export function readShard(level: ShardLevel, id: string | null, ano: number, turno: number, root?: string): LevelShard | undefined {
  const file = shardPath(level, id, ano, turno, root)
  if (!existsSync(file)) return undefined
  const bytes = readFileSync(file)
  const raw = JSON.parse(bytes.toString('utf8')) as RawShard
  const kids = (cells: unknown[][] | undefined): Row[] | undefined => cells?.map((c) => decodeRow(raw.columns, c))
  return {
    edition: raw.edition,
    hash: raw.hash,
    level: raw.level,
    id: raw.id ?? null,
    ano,
    turno: turno as 1 | 2,
    candidatos: raw.candidatos,
    total: decodeRow(raw.columns, raw.total),
    children: { regioes: kids(raw.regioes), ufs: kids(raw.ufs), municipios: kids(raw.municipios) },
    regiao: raw.regiao,
    gzipBytes: gzipSync(bytes).length,
    rawBytes: bytes.length,
  }
}

/** All the shards of a place, by `${ano}-${turno}`. */
export function readPlace(level: ShardLevel, id: string | null, root?: string): Map<string, LevelShard> {
  const found = new Map<string, LevelShard>()
  for (const ano of CYCLES) for (const turno of TURNOS) {
    const shard = readShard(level, id, ano, turno, root)
    if (shard) found.set(`${ano}-${turno}`, shard)
  }
  return found
}

/** The places that have shards (a region or UF with no data in the dataset has none and so has no page). */
export function placesWithShards(root = resolve(dataDir(), 'nerds')): { regioes: string[]; ufs: string[] } {
  const manifest = JSON.parse(readFileSync(resolve(root, 'manifest.json'), 'utf8')) as { shards: Record<string, unknown> }
  const keys = (level: string) => [...new Set(Object.keys(manifest.shards).filter((n) => n.startsWith(`${level}/`)).map((n) => n.split('/')[1]!))].sort()
  return { regioes: keys('regiao'), ufs: keys('uf') }
}
