import { describe, expect, it } from 'vitest'
import { buildCityResult } from '@/shared/city-model'
import { marginLine, marginVotes } from './margin'

/** aptos, the valid votes per candidate (number = position + 1) and the turnout; the rest of the electorate did not vote. */
function result(aptos: number, votos: number[], o: { turno?: 1 | 2; comparecimento?: number } = {}) {
  const ano = 2026
  const turno = o.turno ?? 1
  const validos = votos.reduce((a, b) => a + b, 0)
  const comparecimento = o.comparecimento ?? validos
  return buildCityResult({
    turnout: { ano, turno, uf: 'rj', cdMunicipio: '1', aptos, comparecimento, abstencoes: aptos - comparecimento, brancos: 0, nulos: comparecimento - validos, anuladosApuSep: 0, validos },
    votes: votos.map((v, i) => ({ ano, turno, uf: 'rj', cdMunicipio: '1', candidatoNumero: i + 1, votos: v })),
    candidates: votos.map((_, i) => ({ ano, turno, candidatoNumero: i + 1, nomeUrna: `C${i + 1}`, partido: 'P' })),
  })
}
const place = { cityName: 'X' }
const plain = { cityName: 'X', register: 'plain' as const }

describe('the margin line', () => {
  it('the frame: 36.400 to 33.600 of 100.000, 30.000 stayed home -> 2.800 votes, fits 10 times', () => {
    const r = result(100000, [36400, 33600], { comparecimento: 76600 })
    expect(marginVotes(r)).toBe(2800)
    expect(marginLine(r, place)).toBe('Faltaram 2.800 votos para virar: cabem 10 vezes nos 30.000 que não votaram.')
  })
  it('counts whole times only (10,7 is "10 vezes")', () => {
    expect(marginLine(result(100000, [36400, 33600], { comparecimento: 76600 }), place)).toContain('cabem 10 vezes')
  })
  it('one vote, one time: singular verbs', () => {
    expect(marginLine(result(100, [41, 40], { comparecimento: 81 }), place)).toBe('Faltou 1 voto para virar: cabem 19 vezes nos 19 que não votaram.')
    expect(marginLine(result(30, [11, 10], { comparecimento: 25 }), place)).toBe('Faltou 1 voto para virar: cabem 9 vezes nos 9 que não votaram.')
  })
  it('five times, and a margin larger than the non-voters', () => {
    expect(marginLine(result(100, [30, 20], { comparecimento: 50 }), place)).toBe('Faltaram 10 votos para virar: cabem 5 vezes nos 50 que não votaram.')
    expect(marginLine(result(100, [60, 20], { comparecimento: 80 }), place)).toBe('Faltaram 40 votos para virar: mais do que os 20 que não votaram.')
  })
  it('a margin that does not fit even once says it is larger', () => {
    expect(marginLine(result(1000, [900, 50], { comparecimento: 950 }), place)).toBe('Faltaram 850 votos para virar: mais do que os 50 que não votaram.')
  })
  it('a tie, and so a zero margin, is worded as a tie in both rounds', () => {
    expect(marginLine(result(1000, [300, 300], { comparecimento: 600 }), place)).toBe('Empate na frente: a diferença entre os mais votados é de 0 votos.')
    expect(marginLine(result(1000, [300, 300], { comparecimento: 600, turno: 2 }), place)).toBe('Empate na frente: a diferença entre os mais votados é de 0 votos.')
    expect(marginLine(result(1000, [300, 300, 100], { comparecimento: 700 }), place)).toContain('Empate na frente')
  })
  it('the margin is between the first two even when more candidates ran (round 1)', () => {
    expect(marginLine(result(1000, [400, 300, 200], { comparecimento: 900 }), place)).toBe('Faltaram 100 votos para virar: cabe 1 vez nos 100 que não votaram.')
  })
  it('works in the second round', () => {
    expect(marginLine(result(1000, [500, 400], { comparecimento: 900, turno: 2 }), place)).toBe('Faltaram 100 votos para virar: cabe 1 vez nos 100 que não votaram.')
  })
  it('nobody stayed home: only the gap', () => {
    expect(marginLine(result(1000, [600, 400], { comparecimento: 1000 }), place)).toBe('Faltaram 200 votos para virar.')
  })
  it('no line when nothing could have turned: no data, no valid votes, a single candidate', () => {
    expect(marginLine(undefined, place)).toBeUndefined()
    expect(marginLine(result(1000, [0, 0], { comparecimento: 0 }), place)).toBeUndefined()
    expect(marginLine(result(1000, [500], { comparecimento: 500 }), place)).toBeUndefined()
    expect(marginLine(result(1000, [500, 0], { comparecimento: 500 }), place)).toBeUndefined()
    expect(marginLine(result(0, [], { comparecimento: 0 }), place)).toBeUndefined()
  })
  it('plain language: the same figures in short sentences', () => {
    const r = result(100000, [36400, 33600], { comparecimento: 76600 })
    expect(marginLine(r, plain)).toBe('Faltaram 2.800 votos para virar o resultado. Esse número cabe 10 vezes nas 30.000 pessoas que não votaram.')
    expect(marginLine(result(1000, [300, 300], { comparecimento: 600 }), plain)).toBe('Houve empate na frente. A diferença entre os mais votados é de 0 votos.')
    expect(marginLine(result(1000, [900, 50], { comparecimento: 950 }), plain)).toBe('Faltaram 850 votos para virar o resultado. Esse número é maior do que as 50 pessoas que não votaram.')
  })
  it('states arithmetic only: no cause, no winner word, the same wording whoever leads', () => {
    const a = marginLine(result(1000, [500, 400], { comparecimento: 900 }), place)!
    const b = marginLine(result(1000, [400, 500], { comparecimento: 900 }), place)!
    expect(a).toBe(b)
    for (const text of [a, marginLine(result(100, [41, 40], { comparecimento: 81 }), place)!]) expect(text).not.toMatch(/venc|porque|culpa|motivo|escolha|quis/i)
  })
})
