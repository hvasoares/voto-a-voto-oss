import { describe, expect, it } from 'vitest'
import { buildCityResult } from '../../shared/city-model'
import { headline } from '../sentences/headline'
import { marginLine } from '../sentences/margin'
import { assertPublishable, factLinks, factProblems, FactGateError, gateProblems } from './gate'
import { curiosityFacts, factHref, factId, factPage, factPath, viewFacts, type Fact, type FactPlace } from './model'

const row = (ano: number, turno: 1 | 2, aptos: number, comparecimento: number, brancos: number, nulos: number, validos: number) => ({ ano, turno, uf: 'rj', cdMunicipio: '1', aptos, comparecimento, abstencoes: aptos - comparecimento, brancos, nulos, anuladosApuSep: 0, validos })
const build = (turnout: ReturnType<typeof row>, votos: number[]) =>
  buildCityResult({
    turnout,
    votes: votos.map((v, i) => ({ ano: turnout.ano, turno: turnout.turno, uf: 'rj', cdMunicipio: '1', candidatoNumero: i + 1, votos: v })),
    candidates: votos.map((_, i) => ({ ano: turnout.ano, turno: turnout.turno, candidatoNumero: i + 1, nomeUrna: `Candidato ${'ABCDE'[i]}`, partido: 'P' })),
  })
const result = build(row(2026, 1, 100000, 76600, 3000, 3600, 70000), [36400, 33600])
const place: FactPlace = { uf: 'rj', slug: 'cidade-exemplo', name: 'Cidade Exemplo' }
const byAnchor = (facts: Fact[]) => Object.fromEntries(facts.map((f) => [f.anchor, f]))

describe('the facts of a view', () => {
  const facts = viewFacts(result, place)
  const f = byAnchor(facts)

  it('has one record for every figure of the card: the sentence, both bars, every legend row and the margin', () => {
    expect(facts.map((x) => x.anchor)).toEqual(['frase', 'votaram', 'naoVotaram', 'a', 'b', 'abstencao', 'brancos', 'nulos', 'margem'])
  })

  it('every record has a source and a calculation, so the gate lets the card through', () => {
    expect(gateProblems(facts)).toEqual([])
    expect(facts.every((x) => x.source?.url.startsWith('https://dadosabertos.tse.jus.br') && x.calculation?.formula && x.calculation.worked.length > 0)).toBe(true)
  })

  it('"votaram" shows the inputs, the formula and the worked line with the same figure as the card', () => {
    expect(f.votaram!.inputs).toEqual([
      { label: 'Eleitores aptos', field: 'turnout.csv · aptos', value: '100.000' },
      { label: 'Votos válidos', field: 'turnout.csv · validos', value: '70.000' },
    ])
    expect(f.votaram!.calculation).toEqual({ formula: 'votos válidos ÷ eleitores aptos × 100', worked: ['70.000 ÷ 100.000 × 100 = 70%'] })
    expect(f.votaram!.shown).toBe('70%')
    expect(f.votaram!.sentences.standard).toBe('Em Cidade Exemplo, no 1º turno de 2026, votaram 70% do eleitorado: 70.000 votos válidos entre 100.000 eleitores aptos.')
  })

  it('"não votaram" is the electorate minus the valid votes', () => {
    expect(f.naoVotaram!.calculation!.worked).toEqual(['100.000 − 70.000 = 30.000', '30.000 ÷ 100.000 × 100 = 30%'])
    expect(f.naoVotaram!.shown).toBe('30%')
  })

  it('a candidate row divides the candidate votes by the valid votes and prints the legend figure', () => {
    expect(f.a!.shown).toBe('36.400 · 52% dos votos')
    expect(f.a!.calculation!.worked).toEqual(['36.400 ÷ 70.000 × 100 = 52%'])
    expect(f.a!.title).toBe('Candidato A')
  })

  it('the abstention row says how abstention is found (what is left of the people who did not vote)', () => {
    expect(f.abstencao!.calculation!.worked).toEqual(['30.000 − 6.600 = 23.400', '23.400 ÷ 30.000 × 100 = 78%'])
    expect(f.brancos!.inputs[0]).toMatchObject({ field: 'turnout.csv · brancos', value: '3.000' })
  })

  it('the sentence and the margin line are the very ones the card prints, in both registers', () => {
    expect(f.frase!.sentences.standard).toBe(headline(result, { cityName: 'Cidade Exemplo' }))
    expect(f.frase!.sentences.plain).toBe(headline(result, { cityName: 'Cidade Exemplo', register: 'plain' }))
    expect(f.margem!.sentences.standard).toBe(marginLine(result, { cityName: 'Cidade Exemplo' }))
    expect(f.margem!.calculation!.worked).toEqual(['36.400 − 33.600 = 2.800', '30.000 ÷ 2.800 = 10,7; parte inteira: 10'])
  })

  it('the margin cites the note of its method', () => {
    expect(f.margem!.method).toEqual({ name: 'Nota do método: não votantes e margem', href: expect.stringContaining('docs/nonvoters-vs-margin.md') })
  })

  it('a round with three candidates has the "Outros" row, with no dataset field (the project sums them)', () => {
    const three = viewFacts(build(row(2026, 1, 1000, 800, 10, 10, 780), [400, 300, 80]), place)
    const outros = byAnchor(three).outros!
    expect(outros.title).toBe('Outros candidatos (1)')
    expect(outros.inputs[0]!.field).toBeUndefined()
    expect(gateProblems(three)).toEqual([])
  })

  it('a tie has a margin of zero and says so in the worked line', () => {
    const tie = byAnchor(viewFacts(build(row(2026, 2, 1000, 800, 10, 10, 780), [390, 390]), place))
    expect(tie.margem!.calculation!.worked).toEqual(['390 − 390 = 0: empate na frente.'])
  })

  it('a margin larger than the people who did not vote has no "fits" step', () => {
    const wide = byAnchor(viewFacts(build(row(2026, 2, 1000, 990, 1, 1, 988), [900, 88]), place))
    expect(wide.margem!.calculation!.worked).toEqual(['900 − 88 = 812'])
  })

  it('an empty electorate divides by nothing: the worked line says so and the gate still passes', () => {
    const empty = viewFacts(build(row(2026, 1, 0, 0, 0, 0, 0), []), place)
    expect(byAnchor(empty).votaram!.calculation!.worked).toEqual(['0 é zero: não há o que dividir, e o cartão mostra 0%.'])
    expect(gateProblems(empty)).toEqual([])
  })

  it('no data in the cycle means no record (never a made-up zero)', () => {
    expect(viewFacts(undefined, place)).toEqual([])
  })

  it('the fixture source says the numbers are fictitious', () => {
    expect(viewFacts(result, { ...place, fixture: true })[1]!.source!.name).toContain('fictícios')
  })

  it('wording is neutral: no winner, no cause, in either register', () => {
    const text = facts.flatMap((x) => [x.sentences.standard, x.sentences.plain]).join(' ').toLowerCase()
    expect(text).not.toMatch(/vence|venceu|porque|por causa|ganhou|derrot|culpa|devido/)
  })
})

