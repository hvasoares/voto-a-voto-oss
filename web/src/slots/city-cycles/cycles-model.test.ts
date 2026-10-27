import { describe, expect, it } from 'vitest'
import type { Candidate, Turno, Turnout, Vote } from '../../data'
import { buildCityResult } from '../../shared/city-model'
import { buildCycleBlock, noDataReason, notVotedText, orderedSides, parseTurno, sideText } from './cycles-model'

const turnout = (ano: number, turno: Turno, o: Partial<Turnout> = {}): Turnout => ({
  ano, turno, uf: 'xx', cdMunicipio: '1', aptos: 1000, comparecimento: 800, abstencoes: 200, brancos: 20, nulos: 30, anuladosApuSep: 0, validos: 750, ...o,
})
const cand = (ano: number, turno: Turno, numero: number, nome: string): Candidate => ({ ano, turno, candidatoNumero: numero, nomeUrna: nome, partido: 'P' })
const vote = (ano: number, turno: Turno, numero: number, votos: number): Vote => ({ ano, turno, uf: 'xx', cdMunicipio: '1', candidatoNumero: numero, votos })

/** A round-2 city: the lower number wins in 2018 and loses in 2022, the person behind a number changes by year. */
const candidates = [cand(2018, 2, 13, 'ALFA'), cand(2018, 2, 17, 'BETA'), cand(2022, 2, 13, 'GAMA'), cand(2022, 2, 22, 'DELTA')]
const result = (ano: number, lowVotes: number, highVotes: number) =>
  buildCityResult({ turnout: turnout(ano, 2, { validos: lowVotes + highVotes }), votes: [vote(ano, 2, ano === 2018 ? 17 : 22, highVotes), vote(ano, 2, 13, lowVotes)], candidates })

describe('parseTurno', () => {
  it.each([['turno=1', 1], ['turno=2', 2], ['', 2], ['turno=3', 2], ['turno=abc', 2], ['turno=', 2]])('%s -> round %s (real data defaults to round 2)', (q, want) => {
    expect(parseTurno(new URLSearchParams(q))).toBe(want)
  })
})

describe('orderedSides: stable side order by ballot number', () => {
  it('puts the lower number on the left even when it loses, in every cycle', () => {
    const lowWins = orderedSides(result(2018, 600, 150))
    const lowLoses = orderedSides(result(2022, 150, 600))
    expect(lowWins.map((s) => s.numero)).toEqual([13, 17])
    expect(lowLoses.map((s) => s.numero)).toEqual([13, 22])
    expect(lowWins[0]!.pct).toBe(80)
    expect(lowLoses[0]!.pct).toBe(20)
  })

  it('names the candidate by cycle and number, never by number alone', () => {
    expect(orderedSides(result(2018, 600, 150)).map((s) => s.label)).toEqual(['Alfa', 'Beta'])
    expect(orderedSides(result(2022, 150, 600)).map((s) => s.label)).toEqual(['Gama', 'Delta'])
  })

  it('left is the dark segment kind "a", right is "b"', () => {
    expect(orderedSides(result(2022, 150, 600)).map((s) => s.key)).toEqual(['a', 'b'])
  })

  it('round 1: the two leaders by number, then "Outros" on the right, labelled by name', () => {
    const c1 = [cand(2022, 1, 12, 'UM'), cand(2022, 1, 13, 'DOIS'), cand(2022, 1, 22, 'TRES'), cand(2022, 1, 44, 'QUATRO')]
    const r = buildCityResult({
      turnout: turnout(2022, 1, { validos: 1000 }),
      votes: [vote(2022, 1, 22, 500), vote(2022, 1, 13, 300), vote(2022, 1, 12, 150), vote(2022, 1, 44, 50)],
      candidates: c1,
    })
    const sides = orderedSides(r)
    expect(sides.map((s) => s.key)).toEqual(['a', 'b', 'outros'])
    expect(sides.map((s) => s.numero)).toEqual([13, 22, undefined])
    expect(sides.map((s) => s.label)).toEqual(['Dois', 'Tres', 'Outros'])
    expect(sides.map((s) => s.pct)).toEqual([30, 50, 20])
  })

  it('displayed parts add up to 100 (shared largest remainder), also for awkward thirds', () => {
    const r = buildCityResult({ turnout: turnout(2018, 2, { validos: 3 }), votes: [vote(2018, 2, 13, 1), vote(2018, 2, 17, 2)], candidates })
    const sides = orderedSides(r)
    expect(sides.reduce((n, s) => n + s.pct, 0)).toBe(100)
  })

  it('a candidate with no votes in the city keeps the side and shows 0%', () => {
    const r = buildCityResult({ turnout: turnout(2018, 2, { validos: 100 }), votes: [vote(2018, 2, 17, 100)], candidates })
    expect(orderedSides(r).map((s) => [s.numero, s.pct])).toEqual([[13, 0], [17, 100]])
  })
})

