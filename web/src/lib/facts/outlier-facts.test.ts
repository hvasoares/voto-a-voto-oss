import { describe, expect, it } from 'vitest'
import { FactGateError, factLinks, gateProblems } from './gate'
import { hubFacts, outlierCountRecord, outlierFactPages, outlierRecord, type Ctx } from './other'
import type { OutlierRow } from '../reports/outliers'

const row = (over: Partial<OutlierRow> = {}): OutlierRow => ({
  uf: 'mg', slug: 'cidade-alfa', cdMunicipio: '1', nome: 'CIDADE ALFA', aptos: 21_300, comparecimento: 12_410, validos: 12_000,
  turnout: 58.2, typicalTurnout: 76.4, turnoutGap: -18.2,
  votos26: { primeiro: 5_800, segundo: 6_200 }, validos22: 11_000, votos22: { primeiro: 5_700, segundo: 5_300 },
  margin26: -3.3, margin22: 3.6, swing: -6.9, typicalSwing: -0.3, swingGap: -6.6, distance: 9.5,
  peers: [1, 2, 3, 4, 5].map((n) => ({ key: `mg/par${n}`, uf: 'mg', slug: `par${n}`, nome: `PAR ${n}`, turnout: 70 + n, swing: n === 5 ? undefined : n })), ...over,
})
const names = { primeiro: 'Lula', segundo: 'Flavio' }
const label = (nome: string, uf: string) => `${nome[0]}${nome.slice(1).toLowerCase()}/${uf.toUpperCase()}`
const c: Ctx = { scope: 'relatorios/cidades-fora-da-curva', page: 'mg', fixture: true, checks: ['municipios'] }

describe('the record of a listed city', () => {
  const f = outlierRecord(c, row(), names, label)

  it('has an id of the place and the report, never a number or a position', () => {
    expect(f.id).toBe('relatorios/cidades-fora-da-curva/mg/mg-cidade-alfa')
    expect(outlierRecord(c, row({ turnout: 1, distance: 99 }), names, label).id).toBe(f.id)
  })

  it('passes the gate: source, calculation, inputs, check', () => {
    expect(gateProblems([f])).toEqual([])
    expect(f.checks).toEqual(['municipios'])
    expect(f.method!.href).toContain('cidades-fora-da-curva.md')
  })

  it('carries the votes of both cycles, the valid votes next to them and every peer with its own figures, so the typical can be recomputed', () => {
    const labels = f.inputs.map((i) => i.label)
    expect(labels).toEqual(expect.arrayContaining(['Comparecimento', 'Eleitores aptos', 'Votos válidos, 2026', 'Votos válidos, 2022', 'Votos de Lula em 2026', 'Votos de Flavio em 2022']))
    expect(f.inputs.filter((i) => /cidade parecida/.test(i.label))).toHaveLength(5)
    expect(f.inputs.find((i) => i.label === '1ª cidade parecida')!.value).toBe('Par 1/MG: comparecimento 71,0%, virada +1,0 pp')
    expect(f.inputs.find((i) => i.label === '5ª cidade parecida')!.value).toBe('Par 5/MG: comparecimento 75,0%, virada sem dados')
  })

  it('shows the calculation with the numbers in it, for the turnout and for the swing', () => {
    expect(f.calculation!.worked[0]).toBe('comparecimento: 12.410 ÷ 21.300 × 100 = 58,2%; típico, mediana de 5 cidades parecidas: 76,4%; diferença: -18,2 pp')
    expect(f.calculation!.worked[1]).toContain('margem 2026: (5.800 − 6.200) ÷ 12.000 × 100 = -3,3 pp')
    expect(f.calculation!.worked[1]).toContain('margem 2022: (5.700 − 5.300) ÷ 11.000 × 100 = +3,6 pp')
    expect(f.calculation!.worked[1]).toContain('típico, mediana de 4 cidades parecidas: -0,3 pp')
  })

  it('says only the numbers, in both registers: no cause, no accusation, no conclusion', () => {
    for (const s of [f.sentences.standard, f.sentences.plain]) {
      expect(s).toContain('Cidade alfa/MG')
      expect(s).toContain('12.000 votos válidos')
      expect(s).not.toMatch(/irregular|suspeit|fraude|manipul|erro|porque|devido|culpa|explica|conclus/i)
    }
    expect(f.sentences.standard).toContain('o comparecimento foi de 58,2%, contra 76,4% típico entre cidades parecidas')
  })
})

