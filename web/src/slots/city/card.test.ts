import { describe, expect, it } from 'vitest'
import { buildCityResult } from '../../shared/city-model'
import { headline } from '../../lib/sentences/headline'
import { factLinks, FactGateError } from '../../lib/facts/gate'
import { viewFacts } from '../../lib/facts/model'
import { questionOf } from '../../lib/question'
import { headlineId, viewQuestion, viewMargin, viewPanel, viewTwin } from './card'

const result = buildCityResult({
  turnout: { ano: 2026, turno: 1, uf: 'rj', cdMunicipio: '1', aptos: 100000, comparecimento: 76600, abstencoes: 23400, brancos: 3000, nulos: 3600, anuladosApuSep: 0, validos: 70000 },
  votes: [{ ano: 2026, turno: 1, uf: 'rj', cdMunicipio: '1', candidatoNumero: 1, votos: 36400 }, { ano: 2026, turno: 1, uf: 'rj', cdMunicipio: '1', candidatoNumero: 2, votos: 33600 }],
  candidates: ['Candidato A', 'Candidato B'].map((nomeUrna, i) => ({ ano: 2026, turno: 1 as const, candidatoNumero: i + 1, nomeUrna, partido: 'P' })),
})
const place = { cityName: 'Cidade Exemplo' }
const plainPlace = { ...place, register: 'plain' as const }
const facts = viewFacts(result, { uf: 'rj', slug: 'cidade-exemplo', name: 'Cidade Exemplo' })

describe('the figures carry no calculation link of their own (#155)', () => {
  const html = viewPanel(result, place, '2026-1').toString()

  it('draws no link beside a bar, a legend row, the sentence or the margin line: the page has the one entry', () => {
    expect(html).not.toContain('class="calc"')
    expect(viewMargin(result, place).toString()).not.toContain('class="calc"')
  })
  it('the build gate: a card whose records lack a source cannot be linked', () => {
    const broken = facts.map((f) => (f.anchor === 'votaram' ? { ...f, source: undefined } : f))
    expect(() => factLinks(broken, 'the failing fixture')).toThrow(/votaram: no source/)
  })
  it('the build gate: the entry of a page with no record for the figure cannot be made', () => {
    const without = factLinks(facts.filter((f) => f.anchor !== 'votaram'), 'the failing fixture')
    expect(() => without('votaram')).toThrow(FactGateError)
    expect(factLinks(facts, 'the card test')('votaram')).toBe('/fato/rj/cidade-exemplo/2026-1/#votaram')
  })
  it('the sentence of the headline and the share text are unchanged', () => {
    expect(html).toContain(`<p class="city-headline" data-headline>${headline(result, plainPlace)}</p>`)
  })
})

describe('card panel', () => {
  const html = viewPanel(result, place, '2026-1').toString()

  it('carries the headline in plain language only', () => {
    expect(html).toContain(headline(result, plainPlace))
    expect(html).not.toContain(headline(result, place))
    expect(html).not.toContain('data-register')
  })
  it('is described by its sentence block, and that block announces changes politely', () => {
    expect(html).toContain(`id="${headlineId('2026-1')}" aria-live="polite"`)
  })
  it('has no switch between texts', () => {
    expect(html).not.toMatch(/data-register-switch|data-register-choice|Texto integral|Linguagem simples/)
  })
  it('a cycle without data says so in plain language', () => {
    const none = viewPanel(undefined, place, '2018-1').toString()
    expect(none).toContain('Não temos dados dessa eleição para este lugar.')
    expect(none).not.toContain('Sem dados nesse ciclo.')
  })
})

describe('margin line of a view', () => {
  it('is in plain language, with the frame figures', () => {
    const html = viewMargin(result, place).toString()
    expect(html).not.toContain('Faltaram 2.800 votos para virar: cabem')
    expect(html).toContain('Esse número cabe 10 vezes nas 30.000 pessoas que não votaram.')
  })
  it('is empty when the round has nothing to turn or no data', () => {
    expect(viewMargin(undefined, place).toString()).toBe('')
  })
})

describe('question and answer of the city (#44)', () => {
  const html = viewQuestion(questionOf({ kind: 'switched2022' }, false), place).toString()
  it('opens with the question, then "Sim" and the arc label in plain language, in the page text', () => {
    expect(html.indexOf('<h2 class="city-q__q"')).toBeLessThan(html.indexOf('city-q__yn'))
    expect(html).toContain('Cidade Exemplo mudou de lado em 2022?')
    expect(html).toContain('data-answer="yes"')
    expect(html).toContain('data-arc="switched2022" hidden')
    expect(html).toContain('A pergunta precisa de scripts para ser feita')
    expect(html).toContain('<p class="city-q__yn">Sim.</p>')
    expect(html).toContain('Só conta a ordem dos fatos. Não diz o motivo.')
    expect(html).toContain('Em 2022, o lado com mais votos no 2º turno mudou')
    expect(html).not.toContain('data-register')
  })
  it('says "Não" for a city that did not change side', () => {
    const no = viewQuestion(questionOf({ kind: 'same' }, false), place).toString()
    expect(no).toContain('data-answer="no"')
    expect(no).toContain('<p class="city-q__yn">Não.</p>')
  })
})

describe('twin line', () => {
  const twin = { name: 'Vila Modelo', uf: 'SP', href: '/sp/vila-modelo/' }
  const html = viewTwin(twin, place).toString()
  it('links the twin card, with the name and the state, in plain language', () => {
    expect(html).toContain('href="/sp/vila-modelo/"')
    expect(html).toContain('Cidade parecida: Vila Modelo · SP')
  })
  it('says what the match uses: size, turnout, margin and the history of the cycles', () => {
    expect(html).toContain('Tem número de eleitores, comparecimento e resultados parecidos nas três eleições.')
  })
  it('shows nothing, and no empty link, when the city has no twin', () => {
    expect(viewTwin(undefined, place).toString()).toBe('')
  })
})
