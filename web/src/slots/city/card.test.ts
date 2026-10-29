import { describe, expect, it } from 'vitest'
import { buildCityResult } from '../../shared/city-model'
import { headline } from '../../lib/sentences/headline'
import { factLinks, FactGateError } from '../../lib/facts/gate'
import { viewFacts } from '../../lib/facts/model'
import { questionOf } from '../../lib/question'
import { headlineId, viewQuestion, viewFigures, viewMargin, viewPanel, viewTwin } from './card'

const result = buildCityResult({
  turnout: { ano: 2026, turno: 1, uf: 'rj', cdMunicipio: '1', aptos: 100000, comparecimento: 76600, abstencoes: 23400, brancos: 3000, nulos: 3600, anuladosApuSep: 0, validos: 70000 },
  votes: [{ ano: 2026, turno: 1, uf: 'rj', cdMunicipio: '1', candidatoNumero: 1, votos: 36400 }, { ano: 2026, turno: 1, uf: 'rj', cdMunicipio: '1', candidatoNumero: 2, votos: 33600 }],
  candidates: ['Candidato A', 'Candidato B'].map((nomeUrna, i) => ({ ano: 2026, turno: 1 as const, candidatoNumero: i + 1, nomeUrna, partido: 'P' })),
})
const place = { cityName: 'Cidade Exemplo' }
const facts = viewFacts(result, { uf: 'rj', slug: 'cidade-exemplo', name: 'Cidade Exemplo' })
const links = factLinks(facts, 'the card test')

describe('"De onde vem este número?" on the figures', () => {
  const html = viewPanel(result, place, '2026-1', links).toString()
  const hrefs = [...html.matchAll(/<a class="calc" href="([^"]+)">De onde vem este número\?<\/a>/g)].map((m) => m[1])

  it('sits next to every figure: both bars, the six legend rows and the sentence', () => {
    expect(hrefs.map((h) => h!.split('#')[1])).toEqual(['votaram', 'naoVotaram', 'a', 'b', 'abstencao', 'brancos', 'nulos', 'frase'])
    expect(new Set(hrefs.map((h) => h!.split('#')[0]))).toEqual(new Set(['/fato/rj/cidade-exemplo/2026-1/']))
  })
  it('the link is inside its legend row and its title, so a figure is never without it', () => {
    expect((html.match(/<li class="legend__row"[^>]*>(?:(?!<\/li>).)*class="calc"/g) ?? []).length).toBe(5)
    expect((html.match(/<h2 class="turnout__title">(?:(?!<\/h2>).)*class="calc"/g) ?? []).length).toBe(2)
  })
  it('the margin line has its own link, after both registers', () => {
    expect(viewMargin(result, place, links).toString()).toMatch(/<\/p><a class="calc" href="\/fato\/rj\/cidade-exemplo\/2026-1\/#margem">De onde vem este número\?<\/a>$/)
  })
  it('the build gate: a card whose records lack a source cannot be drawn', () => {
    const broken = facts.map((f) => (f.anchor === 'votaram' ? { ...f, source: undefined } : f))
    expect(() => factLinks(broken, 'the failing fixture')).toThrow(/votaram: no source/)
  })
  it('the build gate: a figure with no record cannot be drawn', () => {
    const without = factLinks(facts.filter((f) => f.anchor !== 'nulos'), 'the failing fixture')
    expect(() => viewFigures(result, place, without)).toThrow(FactGateError)
  })
  it('the sentence of the headline and the share text are unchanged by the links', () => {
    expect(html).toContain(`<p class="city-headline" data-headline>${headline(result, place)}</p>`)
  })
})

describe('card panel', () => {
  const html = viewPanel(result, place, '2026-1', links).toString()

  it('carries the headline in both registers, the standard one first', () => {
    expect(html).toContain(headline(result, place))
    expect(html).toContain(headline(result, { ...place, register: 'plain' }))
    expect(html.indexOf('data-register="standard"')).toBeLessThan(html.indexOf('data-register="plain"'))
  })
  it('is described by its sentence block, and that block announces changes politely', () => {
    expect(html).toContain(`id="${headlineId('2026-1')}" aria-live="polite"`)
  })
  it('has the switch hidden (it needs scripts), as a labelled group of two toggle buttons, standard pressed', () => {
    expect(html).toMatch(/<div class="register" role="group" aria-label="Estilo da frase" data-register-switch hidden>/)
    expect(html).toMatch(/data-register-choice="standard" aria-pressed="true">Texto integral</)
    expect(html).toMatch(/data-register-choice="plain" aria-pressed="false">Linguagem simples</)
  })
  it('a cycle without data says so in both registers and has no switch', () => {
    const none = viewPanel(undefined, place, '2018-1', links).toString()
    expect(none).toContain('Sem dados nesse ciclo.')
    expect(none).toContain('Não temos dados dessa eleição para este lugar.')
    expect(none).not.toContain('data-register-switch')
  })
})

describe('margin line of a view', () => {
  it('is in both registers, the standard one first, with the frame figures', () => {
    const html = viewMargin(result, place, links).toString()
    expect(html).toContain('Faltaram 2.800 votos para virar: cabem 10 vezes nos 30.000 que não votaram.')
    expect(html).toContain('Esse número cabe 10 vezes nas 30.000 pessoas que não votaram.')
    expect(html.indexOf('data-register="standard"')).toBeLessThan(html.indexOf('data-register="plain"'))
  })
  it('is empty when the round has nothing to turn or no data', () => {
    expect(viewMargin(undefined, place, links).toString()).toBe('')
  })
})

describe('question and answer of the city (#44)', () => {
  const html = viewQuestion(questionOf({ kind: 'switched2022' }, false), place).toString()
  it('opens with the question, then "Sim" and the arc label in both registers, the standard one first, in the page text', () => {
    expect(html.indexOf('<h2 class="city-q__q"')).toBeLessThan(html.indexOf('city-q__yn'))
    expect(html).toContain('Cidade Exemplo mudou de lado em 2022?')
    expect(html).toContain('data-answer="yes"')
    expect(html).toContain('data-arc="switched2022" hidden')
    expect(html).toContain('A pergunta precisa de scripts para ser feita')
    expect(html).toContain('<p class="city-q__yn">Sim.</p>')
    expect(html).toContain('Mudou de lado em 2022')
    expect(html).toContain('Descreve a sequência, não a causa.')
    expect(html).toContain('Em 2022, o lado com mais votos no 2º turno mudou')
    expect(html.indexOf('data-register="standard"')).toBeLessThan(html.indexOf('data-register="plain"'))
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
  it('links the twin card, with the name and the state, in both registers', () => {
    expect(html).toContain('href="/sp/vila-modelo/"')
    expect(html).toContain('Cidade gêmea: Vila Modelo · SP')
    expect(html).toContain('Cidade parecida: Vila Modelo · SP')
  })
  it('says what the match uses: size, turnout, margin and the history of the cycles', () => {
    expect(html).toContain('Perfil parecido de porte, participação, margem e histórico.')
  })
  it('shows nothing, and no empty link, when the city has no twin', () => {
    expect(viewTwin(undefined, place).toString()).toBe('')
  })
})
