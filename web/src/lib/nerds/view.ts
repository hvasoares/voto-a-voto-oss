import { regionLabel } from '../brasil'
import { UF_NOME } from '../uf-names'
import type { Level } from './paths'
import { CYCLES, placesWithShards, readPlace, type ShardLevel } from './shards'
import type { LevelShard } from './types'

/**
 * What one page of the dashboard needs, from one component for all three levels (#74): the place (name, where "up" is, what its children are) and the shards of every
 * cycle. The level is a parameter, not a template: drill-down is a change of level.
 */
export interface PlaceView {
  level: Level
  id: string | null
  /** `Brasil`, `Sudeste`, `São Paulo`. */
  name: string
  /** The breadcrumb from Brasil down to this place, each with its address (relative to the base, last one has none). */
  crumbs: { label: string; path?: string }[]
  /** Cycles that have data for this place, ascending; `shards.get('2022-1')`. */
  cycles: number[]
  shards: Map<string, LevelShard>
  /** The Brasil shards, for the reference line of a região or estado; empty on Brasil. */
  reference: Map<string, LevelShard>
  /** The next level up (Brasil for a região, the região for an estado): Par's reference row. */
  parent?: { name: string; shards: Map<string, LevelShard> }
  /** `brasil`, `regiao`, `uf`: the key the shard files use. */
  shardLevel: ShardLevel
}

const SHARD_LEVEL: Record<Level, ShardLevel> = { brasil: 'brasil', regiao: 'regiao', estado: 'uf' }

export function placeName(level: Level, id: string | null): string {
  if (level === 'brasil') return 'Brasil'
  if (level === 'regiao') return regionLabel(id!)
  return UF_NOME[id!] ?? id!.toUpperCase()
}

export function loadPlace(level: Level, id: string | null, root?: string): PlaceView {
  const shardLevel = SHARD_LEVEL[level]
  const shards = readPlace(shardLevel, id, root)
  const cycles = CYCLES.filter((ano) => shards.has(`${ano}-1`) || shards.has(`${ano}-2`))
  const regiao = level === 'estado' ? [...shards.values()][0]?.regiao : undefined
  const crumbs: PlaceView['crumbs'] = [{ label: 'Brasil', path: level === 'brasil' ? undefined : 'dados-para-nerds/' }]
  if (level === 'regiao') crumbs.push({ label: placeName(level, id) })
  if (level === 'estado') {
    if (regiao) crumbs.push({ label: regionLabel(regiao), path: `dados-para-nerds/regiao/${regiao}/` })
    crumbs.push({ label: placeName(level, id) })
  }
  const reference = level === 'brasil' ? new Map<string, LevelShard>() : readPlace('brasil', null, root)
  const parent = level === 'regiao' ? { name: 'Brasil', shards: reference } : level === 'estado' && regiao ? { name: regionLabel(regiao), shards: readPlace('regiao', regiao, root) } : undefined
  return { level, id, name: placeName(level, id), crumbs, cycles: [...cycles], shards, reference, parent, shardLevel }
}

export interface ChildLinks {
  /** `Regiões`, `Estados`. */
  label: string
  links: { label: string; path: string }[]
}

/** Links down the levels (no JavaScript needed): Brasil lists its regiões, then its estados; a região lists its estados; an estado has none here (its municípios are in the table). */
export function childLinks(place: PlaceView, root?: string): ChildLinks[] {
  const known = placesWithShards(root)
  const groups: ChildLinks[] = []
  if (place.level === 'brasil') {
    groups.push({ label: 'Regiões', links: known.regioes.map((r) => ({ label: placeName('regiao', r), path: `dados-para-nerds/regiao/${r}/` })) })
  }
  if (place.level === 'brasil' || place.level === 'regiao') {
    const latest = Math.max(...place.cycles)
    const shard = place.shards.get(`${latest}-1`) ?? place.shards.get(`${latest}-2`)
    const ids = (shard?.children.ufs ?? []).map((row) => row.id).filter((uf) => known.ufs.includes(uf))
    groups.push({ label: 'Estados', links: ids.map((uf) => ({ label: placeName('estado', uf), path: `dados-para-nerds/estado/${uf}/` })).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')) })
  }
  return groups.filter((g) => g.links.length)
}

/** "região do Brasil", "estado da região Sudeste", "município de São Paulo": the places a level's table lists, for the question in its title. */
export function childNoun(place: Pick<PlaceView, 'level' | 'name'>): string {
  if (place.level === 'brasil') return 'região do Brasil'
  if (place.level === 'regiao') return `estado da região ${place.name}`
  return `município de ${place.name}`
}

/** "UFs", "estados da região Sudeste", "municípios de São Paulo": what the Distribuição counts, for its title. */
export function childPlural(place: Pick<PlaceView, 'level' | 'name'>): string {
  if (place.level === 'brasil') return 'estados do Brasil'
  if (place.level === 'regiao') return `estados da região ${place.name}`
  return `municípios de ${place.name}`
}
