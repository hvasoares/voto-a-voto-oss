import { describe, expect, it } from 'vitest'
import type { Candidate, Turnout, Vote } from '../data'
import { buildCityResult, formatInt, formatPct, largestRemainder } from './city-model'
import { loadCityResult } from './city-figures'
import { testContext } from './test-context'

const turnout = (o: Partial<Turnout> = {}): Turnout => ({
  ano: 2026, turno: 1, uf: 'rj', cdMunicipio: '1',
  aptos: 100, comparecimento: 80, abstencoes: 20, brancos: 5, nulos: 5, anuladosApuSep: 0, validos: 70, ...o,
})
const cand = (numero: number, nome: string, o: Partial<Candidate> = {}): Candidate => ({ ano: 2026, turno: 1, candidatoNumero: numero, nomeUrna: nome, partido: 'P', ...o })
const vote = (numero: number, votos: number, o: Partial<Vote> = {}): Vote => ({ ano: 2026, turno: 1, uf: 'rj', cdMunicipio: '1', candidatoNumero: numero, votos, ...o })
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

describe('largestRemainder: displayed parts add up to exactly the total', () => {
  it('gives the extra points to the largest remainders', () => {
    expect(largestRemainder([1, 1, 1])).toEqual([34, 33, 33])
    expect(largestRemainder([52.4, 47.6])).toEqual([52, 48])
    expect(largestRemainder([78, 10, 12])).toEqual([78, 10, 12])
    expect(largestRemainder([501, 499])).toEqual([50, 50])
    expect(largestRemainder([4, 3, 3, 0].map((n) => n * 7))).toEqual([40, 30, 30, 0])
  })
  it('returns zeros when there is nothing to split', () => {
    expect(largestRemainder([0, 0, 0])).toEqual([0, 0, 0])
    expect(largestRemainder([])).toEqual([])
  })
  it('always adds up to 100, never gives a part more than its ceiling or less than its floor', () => {
    let seed = 7
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
    for (let i = 0; i < 500; i++) {
      const parts = Array.from({ length: 1 + Math.floor(rnd() * 14) }, () => Math.floor(rnd() * rnd() * 100000))
      const total = sum(parts)
      const out = largestRemainder(parts)
      expect(sum(out)).toBe(total === 0 ? 0 : 100)
      out.forEach((p, k) => {
        const exact = total === 0 ? 0 : (parts[k]! / total) * 100
        expect(p).toBeGreaterThanOrEqual(Math.floor(exact + 1e-9))
        expect(p).toBeLessThanOrEqual(Math.ceil(exact - 1e-9))
      })
    }
  })
})

describe('pt-BR formatting', () => {
  it('uses dots for thousands', () => {
    expect(formatInt(36400)).toBe('36.400')
    expect(formatInt(999)).toBe('999')
    expect(formatInt(9145969)).toBe('9.145.969')
    expect(formatInt(0)).toBe('0')
  })
  it('shows one decimal with a comma and drops a trailing zero', () => {
    expect(formatPct(33.6)).toBe('33,6%')
    expect(formatPct(30)).toBe('30%')
    expect(formatPct(30.04)).toBe('30%')
    expect(formatPct(0)).toBe('0%')
    expect(formatPct(100)).toBe('100%')
  })
  it('never rounds a non-zero part to 0% or a partial one to 100%', () => {
    expect(formatPct(0.04)).toBe('menos de 0,1%')
    expect(formatPct(99.96)).toBe('mais de 99,9%')
  })
})

