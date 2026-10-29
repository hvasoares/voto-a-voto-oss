import { describe, expect, it } from 'vitest'
import type { CityResult } from '@/shared/city-model'
import { sentenceInput } from '@/test/sentence-input'
import { headline } from './headline'

const say = (r: CityResult | undefined, cityName = 'Cidade Exemplo') => headline(r, { cityName })
const lead = 'Em Cidade Exemplo, no 1º turno de 2026, '

describe('headline: the frame sentence and the comparison bands (15% on the one-decimal values)', () => {
  it('reproduces the sentence of the Sketch frame', () => {
    const r = sentenceInput({ aptos: 100000, votos: [36400, 33600], comparecimento: 76600, nomes: ['Candidato A', 'Candidato B'] })
    expect(say(r)).toBe(`${lead}30% do eleitorado não votou, quase tanto quanto o Candidato B recebeu (33,6%).`)
  })
  it('clearly more than the leader got', () => {
    expect(say(sentenceInput({ aptos: 1000, votos: [200, 150], comparecimento: 350 }))).toBe(`${lead}65% do eleitorado não votou, mais do que o mais votado, Cand 1, recebeu (20%).`)
  })
  it('a little more than the leader', () => {
    expect(say(sentenceInput({ aptos: 1000, votos: [420, 100], comparecimento: 520 }))).toContain('48% do eleitorado não votou, um pouco mais do que o mais votado, Cand 1, recebeu (42%)')
  })
  it('exactly as much as the leader', () => {
    expect(say(sentenceInput({ aptos: 1000, votos: [450, 100], comparecimento: 550 }))).toContain('45% do eleitorado não votou, tanto quanto o mais votado, Cand 1, recebeu (45%)')
  })
  it('almost as much as the leader', () => {
    expect(say(sentenceInput({ aptos: 1000, votos: [450, 150], comparecimento: 600 }))).toBe(`${lead}40% do eleitorado não votou, quase tanto quanto o mais votado, Cand 1, recebeu (45%).`)
  })
  it('well below the leader but above the runner-up', () => {
    expect(say(sentenceInput({ aptos: 1000, votos: [500, 200], comparecimento: 700 }))).toBe(`${lead}30% do eleitorado não votou, mais do que Cand 2, o segundo mais votado, recebeu (20%).`)
  })
  it('a little more than the runner-up', () => {
    expect(say(sentenceInput({ aptos: 1000, votos: [450, 270], comparecimento: 720 }))).toBe(`${lead}28% do eleitorado não votou, um pouco mais do que Cand 2 recebeu (27%).`)
  })
  it('exactly as much as the runner-up', () => {
    expect(say(sentenceInput({ aptos: 1000, votos: [600, 200], comparecimento: 800 }))).toBe(`${lead}20% do eleitorado não votou, tanto quanto Cand 2 recebeu (20%).`)
  })
  it('smaller than both', () => {
    expect(say(sentenceInput({ aptos: 1000, votos: [500, 400], comparecimento: 900 }))).toBe(`${lead}10% do eleitorado não votou, menos do que Cand 2, o segundo mais votado, recebeu (40%).`)
  })
})

describe('headline: same wording and treatment for every candidate', () => {
  it('swapping which candidate leads changes only the names', () => {
    const x = say(sentenceInput({ aptos: 1000, votos: [500, 340], comparecimento: 900, nomes: ['ANA', 'BIA'] }))
    const y = say(sentenceInput({ aptos: 1000, votos: [340, 500], comparecimento: 900, nomes: ['BIA', 'ANA'] }))
    expect(y).toBe(x)
  })
  it('uses the article only for labels that already say "Candidato"', () => {
    expect(say(sentenceInput({ aptos: 1000, votos: [500, 400], comparecimento: 900, nomes: ['LULA', 'FLAVIO BOLSONARO'] }))).toContain('menos do que Flávio Bolsonaro, o segundo mais votado')
  })
  it.each(['vence', 'venceu', 'ganha', 'ganhou', 'derrota', 'eleito', 'liderou', 'porque', 'devido'])('never says "%s"', (word) => {
    for (const r of [sentenceInput({ aptos: 1000, votos: [500, 400], comparecimento: 900 }), sentenceInput({ aptos: 1000, votos: [250, 250], comparecimento: 500 }), sentenceInput({ aptos: 1000, votos: [450, 150], comparecimento: 600 })])
      expect(say(r).toLowerCase()).not.toMatch(new RegExp(`\\b${word}\\b`))
  })
})

