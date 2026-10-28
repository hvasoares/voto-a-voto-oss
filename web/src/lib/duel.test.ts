import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { createStore } from '@/data'
import { diskSource } from '@/data/node'
import { buildBrasil, pctText } from './brasil'
import { duelContent } from './duel-content'
import { duelData, loadDuelData } from './duel-data'
import {
  LEVELS,
  MEASURES,
  buildMeasures,
  cityPlace,
  duelQuery,
  higherOf,
  parseDuelAddress,
  regionPlace,
  statePlace,
  switchLevel,
  type DuelAddress,
  type DuelData,
  type DuelPlace,
} from './duel-model'
import { computeMargins } from './margins'
import { duelAlt, measureLabel } from './sentences/duel'
import { loadCityShard } from './shard-files'

const hasReal = existsSync(resolve('../data/votes.csv'))
let data: DuelData
beforeAll(async () => {
  data = await loadDuelData()
})

/** The figures of the Sketch frames "19 Cara a cara, por estado / por região" (desktop): São Paulo x Minas Gerais, Sudeste x Nordeste. */
const sp = statePlace({ uf: 'sp', votedTenths: 789, margin2: 7.7, swing: 6.0 })
const mg = statePlace({ uf: 'mg', votedTenths: 765, margin2: -0.9, swing: 5.8 })
const sudeste = regionPlace({ regiao: 'sudeste', turnedOutTenths: 797, shareTenths: 411, votosA: 4_300_000, votosB: 4_800_000 })
const nordeste = regionPlace({ regiao: 'nordeste', turnedOutTenths: 835, shareTenths: 285, votosA: 8_200_000, votosB: 3_700_000 })
const marked = (level: Parameters<typeof buildMeasures>[0], a?: DuelPlace, b?: DuelPlace) => Object.fromEntries(buildMeasures(level, a, b).map((m) => [m.key, m.higher ?? null]))

describe('the address carries the level, the two places and the mode, and reproduces the card', () => {
  const cases: [string, DuelAddress][] = [
    ['?nivel=cidade&a=rj/cidade-exemplo&b=sp/cidade-exemplo-paulista', { level: 'cidade', a: 'rj/cidade-exemplo', b: 'sp/cidade-exemplo-paulista' }],
    ['?nivel=estado&a=sp&b=mg', { level: 'estado', a: 'sp', b: 'mg' }],
    ['?nivel=regiao&a=sudeste&b=centro-oeste', { level: 'regiao', a: 'sudeste', b: 'centro-oeste' }],
    ['?nivel=estado&a=sp&b=mg&modo=duelo', { level: 'estado', a: 'sp', b: 'mg', mode: 'duelo' }],
    ['?nivel=regiao&a=sul&b=norte&modo=duelo', { level: 'regiao', a: 'sul', b: 'norte', mode: 'duelo' }],
    ['?nivel=cidade&a=rj/cidade-exemplo&resposta=1', { level: 'cidade', a: 'rj/cidade-exemplo', reply: true }],
  ]
  it.each(cases)('%s round-trips', (query, address) => {
    expect(parseDuelAddress(query)).toEqual({ address, problems: [] })
    expect(duelQuery(address)).toBe(query)
  })
  it('an address without a level is the city level; an unknown level too', () => {
    expect(parseDuelAddress('').address).toEqual({ level: 'cidade' })
    expect(parseDuelAddress('?nivel=pais&a=rj/x').address).toEqual({ level: 'cidade', a: 'rj/x' })
    expect(duelQuery({ level: 'regiao' })).toBe('?nivel=regiao')
  })
  it('a place of the wrong shape for the level is dropped and reported, never an error', () => {
    expect(parseDuelAddress('?nivel=estado&a=rj/cidade-exemplo&b=SP')).toEqual({ address: { level: 'estado' }, problems: [{ side: 'a', kind: 'invalid' }, { side: 'b', kind: 'invalid' }] })
    expect(parseDuelAddress('?nivel=cidade&a=../../x&b=sp').problems).toHaveLength(2)
    expect(parseDuelAddress('?nivel=regiao&a=atlantida').problems).toEqual([{ side: 'a', kind: 'invalid' }])
    expect(() => parseDuelAddress('?a=%E0%A4%A')).not.toThrow()
  })
  it('overseas posts are never a state or a region (a city, they are)', () => {
    expect(parseDuelAddress('?nivel=estado&a=zz&b=sp')).toEqual({ address: { level: 'estado', b: 'sp' }, problems: [{ side: 'a', kind: 'overseas' }] })
    expect(parseDuelAddress('?nivel=regiao&b=exterior').problems).toEqual([{ side: 'b', kind: 'overseas' }])
    expect(parseDuelAddress('?nivel=cidade&a=zz/exterior-exemplo').problems).toEqual([])
  })
  it('the reply flag only holds with a city in A and nothing in B', () => {
    expect(parseDuelAddress('?nivel=cidade&a=rj/x&b=sp/y&resposta=1').address.reply).toBeUndefined()
    expect(parseDuelAddress('?nivel=estado&a=sp&resposta=1').address.reply).toBeUndefined()
    expect(parseDuelAddress('?nivel=cidade&resposta=1').address.reply).toBeUndefined()
  })
  it('switching the level resets the pair', () => {
    expect(switchLevel('estado')).toEqual({ level: 'estado' })
    expect(LEVELS.map((l) => duelQuery(switchLevel(l)))).toEqual(['?nivel=cidade', '?nivel=estado', '?nivel=regiao'])
  })
})