describe('buildCityResult', () => {
  it('large city, round 2: voted = valid votes over the electorate, shares of valid votes', () => {
    const r = buildCityResult({
      turnout: turnout({ turno: 2, aptos: 9145969, comparecimento: 7284071, abstencoes: 1861898, brancos: 104890, nulos: 216904, validos: 6962277 }),
      votes: [vote(13, 3864354, { turno: 2 }), vote(22, 3097923, { turno: 2 })],
      candidates: [cand(13, 'LULA', { turno: 2 }), cand(22, 'FLAVIO BOLSONARO', { turno: 2 })],
    })
    expect(r.votedPct + r.notVotedPct).toBe(100)
    expect(r.votedPct).toBe(76)
    expect(r.naoVotaram).toBe(9145969 - 6962277)
    expect(r.voted.map((s) => [s.label, s.votos, s.pct])).toEqual([['Lula', 3864354, 56], ['Flavio Bolsonaro', 3097923, 44]])
    expect(r.notVoted.map((s) => s.votos)).toEqual([1861898, 104890, 216904])
    expect(sum(r.notVoted.map((s) => s.pct))).toBe(100)
    expect(r.outrosCount).toBe(0)
  })

  it('round 1: two leaders plus "Outros candidatos (N)", shares add up to 100% of valid votes', () => {
    const names = ['A', 'B', 'C', 'D', 'E']
    const r = buildCityResult({
      turnout: turnout({ validos: 70 }),
      votes: [vote(1, 10), vote(2, 30), vote(3, 20), vote(4, 7), vote(5, 3)],
      candidates: names.map((n, i) => cand(i + 1, `CAND ${n}`)),
    })
    expect(r.voted.map((s) => [s.key, s.label, s.votos])).toEqual([
      ['a', 'Cand B', 30], ['b', 'Cand C', 20], ['outros', 'Outros candidatos (3)', 20],
    ])
    expect(sum(r.voted.map((s) => s.pct))).toBe(100)
    expect(r.outrosCount).toBe(3)
  })

  it('names come from the candidate of that year, round and number', () => {
    const base = { turnout: turnout({ ano: 2018 }), votes: [vote(13, 40, { ano: 2018 }), vote(22, 30, { ano: 2018 })] }
    const old = buildCityResult({ ...base, candidates: [cand(13, 'FERNANDO HADDAD', { ano: 2018 }), cand(22, 'FULANO', { ano: 2018 }), cand(13, 'LULA', { ano: 2022 }), cand(22, 'JAIR BOLSONARO', { ano: 2022 })] })
    expect(old.voted.map((s) => s.label)).toEqual(['Fernando Haddad', 'Fulano'])
    const other = buildCityResult({ ...base, turnout: turnout({ ano: 2022 }), votes: [vote(13, 40, { ano: 2022 }), vote(22, 30, { ano: 2022 })], candidates: [cand(13, 'FERNANDO HADDAD', { ano: 2018 }), cand(13, 'LULA', { ano: 2022 }), cand(22, 'JAIR BOLSONARO', { ano: 2022 })] })
    expect(other.voted.map((s) => s.label)).toEqual(['Lula', 'Jair Bolsonaro'])
  })

  it('a number with no candidate record is labelled by number, never by another year\'s name', () => {
    const r = buildCityResult({ turnout: turnout(), votes: [vote(99, 40), vote(98, 30)], candidates: [] })
    expect(r.voted.map((s) => s.label)).toEqual(['Candidato nº 99', 'Candidato nº 98'])
  })

  it('a tie is ordered by candidate number so the page never depends on file order', () => {
    const r = buildCityResult({ turnout: turnout(), votes: [vote(22, 35), vote(13, 35)], candidates: [cand(13, 'LULA'), cand(22, 'OUTRO')] })
    expect(r.voted.map((s) => s.label)).toEqual(['Lula', 'Outro'])
    expect(r.voted.map((s) => s.pct)).toEqual([50, 50])
  })

  it('counts anulados em apuracao separada with the nulos and keeps the not-voted parts adding up to 100', () => {
    const r = buildCityResult({
      turnout: turnout({ aptos: 100, comparecimento: 80, abstencoes: 20, brancos: 4, nulos: 3, anuladosApuSep: 3, validos: 70 }),
      votes: [vote(1, 40), vote(2, 30)], candidates: [cand(1, 'A'), cand(2, 'B')],
    })
    expect(r.notVoted.map((s) => [s.key, s.votos])).toEqual([['abstencao', 20], ['brancos', 4], ['nulos', 6]])
    expect(sum(r.notVoted.map((s) => s.pct))).toBe(100)
    expect(r.votedPct + r.notVotedPct).toBe(100)
  })

  it('tiny city: parts still add up and nothing is NaN', () => {
    const r = buildCityResult({
      turnout: turnout({ aptos: 3, comparecimento: 2, abstencoes: 1, brancos: 0, nulos: 1, validos: 1 }),
      votes: [vote(1, 1), vote(2, 0)], candidates: [cand(1, 'A'), cand(2, 'B')],
    })
    expect([r.votedPct, r.notVotedPct]).toEqual([33, 67])
    expect(r.voted.map((s) => s.pct)).toEqual([100, 0])
    expect(r.notVoted.map((s) => s.pct)).toEqual([50, 0, 50])
  })

  it('zero-turnout post: the whole electorate did not vote and counts as abstention (the file reports 0 abstentions there)', () => {
    const r = buildCityResult({
      turnout: turnout({ aptos: 195, comparecimento: 0, abstencoes: 0, brancos: 0, nulos: 0, validos: 0 }),
      votes: [], candidates: [cand(1, 'A'), cand(2, 'B')],
    })
    expect([r.votedPct, r.notVotedPct, r.naoVotaram]).toEqual([0, 100, 195])
    expect(r.notVoted.map((s) => [s.key, s.votos, s.pct])).toEqual([['abstencao', 195, 100], ['brancos', 0, 0], ['nulos', 0, 0]])
    expect(r.voted.map((s) => [s.votos, s.pct])).toEqual([[0, 0], [0, 0]])
  })

  it('zero valid votes with people who turned out: all of them blank or null', () => {
    const r = buildCityResult({ turnout: turnout({ aptos: 10, comparecimento: 4, abstencoes: 6, brancos: 1, nulos: 3, validos: 0 }), votes: [], candidates: [cand(1, 'A'), cand(2, 'B')] })
    expect([r.votedPct, r.notVotedPct]).toEqual([0, 100])
    expect(r.notVoted.map((s) => s.votos)).toEqual([6, 1, 3])
  })

  it('an electorate of zero is not a division by zero', () => {
    const r = buildCityResult({ turnout: turnout({ aptos: 0, comparecimento: 0, abstencoes: 0, brancos: 0, nulos: 0, validos: 0 }), votes: [], candidates: [] })
    expect([r.votedPct, r.notVotedPct]).toEqual([0, 0])
  })
})

