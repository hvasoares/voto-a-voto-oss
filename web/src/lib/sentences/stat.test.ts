import { describe, expect, it } from 'vitest'
import { buildCityResult } from '@/shared/city-model'
import { statCard } from './stat'

/** aptos, the valid votes per candidate (number = position + 1) and the turnout. */
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
const place = { cityName: 'Cidade Exemplo' }

describe('the one-stat card words', () => {
  it('who did not vote: the share of the electorate, one number and one line', () => {
    const s = statCard(result(1000, [400, 300]), 'nonVoters', place)
    expect(s.number).toBe('30%')
    expect(s.line).toBe('do eleitorado de Cidade Exemplo não votou no 1º turno de 2026.')
    expect(s.alt).toBe('30% do eleitorado de Cidade Exemplo não votou no 1º turno de 2026.')
  })
  it('turnout counts blank and null votes as turning out', () => {
    const s = statCard(result(1000, [400, 300], { comparecimento: 800 }), 'turnout', place)
    expect(s.number).toBe('80%')
    expect(s.line).toContain('compareceu no 1º turno de 2026')
  })
  it('margin: the votes between the two most voted, singular and plural', () => {
    expect(statCard(result(100000, [36400, 33600], { turno: 2 }), 'margin', place)).toMatchObject({ number: '2.800', line: 'votos separaram os dois candidatos mais votados em Cidade Exemplo, no 2º turno de 2026.' })
    expect(statCard(result(100, [41, 40]), 'margin', place).line).toMatch(/^voto separou /)
  })
  it('a tie is a margin of 0 votes, not a missing number', () => {
    expect(statCard(result(1000, [300, 300]), 'margin', place)).toMatchObject({ number: '0' })
  })
  it('keeps the decimal when it matters and never rounds a part to nothing or to everything', () => {
    expect(statCard(result(1000, [336, 300], { comparecimento: 636 }), 'nonVoters', place).number).toBe('36,4%')
    expect(statCard(result(100000, [60000, 39999], { comparecimento: 99999 }), 'nonVoters', place).number).toBe('menos de 0,1%')
  })
  it('a measure that does not exist says so and carries no number', () => {
    expect(statCard(result(1000, [500]), 'margin', place)).toMatchObject({ number: undefined, line: 'Esta medida não se aplica a Cidade Exemplo no 1º turno de 2026.' })
    expect(statCard(result(0, []), 'nonVoters', place).number).toBeUndefined()
    expect(statCard(undefined, 'turnout', { cityName: 'X', ano: 2018, turno: 2 }).line).toBe('Esta medida não se aplica a X no 2º turno de 2018.')
  })
  it('the plain register says the same figures in everyday words', () => {
    const s = statCard(result(1000, [400, 300]), 'nonVoters', { ...place, register: 'plain' })
    expect(s.number).toBe('30%')
    expect(s.line).toBe('das pessoas que podiam votar em Cidade Exemplo não votaram no 1º turno de 2026.')
  })
  it('never words a cause or a winner', () => {
    for (const measure of ['nonVoters', 'margin', 'turnout'] as const)
      for (const register of ['standard', 'plain'] as const) expect(statCard(result(1000, [400, 300]), measure, { ...place, register }).alt).not.toMatch(/vence|venceu|porque|por causa|ganhou/i)
  })
})
