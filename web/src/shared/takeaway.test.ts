import { describe, expect, it } from 'vitest'
import { buildCityResult } from './city-model'
import { takeaway } from './takeaway'

/** A result with the given electorate, valid votes per candidate (number = position + 1) and turnout; names "Cand 1"... */
function result(aptos: number, votos: number[], o: { comparecimento?: number; ano?: number; turno?: 1 | 2; nomes?: string[] } = {}) {
  const ano = o.ano ?? 2026
  const turno = o.turno ?? 1
  const validos = votos.reduce((a, b) => a + b, 0)
  const comparecimento = o.comparecimento ?? validos
  return buildCityResult({
    turnout: { ano, turno, uf: 'rj', cdMunicipio: '1', aptos, comparecimento, abstencoes: aptos - comparecimento, brancos: 0, nulos: comparecimento - validos, anuladosApuSep: 0, validos },
    votes: votos.map((v, i) => ({ ano, turno, uf: 'rj', cdMunicipio: '1', candidatoNumero: i + 1, votos: v })),
    candidates: votos.map((_, i) => ({ ano, turno, candidatoNumero: i + 1, nomeUrna: o.nomes?.[i] ?? `CAND ${i + 1}`, partido: 'P' })),
  })
}
const say = (r: ReturnType<typeof result>, city = 'Cidade Exemplo') => takeaway(r, city)

