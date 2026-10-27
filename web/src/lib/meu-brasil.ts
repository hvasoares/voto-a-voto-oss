/**
 * Meu Brasil (#27), PURE: up to three places (where the visitor lives, votes and was born) across 2018, 2022 and 2026.
 *
 * The places live in the ADDRESS, so reloading or forwarding the link reproduces the card: `?mora=rj/cidade-exemplo&vota=sp/x&nasceu=...`
 * (`placesQuery`, `parsePlaces`). Each place is read from its own city shard; each cycle comes from the three-cycle model
 * (`slots/city-cycles/cycles-model.ts`: the lower ballot number on the left, a cycle without data is "sem dados", never zeros), in the
 * 2nd round. The card shows, per place and cycle, the valid votes split between the two candidates and, under it, the share of
 * the electorate that did not vote: voters above non-voters, as on the city card.
 */
import type { CityShard } from './city-shard'
import { cityShardResult } from './city-shard'
import { buildCycleBlock, type CycleBlock } from '@/slots/city-cycles/cycles-model'
import { CYCLES } from '@/shared/city-model'
import { displayName, ufLabel } from '@/shared/city-search'

export const ROLES = ['mora', 'vota', 'nasceu'] as const
export type Role = (typeof ROLES)[number]
/** Meu Brasil compares the 2nd round of each cycle. */
export const MEU_BRASIL_TURNO = 2

export interface PlaceRef {
  role: Role
  uf: string
  slug: string
}

const CODE = /^([a-z]{2})\/([a-z0-9]+(?:-[a-z0-9]+)*)$/

/** The places an address asks for, in role order. An unknown or malformed value is dropped; a role is read once. Never throws. */
export function parsePlaces(search: string): PlaceRef[] {
  const q = new URLSearchParams(search)
  return ROLES.flatMap((role) => {
    const m = CODE.exec(q.get(role) ?? '')
    return m ? [{ role, uf: m[1]!, slug: m[2]! }] : []
  })
}

/** `?mora=rj/cidade-exemplo&vota=sp/x`, in role order; '' for no place. */
export function placesQuery(places: readonly PlaceRef[]): string {
  const q = ROLES.flatMap((role) => {
    const p = places.find((x) => x.role === role)
    return p ? [`${role}=${p.uf}/${p.slug}`] : []
  })
  return q.length ? `?${q.join('&')}` : ''
}

/** The place codes the card's keys carry: `mora=rj/cidade-exemplo`. */
export const placeCodes = (places: readonly PlaceRef[]): string[] => places.map((p) => `${p.role}=${p.uf}/${p.slug}`)
export function placesFromCodes(codes: readonly string[]): PlaceRef[] {
  return codes.flatMap((c) => {
    const [role, code] = c.split('=') as [Role, string]
    const m = CODE.exec(code ?? '')
    return ROLES.includes(role) && m ? [{ role, uf: m[1]!, slug: m[2]! }] : []
  })
}

export interface PlaceCard {
  ref: PlaceRef
  /** "Cidade Exemplo". */
  name: string
  /** "RJ", "Exterior". */
  ufLabel: string
  /** 2018, 2022 and 2026, in that order. */
  cycles: CycleBlock[]
}

export function buildPlaceCard(ref: PlaceRef, shard: CityShard): PlaceCard {
  const cycles = CYCLES.map((ano) => buildCycleBlock({ ano, turno: MEU_BRASIL_TURNO, city: shard.city, result: cityShardResult(shard, ano, MEU_BRASIL_TURNO) }))
  return { ref, name: displayName(shard.city.nome), ufLabel: ufLabel(shard.city.uf), cycles }
}

/** The latest cycle in which EVERY place has data, for the headline of two or three places. */
export function commonCycle(cards: readonly PlaceCard[]): number | undefined {
  return [...CYCLES].reverse().find((ano) => cards.every((c) => c.cycles.find((b) => b.ano === ano)?.status === 'data'))
}
