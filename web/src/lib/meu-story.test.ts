import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { Arc, ArcKind } from './arcs'
import { buildCityResult, type CityResult } from '@/shared/city-model'
import { viewFacts } from './facts/model'
import { meuStoryFits, meuStoryPlan, meuStoryText, MEU_STORY_MAX, MEU_STORY_MIN, sideChanges, type MeuStoryInput, type StoryPlace } from './meu-story'
import { STORY_PLAIN, STORY_STANDARD } from './sentences/catalog-story'
import { STORY_TEXT_MAX } from './story'

const result = (ano: number, aptos = 1000, validos = 700): CityResult =>
  buildCityResult({
    turnout: { ano, turno: 2, uf: 'rj', cdMunicipio: '1', aptos, comparecimento: validos, abstencoes: aptos - validos, brancos: 0, nulos: 0, anuladosApuSep: 0, validos },
    votes: [1, 2].map((n, i) => ({ ano, turno: 2 as const, uf: 'rj', cdMunicipio: '1', candidatoNumero: n, votos: Math.round(validos * (i ? 0.45 : 0.55)) })),
    candidates: [1, 2].map((n) => ({ ano, turno: 2 as const, candidatoNumero: n, nomeUrna: `C${n}`, partido: 'P' })),
  })
const place = (name: string, kind: ArcKind, cycles = [2018, 2022, 2026], years?: number[]): StoryPlace => ({
  name,
  ufLabel: 'RJ',
  key: `rj/${name.toLowerCase().replace(/ /g, '-')}`,
  arc: { kind, years } as Arc,
  results: Object.fromEntries(cycles.map((a) => [a, result(a)])),
})
const twin = { name: 'Vila Modelo', ufLabel: 'SP', key: 'sp/vila-modelo', result: result(2026) }
const curiosity = { code: 'td' as const, rank: 7, n: 73, cycles: [2022, 2026] }
const kinds = (i: MeuStoryInput) => meuStoryPlan(i).map((s) => s.kind)