describe('the mark is the higher number of the measure, and nothing else', () => {
  it('state: the frame (SP x MG) marks SP on turnout, gap and swing, MG on the people who did not vote', () => {
    expect(marked('estado', sp, mg)).toEqual({ comparecimento: 'a', diferenca: 'a', viradaTurnos: 'a', naoVotaram: 'b' })
  })
  it('region: the frame (Sudeste x Nordeste) marks the higher of each, the share that did not turn out is the complement', () => {
    expect(marked('regiao', sudeste, nordeste)).toEqual({ comparecimento: 'b', naoCompareceram: 'a', diferenca: 'b', peso: 'a' })
  })
  it('the signed swing is compared as a number: +1,4 is higher than -3,2, and -0,5 higher than -2,0', () => {
    const swing = (s: number) => statePlace({ uf: 'rj', votedTenths: 700, margin2: 1, swing: s })
    expect(buildMeasures('estado', swing(1.4), swing(-3.2)).find((m) => m.key === 'viradaTurnos')!.higher).toBe('a')
    expect(buildMeasures('estado', swing(-2), swing(-0.5)).find((m) => m.key === 'viradaTurnos')!.higher).toBe('b')
  })
  it('equal displayed values carry no mark, whatever the exact values behind them', () => {
    const a = statePlace({ uf: 'rj', votedTenths: 700, margin2: 4.041, swing: 1 })
    const b = statePlace({ uf: 'sp', votedTenths: 700, margin2: -4.049, swing: 1 })
    expect(marked('estado', a, b)).toEqual({ comparecimento: null, diferenca: null, viradaTurnos: null, naoVotaram: null })
    expect(higherOf(5, 5)).toBeUndefined()
  })
  it('a missing value, or a missing place, carries no mark and reads "—"', () => {
    expect(higherOf(undefined, 3)).toBeUndefined()
    const rows = buildMeasures('estado', sp, undefined)
    expect(rows.every((m) => m.higher === undefined && m.b.text === '—')).toBe(true)
  })
  it('every level has four measures, the ones of the ticket', () => {
    expect(MEASURES.cidade).toEqual(['comparecimento', 'margem', 'virada', 'naoVotaram'])
    expect(MEASURES.estado).toEqual(['comparecimento', 'diferenca', 'viradaTurnos', 'naoVotaram'])
    expect(MEASURES.regiao).toEqual(['comparecimento', 'naoCompareceram', 'diferenca', 'peso'])
  })
})

