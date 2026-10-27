import { parseCandidates, parseCities, parseTurnout, parseVotes } from './csv'
import type { Candidate, City, DataStore, Manifest, State, TextSource, Turnout, TurnoutQuery, Vote } from './types'

const OVERSEAS_UF = 'zz'

function matches(q: TurnoutQuery | undefined, r: { ano: number; turno: number; uf: string; cdMunicipio: string }): boolean {
  if (!q) return true
  return (
    (q.ano === undefined || q.ano === r.ano) &&
    (q.turno === undefined || q.turno === r.turno) &&
    (q.uf === undefined || q.uf.toLowerCase() === r.uf) &&
    (q.cdMunicipio === undefined || q.cdMunicipio === r.cdMunicipio)
  )
}

/** Builds a DataStore on top of any TextSource (disk in Node, fetch in the browser). Files load lazily, once. */
export function createStore(read: TextSource): DataStore {
  const once = <T>(load: () => Promise<T>) => {
    let p: Promise<T> | undefined
    return () => (p ??= load())
  }
  const cities = once(async () => parseCities(await read('cities.csv')))
  const turnout = once(async () => parseTurnout(await read('turnout.csv')))
  const votes = once(async () => parseVotes(await read('votes.csv')))
  const candidates = once(async () => parseCandidates(await read('candidates.csv')))
  const manifest = once(async () => JSON.parse(await read('manifest.json')) as Manifest)

  // Per-city index: city pages query one city at a time, 23,000 times in a real build.
  const indexBy = <T extends { uf: string; cdMunicipio: string }>(load: () => Promise<T[]>) =>
    once(async () => {
      const m = new Map<string, T[]>()
      for (const r of await load()) {
        const k = `${r.uf}|${r.cdMunicipio}`
        const l = m.get(k)
        l ? l.push(r) : m.set(k, [r])
      }
      return m
    })
  const turnoutIdx = indexBy(turnout)
  const votesIdx = indexBy(votes)
  const pick = async <T extends { ano: number; turno: number; uf: string; cdMunicipio: string }>(all: () => Promise<T[]>, idx: () => Promise<Map<string, T[]>>, q?: TurnoutQuery) =>
    (q?.uf !== undefined && q.cdMunicipio !== undefined ? ((await idx()).get(`${q.uf.toLowerCase()}|${q.cdMunicipio}`) ?? []) : await all()).filter((r) => matches(q, r))

  return {
    cities,
    async city(uf, slug) {
      return (await cities()).find((c: City) => c.uf === uf.toLowerCase() && c.slug === slug)
    },
    async citiesByUf(uf) {
      return (await cities()).filter((c) => c.uf === uf.toLowerCase()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))
    },
    async states(): Promise<State[]> {
      const byUf = new Map<string, State>()
      for (const c of await cities()) {
        if (c.uf === OVERSEAS_UF) continue
        const s = byUf.get(c.uf) ?? { uf: c.uf, regiao: c.regiao, municipios: 0 }
        s.municipios++
        byUf.set(c.uf, s)
      }
      return [...byUf.values()].sort((a, b) => a.uf.localeCompare(b.uf))
    },
    async turnout(q): Promise<Turnout[]> {
      return pick(turnout, turnoutIdx, q)
    },
    async votes(q): Promise<Vote[]> {
      return pick(votes, votesIdx, q)
    },
    async candidates(q): Promise<Candidate[]> {
      return (await candidates()).filter((r) => (q?.ano === undefined || q.ano === r.ano) && (q?.turno === undefined || q.turno === r.turno))
    },
    manifest,
  }
}