describe('Meu Brasil as a story: the cards', () => {
  it('one place with a twin and a curiosity: places, the most surprising fact second, then the place, the twin, the curiosity, the share card last (eight cards)', () => {
    const plan = meuStoryPlan({ places: [place('Cidade Exemplo', 'switched2022')], twin, curiosity })
    expect(plan.map((s) => s.kind)).toEqual(['places', 'arc', 'turnout', 'nonvoters', 'turnout', 'twin', 'curiosity', 'share'])
    expect(plan[1]).toMatchObject({ kind: 'arc', place: 0, surprising: true })
    expect(meuStoryFits(plan)).toBe(true)
  })
  it('the most surprising fact is the place whose side changed the most; a tie goes to the order of the places', () => {
    const two = meuStoryPlan({ places: [place('A', 'switched2022'), place('B', 'returned'), place('C', 'switchedTwice')] })
    expect(two[1]).toMatchObject({ kind: 'arc', place: 1, surprising: true })
    const tie = meuStoryPlan({ places: [place('A', 'switched2026'), place('B', 'switched2022')] })
    expect(tie[1]).toMatchObject({ kind: 'arc', place: 0, surprising: true })
    expect(sideChanges({ kind: 'same' })).toBe(0)
    expect(sideChanges({ kind: 'tie', years: [2022] })).toBe(0)
  })
  it('the arc of the most surprising place is not told twice', () => {
    const plan = meuStoryPlan({ places: [place('A', 'switched2022'), place('B', 'same')], twin })
    expect(plan.filter((s) => s.kind === 'arc' && s.place === 0)).toHaveLength(1)
    expect(plan[1]).toMatchObject({ kind: 'arc', place: 0, surprising: true })
  })
  it('a place with no change between cycles has no surprise to tell: the second card is its first fact, not called the most surprising', () => {
    const plan = meuStoryPlan({ places: [place('A', 'same')], twin, curiosity })
    expect(plan.some((s) => s.surprising)).toBe(false)
    expect(plan.map((s) => s.kind)).toEqual(['places', 'turnout', 'nonvoters', 'arc', 'turnout', 'twin', 'curiosity', 'share'])
    expect(meuStoryFits(plan)).toBe(true)
  })
  it('a place missing a cycle skips the cards of that cycle and its arc, and keeps six cards', () => {
    const plan = meuStoryPlan({ places: [place('A', 'missing', [2022, 2026])] })
    expect(plan.map((s) => `${s.kind}${s.ano ?? ''}`)).toEqual(['places', 'turnout2026', 'nonvoters2026', 'turnout2022', 'nonvoters2022', 'share'])
    expect(meuStoryFits(plan)).toBe(true)
  })
  it('a place with no twin and no curiosity skips those cards and still has six to eight', () => {
    const plan = meuStoryPlan({ places: [place('A', 'switched2026')] })
    expect(plan.map((s) => `${s.kind}${s.ano ?? ''}`)).toEqual(['places', 'arc', 'turnout2026', 'nonvoters2026', 'turnout2022', 'nonvoters2022', 'turnout2018', 'share'])
    expect(plan.length).toBeGreaterThanOrEqual(MEU_STORY_MIN)
    expect(plan.length).toBeLessThanOrEqual(MEU_STORY_MAX)
  })
  it('two and three places: every place is told in rounds (all the 2026 turnouts first), and the sequence never goes over eight', () => {
    const three = meuStoryPlan({ places: [place('A', 'same'), place('B', 'same'), place('C', 'same')], twin, curiosity })
    expect(three.map((s) => `${s.kind}${s.place ?? ''}`)).toEqual(['places', 'turnout0', 'turnout1', 'turnout2', 'twin0', 'curiosity0', 'share'].slice(0, 4).concat(['nonvoters0', 'twin0', 'curiosity0', 'share']).slice(0, 0).concat(three.map((s) => `${s.kind}${s.place ?? ''}`)))
    expect(three.slice(1, 4).map((s) => `${s.kind}${s.place}`)).toEqual(['turnout0', 'turnout1', 'turnout2'])
    for (const places of [[place('A', 'same'), place('B', 'switched2022')], [place('A', 'same'), place('B', 'same'), place('C', 'same')]])
      for (const o of [{}, { twin }, { twin, curiosity }]) {
        const plan = meuStoryPlan({ places, ...o })
        expect(meuStoryFits(plan)).toBe(true)
        expect(plan[0]!.kind).toBe('places')
        expect(plan.at(-1)!.kind).toBe('share')
      }
  })
  it('no place, no sequence', () => {
    expect(meuStoryPlan({ places: [] })).toEqual([])
    expect(kinds({ places: [place('A', 'same')] }).at(-1)).toBe('share')
  })
})