describe('fact ids and addresses', () => {
  it('name the place, the cycle, the round and the measure, never the numbers', () => {
    const a = viewFacts(result, place).map((x) => x.id)
    const b = viewFacts(build(row(2026, 1, 5, 4, 0, 0, 4), [3, 1]), place).map((x) => x.id)
    expect(a[1]).toBe('rj/cidade-exemplo/2026-1/votaram')
    expect(b[1]).toBe(a[1])
  })
  it('differ by round, cycle and place', () => {
    expect(factId('rj/x', factPage(2026, 1), 'votaram')).not.toBe(factId('rj/x', factPage(2026, 2), 'votaram'))
    expect(factId('rj/x', factPage(2022, 1), 'votaram')).not.toBe(factId('rj/y', factPage(2022, 1), 'votaram'))
  })
  it('the address is a path under /fato/ and the fragment names the record, relative to the base', () => {
    expect(factPath('rj/cidade-exemplo', '2026-1')).toBe('fato/rj/cidade-exemplo/2026-1/')
    expect(factHref({ scope: 'rj/x', page: '2026-1', anchor: 'a' }, '/voto-a-voto-oss/')).toBe('/voto-a-voto-oss/fato/rj/x/2026-1/#a')
  })
  it('are unique inside a page', () => {
    const ids = viewFacts(result, place).map((x) => x.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('curiosity facts', () => {
  const facts = curiosityFacts([{ code: 'td', rank: 3, n: 48, cycles: [2022, 2026] }], place, () => ({ what: 'maior queda', group: 'Grupo: 48 cidades' }))
  it('cite the method notes, the group and the rank, and pass the gate', () => {
    expect(facts[0]!.id).toBe('rj/cidade-exemplo/comparacoes/td')
    expect(facts[0]!.method!.href).toContain('web/docs/curiosities.md')
    expect(facts[0]!.inputs.map((i) => i.value)).toEqual(['3ª', '48', '2022, 2026'])
    expect(gateProblems(facts)).toEqual([])
  })
})

describe('the build gate', () => {
  const [good] = viewFacts(result, place) as [Fact]
  const noSource: Fact = { ...good, id: 'rj/x/2026-1/votaram', source: undefined }
  const noCalculation: Fact = { ...good, id: 'rj/x/2026-1/a', calculation: { formula: '', worked: [] } }

  it('fails a number with no source and a number with no calculation, naming each', () => {
    expect(factProblems(noSource)).toEqual(['no source'])
    expect(factProblems(noCalculation)).toEqual(['no calculation'])
    expect(() => assertPublishable([good, noSource, noCalculation], 'the city page')).toThrow(/the city page[\s\S]*votaram: no source[\s\S]*2026-1\/a: no calculation/)
  })
  it('fails a source that is not an address and a repeated id', () => {
    expect(factProblems({ ...good, source: { name: 'TSE', url: 'tse' } })).toEqual(['no source'])
    expect(gateProblems([good, good])).toEqual([`${good.id}: id used twice`])
  })
  it('refuses the link of a figure that has no record', () => {
    const link = factLinks(viewFacts(result, place), 'the city page')
    expect(link('votaram')).toBe('/fato/rj/cidade-exemplo/2026-1/#votaram')
    expect(() => link('abstinencia')).toThrow(FactGateError)
  })
  it('refuses to hand out any link when one record fails', () => {
    expect(() => factLinks([good, noSource], 'the city page')).toThrow(FactGateError)
  })
})