describe('buildCycleBlock', () => {
  const city = { ciclos: [2018, 2022, 2026] }

  it('a cycle with data carries both bars; voted + not voted = 100 and each bar adds to 100', () => {
    const b = buildCycleBlock({ ano: 2018, turno: 2, city, result: result(2018, 600, 150) })
    expect(b.status).toBe('data')
    if (b.status !== 'data') return
    expect(b.votedPct + b.notVotedPct).toBe(100)
    expect(b.sides.reduce((n, s) => n + s.pct, 0)).toBe(100)
    expect(b.notVoted.reduce((n, s) => n + s.pct, 0)).toBe(100)
    expect(b.notVoted.map((s) => s.key)).toEqual(['abstencao', 'brancos', 'nulos'])
  })

  it('no result: a no-data block, never zeros', () => {
    const b = buildCycleBlock({ ano: 2018, turno: 2, city: { ciclos: [2026] }, result: undefined })
    expect(b).toEqual({ status: 'no-data', ano: 2018, turno: 2, reason: 'Este município só tem dados a partir de 2026.' })
  })

  it('an electorate of zero is also no data', () => {
    const r = buildCityResult({ turnout: turnout(2018, 2, { aptos: 0, comparecimento: 0, abstencoes: 0, brancos: 0, nulos: 0, validos: 0 }), votes: [], candidates })
    expect(buildCycleBlock({ ano: 2018, turno: 2, city, result: r }).status).toBe('no-data')
  })

  it('zero turnout with an electorate is data: 0% voted, not zero-filled bars', () => {
    const r = buildCityResult({ turnout: turnout(2018, 2, { comparecimento: 0, abstencoes: 1000, brancos: 0, nulos: 0, validos: 0 }), votes: [], candidates })
    const b = buildCycleBlock({ ano: 2018, turno: 2, city, result: r })
    expect(b.status).toBe('data')
    if (b.status !== 'data') return
    expect([b.votedPct, b.notVotedPct, b.validos]).toEqual([0, 100, 0])
  })
})

describe('noDataReason', () => {
  it('city only from a later cycle', () => expect(noDataReason([2026], 2022, 2)).toBe('Este município só tem dados a partir de 2026.'))
  it('cycle exists but this round has no result', () => expect(noDataReason([2018, 2022], 2022, 1)).toBe('Não há resultado deste município no 1º turno de 2022.'))
  it('no cycles at all', () => expect(noDataReason([], 2018, 2)).toBe('Não há resultado deste município no 2º turno de 2018.'))
})

describe('sideText: the text that fits the segment', () => {
  const side = (label: string, pct: number, key: 'a' | 'b' | 'outros' = 'a') => ({ key, label, votos: 1, pct })
  it('name and percent in a wide segment', () => expect(sideText(side('Lula', 55))).toBe('Lula 55%'))
  it('percent only when the name does not fit', () => expect(sideText(side('Flavio Bolsonaro', 20))).toBe('20%'))
  it('first name when the full name does not fit but the first does', () => expect(sideText(side('Flavio Bolsonaro', 40))).toBe('Flavio 40%'))
  it('nothing in a sliver', () => expect(sideText(side('Lula', 3))).toBe(''))
  it('"Candidato A" is shown as the frame does: "A 55%"', () => expect(sideText(side('Candidato A', 55))).toBe('A 55%'))
})

describe('notVotedText: compact, the heading already says "% dos que não votaram"', () => {
  it.each([
    ['abstencao', 82, 'Abstenção 82%'],
    ['abstencao', 25, 'Abstenção'],
    ['abstencao', 10, 'Ab'],
    ['brancos', 6, 'Br'],
    ['nulos', 9, 'Nu'],
    ['brancos', 40, 'Brancos 40%'],
    ['nulos', 5, ''],
  ] as const)('%s at %s%% -> %j', (key, pct, want) => expect(notVotedText(key, pct)).toBe(want))
})