describe('the difference between the two candidates is unsigned and never names a side', () => {
  it('prints the gap without a sign, whichever way the margin points', () => {
    expect(statePlace({ uf: 'rj', votedTenths: 700, margin2: -13.24, swing: 0 }).figures.diferenca!.text).toBe('13,2 pp')
    expect(statePlace({ uf: 'rj', votedTenths: 700, margin2: 13.24, swing: 0 }).figures.diferenca!.text).toBe('13,2 pp')
    expect(sudeste.figures.diferenca!.text).toBe('5,5 pp')
  })
  it('its label, and the sentence about it, carry no candidate name', () => {
    const names = [data.pair.a.nome, data.pair.b.nome, 'LULA', 'FLAVIO BOLSONARO'].flatMap((n) => n.split(' ')).filter((w) => w.length > 2 && !/^candidato$/i.test(w))
    expect(measureLabel({}, 'diferenca', data)).not.toMatch(new RegExp(names.join('|'), 'i'))
    const rows = buildMeasures('regiao', sudeste, nordeste).filter((m) => m.key === 'diferenca')
    for (const register of ['standard', 'plain'] as const) {
      const alt = duelAlt('regiao', sudeste, nordeste, rows, data, { register })
      expect(alt).not.toMatch(new RegExp(names.join('|'), 'i'))
      expect(alt.toLowerCase()).toContain('diferença')
    }
  })
  it('the signed swing is signed with a real minus', () => {
    expect(statePlace({ uf: 'rj', votedTenths: 700, margin2: 1, swing: -3.24 }).figures.viradaTurnos!.text).toBe('−3,2 pp')
    expect(statePlace({ uf: 'rj', votedTenths: 700, margin2: 1, swing: 6.04 }).figures.viradaTurnos!.text).toBe('+6,0 pp')
    expect(statePlace({ uf: 'rj', votedTenths: 700, margin2: 1, swing: 0.01 }).figures.viradaTurnos!.text).toBe('0,0 pp')
  })
})

describe('cities, from their shards (fixture dataset)', () => {
  it('shows the card of the city: whole percents that add to 100, the votes between the two candidates, the swing since 2022', async () => {
    const place = cityPlace((await loadCityShard('rj', 'cidade-exemplo'))!, data)
    const f = place.figures
    expect(place.label).toBe('Cidade Exemplo · RJ')
    expect(Number.parseInt(f.comparecimento!.text) + Number.parseInt(f.naoVotaram!.text)).toBe(100)
    expect(f.margem!.text).toMatch(/^\d[\d.]*$/)
    expect(f.virada!.text).toMatch(/^[+−]?\d+,\d pp$/)
  })
  it('a city that has no 2nd round of the earlier cycle has no swing, and says so', async () => {
    const place = cityPlace((await loadCityShard('mt', 'boa-esperanca-do-norte'))!, data)
    expect(place.figures.virada).toEqual({ text: '—' })
    expect(place.missingPrev).toBe(true)
    expect(place.figures.comparecimento!.rank).toBeGreaterThan(0)
  })
  it('a city with no 2nd round of the cycle is a missing cycle, with no figure', async () => {
    const shard = structuredClone((await loadCityShard('rj', 'cidade-exemplo'))!)
    delete shard.cycles['2026']!['2']
    const place = cityPlace(shard, data)
    expect(place.missingCycle).toBe(true)
    expect(place.figures).toEqual({})
  })
  it('an overseas post is a city with its own figures', async () => {
    const place = cityPlace((await loadCityShard('zz', 'exterior-exemplo'))!, data)
    expect(place.label).toBe('Exterior (posto exemplo) · Exterior')
    expect(place.figures.comparecimento).toBeDefined()
  })
})

describe('states and regions equal the figures of #11 and #10 (fixture dataset)', () => {
  it('no overseas post is a state or a region', () => {
    expect(data.states.map((s) => s.uf)).toEqual(['mt', 'rj', 'sp'])
    expect(data.regions.map((r) => r.regiao)).toEqual(['centro-oeste', 'sudeste'])
  })
  it("the swing and the margin are the state map's, from the unrounded shares", async () => {
    const store = createStore(diskSource(resolve('fixtures/data')))
    const margins = computeMargins({ ano: data.ano, turnout: await store.turnout(), votes: await store.votes(), candidates: await store.candidates() })
    for (const m of margins.states) {
      const row = data.states.find((s) => s.uf === m.uf)!
      expect(row.swing).toBe(m.swing)
      expect(row.margin2).toBe(m.margin2)
    }
    expect([data.pair.a.numero, data.pair.b.numero]).toEqual([margins.ladoA.numero, margins.ladoB.numero])
  })
})