describe('takeaway sentence', () => {
  it('reproduces the sentence of the Sketch frame', () => {
    const r = result(100000, [36400, 33600], { comparecimento: 76600, nomes: ['Candidato A', 'Candidato B'] })
    expect(say(r)).toBe('Em Cidade Exemplo, no 1º turno de 2026, 30% do eleitorado não votou, quase tanto quanto o Candidato B recebeu (33,6%).')
  })

  describe('non-voters compared with the leader, then the runner-up (bands of 15% on the one-decimal values)', () => {
    it('clearly more than the leader got', () => {
      const r = result(1000, [200, 150], { comparecimento: 350 }) // 65% did not vote, the leader has 20%
      expect(say(r)).toBe('Em Cidade Exemplo, no 1º turno de 2026, 65% do eleitorado não votou, mais do que o mais votado, Cand 1, recebeu (20%).')
    })
    it('a little more than the leader', () => {
      expect(say(result(1000, [420, 100], { comparecimento: 520 }))).toContain('48% do eleitorado não votou, um pouco mais do que o mais votado, Cand 1, recebeu (42%)')
    })
    it('exactly as much as the leader', () => {
      expect(say(result(1000, [450, 100], { comparecimento: 550 }))).toContain('45% do eleitorado não votou, tanto quanto o mais votado, Cand 1, recebeu (45%)')
    })
    it('almost as much as the leader', () => {
      expect(say(result(1000, [450, 150], { comparecimento: 600 }))).toBe('Em Cidade Exemplo, no 1º turno de 2026, 40% do eleitorado não votou, quase tanto quanto o mais votado, Cand 1, recebeu (45%).')
    })
    it('well below the leader but above the runner-up', () => {
      expect(say(result(1000, [500, 200], { comparecimento: 700 }))).toBe('Em Cidade Exemplo, no 1º turno de 2026, 30% do eleitorado não votou, mais do que Cand 2, o segundo mais votado, recebeu (20%).')
    })
    it('a little more than the runner-up', () => {
      expect(say(result(1000, [450, 270], { comparecimento: 720 }))).toBe('Em Cidade Exemplo, no 1º turno de 2026, 28% do eleitorado não votou, um pouco mais do que Cand 2 recebeu (27%).')
    })
    it('exactly as much as the runner-up', () => {
      expect(say(result(1000, [600, 200], { comparecimento: 800 }))).toBe('Em Cidade Exemplo, no 1º turno de 2026, 20% do eleitorado não votou, tanto quanto Cand 2 recebeu (20%).')
    })
    it('almost as much as the runner-up (the frame pattern)', () => {
      expect(say(result(1000, [580, 220], { comparecimento: 800 }))).toBe('Em Cidade Exemplo, no 1º turno de 2026, 20% do eleitorado não votou, quase tanto quanto Cand 2 recebeu (22%).')
    })
    it('smaller than both', () => {
      expect(say(result(1000, [500, 400], { comparecimento: 900 }))).toBe('Em Cidade Exemplo, no 1º turno de 2026, 10% do eleitorado não votou, menos do que Cand 2, o segundo mais votado, recebeu (40%).')
    })
  })

  describe('same wording and treatment for both candidates', () => {
    it('swapping which candidate leads changes only the names', () => {
      const x = say(result(1000, [500, 340], { comparecimento: 900, nomes: ['ANA', 'BIA'] }))
      const y = say(result(1000, [340, 500], { comparecimento: 900, nomes: ['BIA', 'ANA'] }))
      expect(y).toBe(x)
    })
    it('uses the article only for labels that already say "Candidato"', () => {
      expect(say(result(1000, [500, 400], { comparecimento: 900, nomes: ['LULA', 'FLAVIO BOLSONARO'] }))).toContain('menos do que Flavio Bolsonaro, o segundo mais votado')
    })
  })

  describe('ties', () => {
    it('two candidates tied for the lead', () => {
      const r = result(1000, [250, 250], { comparecimento: 500 })
      expect(say(r)).toBe('Em Cidade Exemplo, no 1º turno de 2026, Cand 1 e Cand 2 empataram na frente, com 25% do eleitorado cada um; 50% do eleitorado não votou.')
    })
    it('three or more tied for the lead', () => {
      const r = result(1000, [100, 100, 100, 5], { comparecimento: 305 })
      expect(say(r)).toBe('Em Cidade Exemplo, no 1º turno de 2026, 3 candidatos empataram na frente, com 10% do eleitorado cada um; 69,5% do eleitorado não votou.')
    })
    it('a tie for second place names both runner-ups, in number order, and does not favour one', () => {
      const r = result(1000, [500, 100, 100], { comparecimento: 700 })
      expect(say(r)).toBe('Em Cidade Exemplo, no 1º turno de 2026, 30% do eleitorado não votou, mais do que cada um dos dois candidatos empatados em segundo lugar (Cand 2 e Cand 3) recebeu (10%).')
    })
    it('round 2 ties read the same way', () => {
      const r = result(1000, [300, 300], { turno: 2, comparecimento: 600 })
      expect(say(r)).toContain('no 2º turno de 2026, Cand 1 e Cand 2 empataram na frente')
    })
  })

  describe('edge cases', () => {
    it('only one candidate got votes', () => {
      expect(say(result(1000, [600, 0], { comparecimento: 600 }))).toBe('Em Cidade Exemplo, no 1º turno de 2026, 40% do eleitorado não votou; Cand 1 recebeu todos os votos válidos (60%).')
    })
    it('tiny electorate: counts instead of percentages', () => {
      expect(say(result(40, [10, 6], { comparecimento: 20 }), 'Posto Exemplo')).toBe('Em Posto Exemplo, no 1º turno de 2026, 24 dos 40 eleitores não votaram, mais do que o mais votado, Cand 1, recebeu (10 votos).')
    })
    it('tiny electorate with a tie and singular wording', () => {
      expect(say(result(10, [1, 1], { comparecimento: 2 }), 'Posto Exemplo')).toBe('Em Posto Exemplo, no 1º turno de 2026, Cand 1 e Cand 2 empataram na frente, com 1 voto cada um; 8 dos 10 eleitores não votaram.')
      expect(say(result(10, [1, 0], { comparecimento: 9 }), 'Posto Exemplo')).toBe('Em Posto Exemplo, no 1º turno de 2026, 9 dos 10 eleitores não votaram; Cand 1 recebeu todos os votos válidos (1 voto).')
    })
    it('nobody turned out (overseas post): no candidate wording at all', () => {
      expect(say(result(195, [0, 0], { comparecimento: 0 }), 'Posto Exemplo')).toBe('Em Posto Exemplo, no 1º turno de 2026, nenhum dos 195 eleitores aptos compareceu.')
      expect(say(result(1, [0, 0], { comparecimento: 0 }), 'Posto Exemplo')).toBe('Em Posto Exemplo, no 1º turno de 2026, o único eleitor apto não compareceu.')
    })
    it('people turned out but no valid vote', () => {
      expect(say(result(100, [0, 0], { comparecimento: 40 }), 'Posto Exemplo')).toBe('Em Posto Exemplo, no 1º turno de 2026, nenhum candidato recebeu votos válidos: todos os votos foram em branco ou nulos.')
    })
    it('everybody voted for a candidate', () => {
      expect(say(result(1000, [600, 400], { comparecimento: 1000 }))).toBe('Em Cidade Exemplo, no 1º turno de 2026, todo o eleitorado votou em algum candidato.')
    })
    it('no electorate at all', () => {
      expect(say(result(0, [0, 0], { comparecimento: 0 }))).toBe('Em Cidade Exemplo, no 1º turno de 2026, não há eleitores aptos registrados.')
    })
    it('never prints NaN, undefined or a raw object, whatever the numbers', () => {
      let seed = 3
      const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
      for (let i = 0; i < 400; i++) {
        const aptos = Math.floor(rnd() * rnd() * 3000)
        const k = 2 + Math.floor(rnd() * 5)
        const votos = Array.from({ length: k }, () => Math.floor(rnd() * rnd() * (aptos / k)))
        const valid = votos.reduce((a, b) => a + b, 0)
        const s = say(result(aptos, votos, { comparecimento: Math.min(aptos, valid + Math.floor(rnd() * 5)) }))
        expect(s).toMatch(/^Em Cidade Exemplo, no [12]º turno de 2026, .+\.$/)
        expect(s).not.toMatch(/NaN|undefined|\[object|Infinity/)
      }
    })
  })
})
