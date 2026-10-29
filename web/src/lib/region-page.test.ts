import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createNodeStore, diskSource } from '@/data/node'
import { createStore } from '@/data/store'
import type { Candidate, State, Turnout, Vote } from '@/data'
import { buildBrasil } from './brasil'
import { loadBrasil } from './brasil-load'
import { gateProblems } from './facts/gate'
import { regionFacts } from './facts/other'
import { computeMargins } from './margins'
import { buildRegionPages, loadRegionPages } from './region-page'
import { REGION_ORDER } from './regions'

/* The five region pages (#183): one page for each region the dataset has, in the order of the five regions, built from the same numbers as "Brasil e regiões". */

const REGIONS: Record<string, string[]> = { norte: ['pa'], nordeste: ['ba', 'pe'], 'centro-oeste': ['go'], sudeste: ['rj', 'sp'], sul: ['rs'] }
const STATES: State[] = Object.entries(REGIONS).flatMap(([regiao, ufs]) => ufs.map((uf) => ({ uf, regiao, municipios: 3 })))
const turnout = (uf: string, turno: 1 | 2): Turnout => ({ ano: 2026, turno, uf, cdMunicipio: `${uf}1`, aptos: 1000, comparecimento: 800, abstencoes: 200, brancos: 20, nulos: 30, anuladosApuSep: 0, validos: 750 })
const vote = (uf: string, turno: 1 | 2, numero: number, votos: number): Vote => ({ ano: 2026, turno, uf, cdMunicipio: `${uf}1`, candidatoNumero: numero, votos })
const CANDIDATES: Candidate[] = [13, 22].map((n) => ({ ano: 2026, turno: 2, candidatoNumero: n, nomeUrna: n === 13 ? 'LULA' : 'FLAVIO BOLSONARO', partido: 'X' }))
const rows = STATES.flatMap((s, i) => [1, 2].flatMap((t) => [vote(s.uf, t as 1 | 2, 13, 300 + 20 * i), vote(s.uf, t as 1 | 2, 22, 450 - 20 * i)]))
const turnouts = STATES.flatMap((s) => [turnout(s.uf, 1), turnout(s.uf, 2)])
const view = buildBrasil({ ano: 2026, turno: 2, states: STATES, turnout: turnouts, votes: rows, candidates: CANDIDATES })
const margins = computeMargins({ ano: 2026, turnout: turnouts, votes: rows, candidates: CANDIDATES })

describe('the region pages', () => {
  it('a dataset with the five regions builds exactly the five pages, in the display order', () => {
    expect(buildRegionPages(view, STATES, margins).map((p) => p.regiao)).toEqual([...REGION_ORDER])
  })

  it('a region the dataset has no data for has no page, and a state with no margin row fails the build', () => {
    expect(buildRegionPages({ ...view, regions: view.regions.filter((r) => r.regiao !== 'norte') }, STATES, margins).map((p) => p.regiao)).not.toContain('norte')
    expect(() => buildRegionPages(view, [...STATES, { uf: 'sc', regiao: 'sul', municipios: 1 }], margins)).toThrow(/sc has no margin row/)
  })

  it('a page lists the states of its region only, by valid votes, and counts states and municipalities', () => {
    const nordeste = buildRegionPages(view, STATES, margins).find((p) => p.regiao === 'nordeste')!
    expect(nordeste.states.map((s) => s.uf).sort()).toEqual(['ba', 'pe'])
    expect(nordeste.municipios).toBe(6)
    expect(nordeste.region.candidates.map((c) => c.numero)).toEqual([13, 22])
  })

  it('the fixture build has a page for every region it has numbers for, the same ones "Brasil e regiões" lists', async () => {
    const pages = await loadRegionPages()
    expect(pages.map((p) => p.regiao).sort()).toEqual((await loadBrasil()).regions.map((r) => r.regiao).sort())
    expect((await createNodeStore().states()).every((s) => pages.some((p) => p.states.some((r) => r.uf === s.uf)))).toBe(true)
  })
})

describe('the facts of a region page', () => {
  const page = buildRegionPages(view, STATES, margins).find((p) => p.regiao === 'sudeste')!
  const facts = regionFacts(page, true)

  it('give every printed number a record that passes the gate: the two shares, the two counts and one record per state row', () => {
    expect(gateProblems(facts.facts)).toEqual([])
    expect(facts.facts.map((f) => f.anchor)).toEqual(['13', '22', 'estados', 'municipios', 'estado-sp', 'estado-rj'].sort((a, b) => facts.facts.findIndex((f) => f.anchor === a) - facts.facts.findIndex((f) => f.anchor === b)))
    expect(facts.facts).toHaveLength(2 + 2 + page.states.length)
  })

  it('say it in both registers, count cities and votes and never rank or give a reason', () => {
    const text = facts.facts.flatMap((f) => [f.sentences.standard, f.sentences.plain]).join(' ').toLowerCase()
    expect(text).not.toMatch(/vence|venceu|ganhou|derrot|porque|por causa|culpa|devido|ranking/)
    expect(facts.facts.every((f) => f.sentences.standard && f.sentences.plain)).toBe(true)
  })

  it('belong to the region page and its round, checked against the municipalities', () => {
    expect(facts.scope).toBe('regiao/sudeste')
    expect(facts.back.path).toBe('brasil/sudeste/')
    expect(facts.rounds).toEqual([{ ano: 2026, turno: 2 }])
    expect(facts.facts.every((f) => f.checks?.includes('municipios'))).toBe(true)
  })
})

describe('the real dataset (../data)', () => {
  const realData = resolve('..', 'data')
  const hasReal = existsSync(resolve(realData, 'manifest.json'))

  it.runIf(hasReal)('builds all five region pages, each with every state of its region (a missing region fails here)', async () => {
    const store = createStore(diskSource(realData))
    const [states, turnout, votes, candidates] = await Promise.all([store.states(), store.turnout(), store.votes(), store.candidates()])
    const inRound = <T extends { ano: number; turno: number }>(list: T[]) => list.filter((r) => r.ano === 2026 && r.turno === 2)
    const real = buildBrasil({ ano: 2026, turno: 2, states, turnout: inRound(turnout), votes: inRound(votes), candidates: inRound(candidates) })
    const pages = buildRegionPages(real, states, computeMargins({ ano: 2026, turnout, votes, candidates }))
    expect(pages.map((p) => p.regiao)).toEqual([...REGION_ORDER])
    expect(pages.flatMap((p) => p.states.map((s) => s.uf)).sort()).toEqual(states.map((s) => s.uf).sort())
    expect(pages.flatMap((p) => gateProblems(regionFacts(p, false).facts))).toEqual([])
  }, 60_000)
})
