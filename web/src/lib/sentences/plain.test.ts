import { describe, expect, it } from 'vitest'
import { buildCityResult } from '@/shared/city-model'
import { headline } from './headline'

/** Same builder as headline.test.ts: aptos, valid votes per candidate (number = position + 1) and turnout. */
function result(aptos: number, votos: number[], o: { comparecimento?: number; turno?: 1 | 2; nomes?: string[]; brancos?: number } = {}) {
  const ano = 2026
  const turno = o.turno ?? 1
  const validos = votos.reduce((a, b) => a + b, 0)
  const comparecimento = o.comparecimento ?? validos
  return buildCityResult({
    turnout: { ano, turno, uf: 'rj', cdMunicipio: '1', aptos, comparecimento, abstencoes: aptos - comparecimento, brancos: o.brancos ?? 0, nulos: comparecimento - validos - (o.brancos ?? 0), anuladosApuSep: 0, validos },
    votes: votos.map((v, i) => ({ ano, turno, uf: 'rj', cdMunicipio: '1', candidatoNumero: i + 1, votos: v })),
    candidates: votos.map((_, i) => ({ ano, turno, candidatoNumero: i + 1, nomeUrna: o.nomes?.[i] ?? `CAND ${i + 1}`, partido: 'P' })),
  })
}
const plain = (r: ReturnType<typeof result> | undefined, overseas = false) => headline(r, { cityName: 'Cidade Exemplo', overseas, register: 'plain' })
const lead = 'Em Cidade Exemplo, no 1º turno de 2026, '

/** One case per template of the catalog: [label, result, what the plain sentence says]. */
const CASES: [string, ReturnType<typeof result> | undefined, string][] = [
  ['no data', undefined, 'Não temos dados dessa eleição para este lugar.'],
  ['no electorate', result(0, [], { comparecimento: 0 }), `${lead}não havia pessoas registradas para votar.`],
  ['nobody turned out (one voter)', result(1, [0, 0], { comparecimento: 0 }), `${lead}a única pessoa que podia votar não foi votar.`],
  ['nobody turned out', result(400, [0, 0], { comparecimento: 0 }), `${lead}nenhuma das 400 pessoas que podiam votar foi votar.`],
  ['no valid votes', result(400, [0, 0], { comparecimento: 400, brancos: 400 }), `${lead}nenhum candidato recebeu votos. Todos os votos foram em branco ou anulados.`],
  ['everyone voted', result(400, [250, 150], { comparecimento: 400 }), `${lead}todas as pessoas votaram em algum candidato.`],
  ['a tie for the lead', result(1000, [250, 250], { comparecimento: 500 }), `${lead}Cand 1 e Cand 2 ficaram empatados na frente. Cada um recebeu votos de 25% das pessoas que podiam votar. 50% das pessoas que podiam votar não votaram.`],
  ['a tie of three', result(1000, [100, 100, 100, 5], { comparecimento: 305 }), `${lead}3 candidatos ficaram empatados na frente. Cada um recebeu votos de 10% das pessoas que podiam votar. 69,5% das pessoas que podiam votar não votaram.`],
  ['a single candidate', result(1000, [600, 0], { comparecimento: 600 }), `${lead}40% das pessoas que podiam votar não votaram. Cand 1 recebeu todos os votos dados a candidatos: 60%.`],
  ['more than the leader', result(1000, [200, 150], { comparecimento: 350 }), `${lead}65% das pessoas que podiam votar não votaram. Isso é mais do que Cand 1, o mais votado, recebeu: 20%.`],
  ['a little more than the leader', result(1000, [420, 100], { comparecimento: 520 }), `${lead}48% das pessoas que podiam votar não votaram. Isso é um pouco mais do que Cand 1, o mais votado, recebeu: 42%.`],
  ['as much as the leader', result(1000, [450, 100], { comparecimento: 550 }), `${lead}45% das pessoas que podiam votar não votaram. Isso é igual ao que Cand 1, o mais votado, recebeu: 45%.`],
  ['almost as much as the leader', result(1000, [450, 150], { comparecimento: 600 }), `${lead}40% das pessoas que podiam votar não votaram. Isso é quase igual ao que Cand 1, o mais votado, recebeu: 45%.`],
  ['more than the runner-up', result(1000, [500, 200], { comparecimento: 700 }), `${lead}30% das pessoas que podiam votar não votaram. Isso é mais do que Cand 2, o segundo mais votado, recebeu: 20%.`],
  ['almost as much as the runner-up (the frame)', result(100000, [36400, 33600], { comparecimento: 76600, nomes: ['Candidato A', 'Candidato B'] }), `${lead}30% das pessoas que podiam votar não votaram. Isso é quase igual ao que o Candidato B recebeu: 33,6%.`],
  ['less than the runner-up', result(1000, [500, 400], { comparecimento: 900 }), `${lead}10% das pessoas que podiam votar não votaram. Isso é menos do que Cand 2, o segundo mais votado, recebeu: 40%.`],
  ['a tie for second', result(1000, [500, 100, 100], { comparecimento: 700 }), `${lead}30% das pessoas que podiam votar não votaram. Isso é mais do que cada um dos dois candidatos empatados em segundo lugar (Cand 2 e Cand 3) recebeu: 10%.`],
  ['a tiny electorate', result(40, [10, 6], { comparecimento: 16 }), `${lead}24 de 40 pessoas que podiam votar não votaram. Isso é mais do que Cand 1, o mais votado, recebeu: 10 votos.`],
  ['a tiny electorate, tie', result(40, [10, 10], { comparecimento: 20 }), `${lead}Cand 1 e Cand 2 ficaram empatados na frente. Cada um recebeu 10 votos. 20 de 40 pessoas que podiam votar não votaram.`],
]

