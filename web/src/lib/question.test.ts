import { describe, expect, it } from 'vitest'
import { ARC_KINDS, cityArc, type Arc } from './arcs'
import type { CityShard } from './city-shard'
import { answerText, pickQuestion, questionOf, questionText, yesNo, ANSWERS } from './question'
import { GUESS_STANDARD } from './sentences/catalog-guess'
import { QUESTION_PLAIN, QUESTION_STANDARD } from './sentences/catalog-question'

type Winner = 'PT' | 'BOL' | 'tie' | undefined
function shard(w: [Winner, Winner, Winner], uf = 'rj'): CityShard {
  const cycles: CityShard['cycles'] = {}
  const candidates: CityShard['candidates'] = {}
  ;([2018, 2022, 2026] as const).forEach((ano, i) => {
    const bol = ano === 2018 ? '17' : '22'
    candidates[String(ano)] = { '2': { '13': [ano === 2018 ? 'FERNANDO HADDAD' : 'LULA', 'PT'], [bol]: ['JAIR BOLSONARO', 'PL'] } }
    const who = w[i]
    if (who) cycles[String(ano)] = { '2': { aptos: 100, votes: who === 'tie' ? { '13': 50, [bol]: 50 } : { '13': who === 'PT' ? 60 : 40, [bol]: who === 'BOL' ? 60 : 40 } } }
  })
  return { city: { uf, slug: 'x', nome: 'X', regiao: 'sul', cdMunicipio: '1', cdIbge: '1', ciclos: [2018, 2022, 2026] }, cycles, candidates }
}

describe('the question of a city', () => {
  it.each([
    [['PT', 'PT', 'PT'], 'same', false, 'Cidade mudou de lado entre 2018 e 2026?', 'Não. Mesmo lado nos três ciclos'],
    [['PT', 'BOL', 'BOL'], 'switched2022', true, 'Cidade mudou de lado em 2022?', 'Sim. Mudou de lado em 2022'],
    [['PT', 'PT', 'BOL'], 'switched2026', true, 'Cidade mudou de lado em 2026?', 'Sim. Mudou de lado em 2026'],
    [['PT', 'BOL', 'PT'], 'returned', true, 'Cidade voltou ao lado de 2018 em 2026?', 'Sim. Mudou de lado em 2022 e voltou em 2026'],
    [['tie', 'PT', 'PT'], 'tie', true, 'O 2º turno de 2018 em Cidade terminou empatado?', 'Sim. Empate no 2º turno de 2018'],
    [[undefined, undefined, 'PT'], 'missing', false, 'Há resultado do 2º turno de 2018 e 2022 em Cidade?', 'Não. Sem dados do 2º turno de 2018 e 2022'],
  ] as [[Winner, Winner, Winner], string, boolean, string, string][])('%j asks "%s": the answer is the arc', (winners, kind, answer, text, line) => {
    const q = pickQuestion(shard(winners))
    expect(q.kind).toBe(kind)
    expect(q.answer).toBe(answer)
    expect(questionText(q, 'Cidade')).toBe(text)
    expect(answerText(q)).toBe(line)
  })

  it('a tie in two cycles and a missing cycle over a tie keep the arc rules (the question never disagrees with the arc label)', () => {
    expect(pickQuestion(shard(['tie', 'PT', 'tie'])).arc).toEqual({ kind: 'tie', years: [2018, 2026] })
    expect(questionText(pickQuestion(shard(['tie', 'PT', 'tie'])), 'Cidade')).toBe('O 2º turno de 2018 e 2026 em Cidade terminou empatado?')
    expect(pickQuestion(shard(['tie', undefined, 'PT'])).kind).toBe('missing')
  })

  it('every city has exactly one question, and it is the kind of its arc', () => {
    for (const w of [['PT', 'PT', 'PT'], ['BOL', 'PT', 'PT'], ['PT', 'BOL', 'PT'], [undefined, 'PT', 'PT']] as [Winner, Winner, Winner][])
      expect(pickQuestion(shard(w)).kind).toBe(cityArc(shard(w)).kind)
  })

  it('an overseas post asks in its own words', () => {
    const q = pickQuestion(shard(['PT', 'BOL', 'BOL'], 'zz'))
    expect(q.overseas).toBe(true)
    expect(questionText(q, 'Roma')).toBe('O voto no exterior em Roma mudou de lado em 2022?')
    expect(questionText(pickQuestion(shard(['tie', 'PT', 'PT'], 'zz')), 'Roma')).toBe('O 2º turno de 2018 no exterior, em Roma, terminou empatado?')
  })

  it('the plain register has its own question and the same answer', () => {
    const q = pickQuestion(shard(['PT', 'BOL', 'BOL']))
    expect(questionText(q, 'Cidade', { register: 'plain' })).toBe('Em Cidade, o lado com mais votos no 2º turno mudou em 2022?')
    expect(answerText(q, { register: 'plain' })).toBe('Sim. Em 2022, o lado com mais votos no 2º turno mudou')
  })

  it('has a template for every arc kind, for a city and for an overseas post, in both registers, with no slot left open', () => {
    for (const register of ['standard', 'plain'] as const)
      for (const overseas of [false, true])
        for (const kind of ARC_KINDS) {
          const arc: Arc = { kind, years: [2018, 2022] }
          const text = questionText(questionOf(arc, overseas), 'Cidade', { register })
          expect(text).not.toMatch(/\{\w+\}/)
          expect(text).toMatch(/\?$/)
        }
    expect(Object.keys(ANSWERS).sort()).toEqual([...ARC_KINDS].sort())
  })

  it('is neutral: never why, never a winner or a loser, never a person or a party', () => {
    const all = [...Object.values(QUESTION_STANDARD), ...Object.values(QUESTION_PLAIN)].join(' | ')
    expect(all).not.toMatch(/porque|devido|causa|culpa|motivo|venc|perd|ganh|derrot|lider|lula|bolsonaro|\bPT\b|\bPL\b/i)
    expect(yesNo(true)).toBe('Sim')
    expect(yesNo(false)).toBe('Não')
  })

  it('the result of a guess states a match and nothing else (no praise, no shame)', () => {
    const results = [GUESS_STANDARD['question.guess.right'], GUESS_STANDARD['question.guess.wrong']].join(' ')
    expect(results).not.toMatch(/parab|acertou|errou|burro|bom|ótimo|infelizmente|que pena|você/i)
  })
})