describe('loadCityResult over the fixture data (the Sketch frame figures)', () => {
  const { data } = testContext()
  it('Cidade Exemplo 2026 round 1 reproduces the frame', async () => {
    const city = (await data.city('rj', 'cidade-exemplo'))!
    const r = (await loadCityResult(data, city, 2026, 1))!
    expect([r.votedPct, r.notVotedPct]).toEqual([70, 30])
    expect(r.voted.map((s) => [s.label, s.votos, s.pct])).toEqual([['Candidato A', 36400, 52], ['Candidato B', 33600, 48]])
    expect(r.notVoted.map((s) => [s.label, s.votos, s.pct])).toEqual([['Abstenção', 23400, 78], ['Brancos', 3000, 10], ['Nulos', 3600, 12]])
  })
  it('is undefined (never zeros) for a cycle the city has no data in', async () => {
    const city = (await data.city('mt', 'boa-esperanca-do-norte'))!
    expect(await loadCityResult(data, city, 2018, 1)).toBeUndefined()
    expect(await loadCityResult(data, city, 2026, 2)).toBeDefined()
  })
  it('every fixture city, cycle and round adds up: voted + not voted = 100, each bar = 100', async () => {
    for (const city of await data.cities())
      for (const ano of city.ciclos)
        for (const turno of [1, 2] as const) {
          const r = (await loadCityResult(data, city, ano, turno))!
          expect(r.votedPct + r.notVotedPct, `${city.slug} ${ano}/${turno}`).toBe(100)
          expect(sum(r.voted.map((s) => s.pct))).toBe(100)
          expect(sum(r.notVoted.map((s) => s.pct))).toBe(100)
          expect(r.validos + r.naoVotaram).toBe(r.aptos)
        }
  })
})