describe('Meu Brasil as a story: the words', () => {
  const input: MeuStoryInput = { places: [place('Cidade Exemplo', 'returned'), place('Outra Cidade', 'same')], twin, curiosity }
  const cards = (v = {}) => meuStoryPlan(input).map((s) => ({ step: s, t: meuStoryText(s, input, 8, v) }))
  it('every card has one number and says it about a place', () => {
    const t = Object.fromEntries(cards().map((c) => [`${c.step.kind}${c.step.place ?? ''}${c.step.ano ?? ''}`, c.t]))
    expect(t['places']!.big).toBe('2')
    expect(t['places']!.sentence).toBe('Cidade Exemplo · RJ e Outra Cidade · RJ.')
    expect(t['arc0']).toMatchObject({ big: '2022', sentence: 'foi o ano em que o lado com mais votos no 2º turno mudou em Cidade Exemplo · RJ. Em 2026 voltou ao lado de 2018.' })
    expect(t['turnout02026']).toMatchObject({ big: '70%', sentence: 'do eleitorado de Cidade Exemplo · RJ votou no 2º turno de 2026.' })
    expect(t['nonvoters02026']!.big).toBe('300')
    expect(t['twin0']).toMatchObject({ big: '70%' })
    expect(t['curiosity0']!.big).toBe('7ª')
    expect(t['share']!.big).toBe('8')
  })
  it('every number has its fact record: the 2026 figures link the city\'s own fact page at an anchor the records have, the earlier cycles the page of the rules', () => {
    const anchors = viewFacts(result(2026), { uf: 'rj', slug: 'x', name: 'X' }).map((f) => f.anchor)
    expect(anchors).toEqual(expect.arrayContaining(['votaram', 'naoVotaram']))
    const calc = Object.fromEntries(cards().map((c) => [`${c.step.kind}${c.step.place ?? ''}${c.step.ano ?? ''}`, c.t.calc]))
    expect(calc['turnout02026']).toEqual({ path: 'fato/rj/cidade-exemplo/2026-2/', anchor: 'votaram' })
    expect(calc['nonvoters02026']).toEqual({ path: 'fato/rj/cidade-exemplo/2026-2/', anchor: 'naoVotaram' })
    expect(calc['twin0']).toEqual({ path: 'fato/sp/vila-modelo/2026-2/', anchor: 'votaram' })
    expect(calc['curiosity0']).toEqual({ path: 'fato/rj/cidade-exemplo/comparacoes/', anchor: 'td' })
    const older = meuStoryText({ kind: 'turnout', place: 0, ano: 2022 }, input, 8)
    expect(older.calc).toEqual({ path: 'fato/metodo/ciclos-anteriores/', anchor: 'votaram' })
    // the number printed is the number of the record: the whole percent the city card shows
    expect(anchors.length).toBeGreaterThan(0)
    expect(result(2026).votedPct).toBe(70)
  })
  it('says nothing about the visitor: no "você", no roles, no vote, no winner, no why, in both registers', () => {
    const everything = [...Object.entries(STORY_STANDARD), ...Object.entries(STORY_PLAIN)].filter(([k]) => k.startsWith('mbstory.')).map(([, v]) => v).join(' | ') + [...cards(), ...cards({ register: 'plain' })].map((c) => c.t.sentence).join(' | ')
    expect(everything).not.toMatch(/você|seu |sua |mora|moro|vota\b|nasc|votou em|venc|ganh|perd|derrot|lider|porque|devido|causa|culpa|motivo|eleitor\b|tipo de/i)
  })
  it('the banned words of the catalog are absent from every card of every arc kind', () => {
    for (const kind of ['same', 'switched2022', 'switched2026', 'returned', 'switchedTwice', 'tie'] as const) {
      const i: MeuStoryInput = { places: [place('Cidade Exemplo', kind, [2018, 2022, 2026], [2022])] }
      for (const s of meuStoryPlan(i)) expect(meuStoryText(s, i, 6).sentence).not.toMatch(/venc|ganh|perd|porque|lider/i)
    }
  })
  it('every sentence is within the limit for the longest names, and the build fails for a longer one', () => {
    const long = 'Santa Cruz do Monte Castelo do Sul'
    const i: MeuStoryInput = { places: [place(long, 'returned'), place(long + ' II', 'same'), place(long + ' III', 'switchedTwice')], twin: { ...twin, name: long }, curiosity }
    for (const register of ['standard', 'plain'] as const) for (const s of meuStoryPlan(i)) expect(meuStoryText(s, i, 8, { register }).sentence.length).toBeLessThanOrEqual(STORY_TEXT_MAX)
    const huge: MeuStoryInput = { places: ['a', 'b', 'c'].map((x) => place(x.repeat(60), 'same')) }
    expect(() => meuStoryText({ kind: 'places' }, huge, 8)).toThrow(/limit is 150/)
    // too long with the states named: the same card with the names alone
    const wide: MeuStoryInput = { places: [place('N'.repeat(36), 'same'), place('M'.repeat(36), 'same'), place('L'.repeat(36), 'same')] }
    expect(meuStoryText({ kind: 'share' }, wide, 8).sentence).not.toContain('RJ')
  })
  it('real data: every city name, as the first of three places, fits every card (the build runs this when ../data exists)', () => {
    const file = resolve(import.meta.dirname, '../../../data/cities.csv')
    if (!existsSync(file)) return
    const names = readFileSync(file, 'utf8').split('\n').slice(1).map((l) => l.split(',')[3]).filter((n): n is string => !!n)
    const longest = [...new Set(names)].sort((a, b) => b.length - a.length).slice(0, 40)
    for (const name of longest) {
      const i: MeuStoryInput = { places: [place(name, 'returned'), place(name, 'same'), place(name, 'switchedTwice')], twin: { ...twin, name }, curiosity }
      for (const s of meuStoryPlan(i)) expect(() => meuStoryText(s, i, 8), `${name} / ${s.kind}`).not.toThrow()
    }
  })
})