describe('plain language: every template has a version, with the same figures as the standard sentence', () => {
  it.each(CASES)('%s', (_label, r, expected) => {
    expect(plain(r)).toBe(expected)
  })

  it('an overseas post is "no exterior" in plain language too', () => {
    expect(plain(result(1000, [500, 400], { comparecimento: 900 }), true)).toBe('No exterior, em Cidade Exemplo, no 1º turno de 2026, 10% das pessoas que podiam votar não votaram. Isso é menos do que Cand 2, o segundo mais votado, recebeu: 40%.')
    expect(plain(result(1000, [250, 250], { comparecimento: 500 }), true)).toContain('No exterior, em Cidade Exemplo, no 1º turno de 2026, Cand 1 e Cand 2 ficaram empatados')
  })

  it('the standard register is the default and is unchanged', () => {
    const r = result(1000, [500, 400], { comparecimento: 900 })
    expect(headline(r, { cityName: 'Cidade Exemplo' })).toBe(headline(r, { cityName: 'Cidade Exemplo', register: 'standard' }))
    expect(headline(r, { cityName: 'Cidade Exemplo' })).toContain('do eleitorado não votou')
  })
})

describe('plain language: wording rules (one test for each template)', () => {
  const JARGON = /eleitorado|eleitores aptos|válid|comparecimento|abstenç|apto\b|\bnulos\b/i
  const CAUSES = /porque|devido|por causa|culpa|motivo|razão|protesto|desinteresse|descaso|vence|venceu|ganh|derrot|eleit[oa]\b|liderou/i

  it.each(CASES)('%s: no jargon, no cause, no winner label', (_label, r) => {
    const s = plain(r)
    expect(s).not.toMatch(JARGON)
    expect(s).not.toMatch(CAUSES)
  })

  it.each(CASES.filter(([, r]) => r))('%s: short sentences, one idea each (at most 28 words)', (_label, r) => {
    for (const sentence of plain(r).split(/(?<=\.)\s+/)) expect(sentence.split(/\s+/).length).toBeLessThanOrEqual(28)
  })

  it('swapping which candidate leads changes only the names', () => {
    const x = plain(result(1000, [500, 340], { comparecimento: 900, nomes: ['ANA', 'BIA'] }))
    const y = plain(result(1000, [340, 500], { comparecimento: 900, nomes: ['BIA', 'ANA'] }))
    expect(y).toBe(x)
  })

  it('numbers follow pt-BR formatting', () => {
    expect(plain(result(12400, [0, 0], { comparecimento: 0 }))).toContain('nenhuma das 12.400 pessoas')
    expect(plain(result(100000, [36400, 33600], { comparecimento: 76600 }))).toContain('33,6%')
  })
})