describe('headline: a tie', () => {
  it('two candidates tied for the lead', () => {
    expect(say(sentenceInput({ aptos: 1000, votos: [250, 250], comparecimento: 500 }))).toBe(`${lead}Cand 1 e Cand 2 empataram na frente, com 25% do eleitorado cada um; 50% do eleitorado não votou.`)
  })
  it('three or more tied for the lead', () => {
    expect(say(sentenceInput({ aptos: 1000, votos: [100, 100, 100, 5], comparecimento: 305 }))).toBe(`${lead}3 candidatos empataram na frente, com 10% do eleitorado cada um; 69,5% do eleitorado não votou.`)
  })
  it('a tie for second place names every runner-up, in number order', () => {
    expect(say(sentenceInput({ aptos: 1000, votos: [500, 100, 100], comparecimento: 700 }))).toBe(`${lead}30% do eleitorado não votou, mais do que cada um dos dois candidatos empatados em segundo lugar (Cand 2 e Cand 3) recebeu (10%).`)
  })
  it('round 2 reads the same way', () => {
    expect(say(sentenceInput({ aptos: 1000, votos: [250, 250], comparecimento: 500, turno: 2 }))).toContain('no 2º turno de 2026, Cand 1 e Cand 2 empataram')
  })
})

describe('headline: edge cases of the numbers', () => {
  it('a single candidate with votes received all the valid votes', () => {
    expect(say(sentenceInput({ aptos: 1000, votos: [600, 0], comparecimento: 600 }))).toBe(`${lead}40% do eleitorado não votou; Cand 1 recebeu todos os votos válidos (60%).`)
  })
  it('a tiny electorate speaks in head counts and singular/plural', () => {
    expect(say(sentenceInput({ aptos: 40, votos: [10, 6], comparecimento: 16 }))).toBe(`${lead}24 dos 40 eleitores não votaram, mais do que o mais votado, Cand 1, recebeu (10 votos).`)
    expect(say(sentenceInput({ aptos: 40, votos: [39, 1], comparecimento: 40 }))).not.toContain('NaN')
    expect(say(sentenceInput({ aptos: 10, votos: [8, 1], comparecimento: 9 }))).toContain('1 dos 10 eleitores não votou')
    expect(say(sentenceInput({ aptos: 10, votos: [8, 1], comparecimento: 9 }))).toContain('(1 voto)')
  })
  it('nobody turned out', () => {
    expect(say(sentenceInput({ aptos: 400, votos: [0, 0], comparecimento: 0 }))).toBe(`${lead}nenhum dos 400 eleitores aptos compareceu.`)
    expect(say(sentenceInput({ aptos: 1, votos: [0, 0], comparecimento: 0 }))).toBe(`${lead}o único eleitor apto não compareceu.`)
    expect(say(sentenceInput({ aptos: 12400, votos: [0, 0], comparecimento: 0 }))).toContain('nenhum dos 12.400 eleitores aptos')
  })
  it('no electorate, no valid votes, everyone voted', () => {
    expect(say(sentenceInput({ aptos: 0, votos: [], comparecimento: 0 }))).toBe(`${lead}não há eleitores aptos registrados.`)
    expect(say(sentenceInput({ aptos: 400, votos: [0, 0], comparecimento: 400, brancos: 400 }))).toBe(`${lead}nenhum candidato recebeu votos válidos: todos os votos foram em branco ou nulos.`)
    expect(say(sentenceInput({ aptos: 400, votos: [250, 150], comparecimento: 400 }))).toBe(`${lead}todo o eleitorado votou em algum candidato.`)
  })
  it('never shows a non-zero share as 0% nor a partial one as 100%', () => {
    expect(say(sentenceInput({ aptos: 100000, votos: [70000, 29970], comparecimento: 99970 }))).toContain('menos de 0,1% do eleitorado não votou')
    expect(say(sentenceInput({ aptos: 100000, votos: [70000, 29940], comparecimento: 99940 }))).toContain('0,1% do eleitorado não votou')
  })
})

describe('headline: a cycle with no data, a tie in the numbers of the overseas posts', () => {
  it('a cycle with no data says so, in one short sentence', () => {
    expect(say(undefined)).toBe('Sem dados nesse ciclo.')
  })
  it('an overseas post is "no exterior", with the same figures', () => {
    const r = sentenceInput({ aptos: 1000, votos: [500, 400], comparecimento: 900 })
    expect(headline(r, { cityName: 'Katmandu', overseas: true })).toBe('No exterior, em Katmandu, no 1º turno de 2026, 10% do eleitorado não votou, menos do que Cand 2, o segundo mais votado, recebeu (40%).')
  })
  it('an overseas post can tie too', () => {
    expect(headline(sentenceInput({ aptos: 1000, votos: [250, 250], comparecimento: 500 }), { cityName: 'Abidjã', overseas: true })).toBe('No exterior, em Abidjã, no 1º turno de 2026, Cand 1 e Cand 2 empataram na frente, com 25% do eleitorado cada um; 50% do eleitorado não votou.')
  })
  it('is deterministic', () => {
    const r = sentenceInput({ aptos: 1000, votos: [500, 400], comparecimento: 900 })
    expect(say(r)).toBe(say(r))
  })
})