describe.skipIf(!hasReal)('states and regions equal the figures of #11 and #10 (the real dataset: five states and all five regions)', () => {
  let real: DuelData
  let brasil: ReturnType<typeof buildBrasil>
  let margins: ReturnType<typeof computeMargins>
  beforeAll(async () => {
    const store = createStore(diskSource(resolve('../data')))
    const [states, turnout, votes, candidates] = await Promise.all([store.states(), store.turnout(), store.votes(), store.candidates()])
    real = duelData({ states, turnout, votes, candidates, ano: 2026 })
    brasil = buildBrasil({ ano: 2026, turno: 2, states, turnout, votes, candidates })
    margins = computeMargins({ ano: 2026, turnout, votes, candidates })
  }, 60_000)
  it('has 27 states and the five regions, no overseas', () => {
    expect(real.states).toHaveLength(27)
    expect(real.regions.map((r) => r.regiao)).toEqual(['centro-oeste', 'nordeste', 'norte', 'sudeste', 'sul'])
    expect(real.states.some((s) => s.uf === 'zz')).toBe(false)
  })
  it.each(['sp', 'rj', 'mg', 'ba', 'rs'])("state %s: the gap, the swing and the turnout are the state map's", (uf) => {
    const place = statePlace(real.states.find((s) => s.uf === uf)!)
    const m = margins.states.find((s) => s.uf === uf)!
    const tenths = (x: number) => Math.round(Math.abs(x) * 10)
    expect(place.figures.diferenca!.rank).toBe(tenths(m.margin2))
    expect(place.figures.viradaTurnos!.rank).toBe(Math.sign(m.swing) * tenths(m.swing) || 0)
    const sum = Number.parseFloat(place.figures.comparecimento!.text.replace(',', '.')) + Number.parseFloat(place.figures.naoVotaram!.text.replace(',', '.'))
    expect(sum).toBeCloseTo(100, 5)
  })
  it.each(['norte', 'nordeste', 'centro-oeste', 'sudeste', 'sul'])("region %s: turnout, the share that did not turn out and the weight are the Brasil page's", (regiao) => {
    const place = regionPlace(real.regions.find((r) => r.regiao === regiao)!)
    const page = brasil.regions.find((r) => r.regiao === regiao)!
    expect(place.figures.comparecimento!.text).toBe(`${page.compareceramText}%`)
    expect(place.figures.naoCompareceram!.text).toBe(`${page.naoText}%`)
    expect(place.figures.peso!.text).toBe(`${page.shareText}%`)
    // the gap, from the exact votes, is within a tenth of the difference of the two shares the page prints
    const [x, y] = page.candidates
    expect(Math.abs(place.figures.diferenca!.rank! - Math.abs(x!.pctScaled - y!.pctScaled))).toBeLessThanOrEqual(1)
  })
  it('the weights of the five regions add up to 100', () => {
    expect(real.regions.reduce((n, r) => n + r.shareTenths, 0)).toBe(1000)
    expect(pctText(real.regions[0]!.shareTenths, 1)).toMatch(/^\d+,\d$/)
  })
})

describe('the picture and the sentences', () => {
  const opts = { origin: 'https://votoavoto.exemplo.br', base: '/', fixture: true }
  it('the card of two states: the address reproduces it, the picture says the same numbers, its title is the sentence', () => {
    const c = duelContent('estado', sp, mg, data, opts)
    expect(c.url).toBe('https://votoavoto.exemplo.br/cara-a-cara/?nivel=estado&a=sp&b=mg')
    expect(c.address).toBe('votoavoto.exemplo.br/cara-a-cara')
    expect(c.svg).toContain('78,9%')
    expect(c.svg).toContain('0,9 pp')
    expect(c.svg).toContain(`<title>${c.variants.standard.alt}</title>`)
    expect(c.variants.standard.text).toBe(`${c.variants.standard.alt} ${c.url}`)
    expect(c.note).toContain('Virada')
  })
  it('the mark is in the picture as a bar and in the sentence as words, never only a colour', () => {
    const c = duelContent('regiao', sudeste, nordeste, data, opts)
    expect(c.variants.standard.alt).toMatch(/maior valor em Nordeste/)
    expect(c.svg.match(/<rect[^>]*height="6"/g)).toHaveLength(4)
  })
  it('neutral words in both registers: no winner, no cause, no better or worse', () => {
    for (const level of LEVELS) {
      const [a, b] = level === 'regiao' ? [sudeste, nordeste] : [sp, mg]
      for (const register of ['standard', 'plain'] as const) {
        const alt = duelAlt(level, a, b, buildMeasures(level, a, b), data, { register })
        expect(alt).not.toMatch(/vence|venceu|ganh|derrot|lider|melhor|pior|porque|devido|culpa|motivo|eleit[oa]\b/i)
      }
    }
  })
  it('a missing value is said, not drawn as a zero', () => {
    const alt = duelAlt('estado', sp, mg, buildMeasures('estado', sp, undefined).slice(0, 1), data)
    expect(alt).toContain('sem dado')
  })
})