describe('the count of a list', () => {
  it('states the cities the filter compared, with the minimum and where', () => {
    const k = outlierCountRecord(c, 'filtro-mg-5000', { uf: 'mg', name: 'Minas Gerais' }, 5_000, 123)
    expect(gateProblems([k])).toEqual([])
    expect(k.sentences.standard).toBe('Cidades comparadas com cidades parecidas (em Minas Gerais), com 5.000 ou mais votos válidos no 2º turno de 2026: 123.')
    expect(outlierCountRecord(c, 'x', undefined, 1_000, 5).sentences.plain).toContain('em todo o país')
  })
})

describe('the pages of records', () => {
  const rows = [row(), row({ slug: 'cidade-beta', nome: 'CIDADE BETA' }), row({ uf: 'rj', slug: 'cidade-gama', nome: 'CIDADE GAMA' })]
  const counts = [{ uf: undefined, min: 5_000, n: 3 }, { uf: 'mg', min: 5_000, n: 2 }]
  const pages = outlierFactPages(rows, counts, names, label, (uf) => (uf === 'mg' ? 'Minas Gerais' : 'Rio de Janeiro'), true)

  it('has one page per state with the cities of that state, and one for the counts', () => {
    expect(pages.map((p) => [p.scope, p.page, p.facts.length])).toEqual([
      ['relatorios/cidades-fora-da-curva', 'mg', 2],
      ['relatorios/cidades-fora-da-curva', 'rj', 1],
      ['relatorios/cidades-fora-da-curva', 'filtros', 2],
    ])
    for (const p of pages) expect(gateProblems(p.facts)).toEqual([])
  })

  it('every record names the rounds the seal covers: the 2nd round of 2026 and of 2022', () => {
    expect(pages[0]!.rounds).toEqual([{ ano: 2026, turno: 2 }, { ano: 2022, turno: 2 }])
  })

  it('a list cannot print a row that has no record: the link for it throws', () => {
    const links = factLinks(pages.flatMap((p) => p.facts), '/relatorios/cidades-fora-da-curva/', '/')
    expect(links('mg-cidade-alfa')).toBe('/fato/relatorios/cidades-fora-da-curva/mg/#mg-cidade-alfa')
    expect(links('rj-cidade-gama')).toBe('/fato/relatorios/cidades-fora-da-curva/rj/#rj-cidade-gama')
    expect(() => links('mg-cidade-sem-registro')).toThrow(FactGateError)
  })

  it('a record that lost its calculation or its inputs does not pass the gate, so the page would not build', () => {
    const good = pages[0]!.facts[0]!
    expect(gateProblems([{ ...good, calculation: undefined }])[0]).toContain('no calculation')
    expect(gateProblems([{ ...good, inputs: [] }])[0]).toContain('no inputs')
    expect(() => factLinks([{ ...good, calculation: undefined }], 'x')).toThrow(FactGateError)
  })
})

describe('the hub row', () => {
  it('has a record for the count its headline states', () => {
    const page = hubFacts({ names, flips: { primeiro: 1, segundo: 1 }, net: { primeiro: { total: 0, cities: { gained: 0, lost: 0 } }, segundo: { total: 0, cities: { gained: 0, lost: 0 } } }, turnout: {}, outliers: { n: 4321, min: 5_000 } }, label, true)
    const f = page.facts.find((x) => x.anchor === 'cidades-fora-da-curva')!
    expect(f.sentences.standard).toContain('4.321')
    expect(gateProblems(page.facts)).toEqual([])
  })
})
