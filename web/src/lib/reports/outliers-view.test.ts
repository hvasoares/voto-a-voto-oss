import { describe, expect, it } from 'vitest'
import { OUTLIER_PLAIN, OUTLIER_STANDARD } from '../sentences/catalog-outliers'
import { outlierView, outlierShare } from './outliers-view'
import { OUTLIERS_SHOWN, type OutlierRow } from './outliers'

const row = (over: Partial<OutlierRow> = {}): OutlierRow => ({
  uf: 'mg', slug: 'cidade-alfa', cdMunicipio: '1', nome: 'CIDADE ALFA', aptos: 21_300, comparecimento: 12_410, validos: 12_410,
  turnout: 58.2, typicalTurnout: 76.4, turnoutGap: -18.2,
  votos26: { primeiro: 6_000, segundo: 6_410 }, validos22: 12_000, votos22: { primeiro: 6_200, segundo: 5_800 },
  margin26: -3.3, margin22: 3.3, swing: -2.1, typicalSwing: -0.3, swingGap: -1.8, distance: 9.5, peers: [], ...over,
})
const names = { primeiro: 'Lula', segundo: 'Flavio' }
const states = [{ uf: 'mg', name: 'Minas Gerais' }, { uf: 'rj', name: 'Rio de Janeiro' }]
const build = (over: Partial<Parameters<typeof outlierView>[0]> = {}) =>
  outlierView({ filter: { uf: undefined, min: 5_000 }, shown: [row(), row({ uf: 'rj', slug: 'cidade-beta', nome: 'CIDADE BETA', turnout: 61, typicalTurnout: 77.1, turnoutGap: -16.1, swing: 0.4, typicalSwing: 0, validos: 8_932 })], compared: 120, names, states, base: '/', ...over })

describe('the screening list: the words', () => {
  it('opens with the text that says it is a screening list and not a conclusion (both registers)', () => {
    expect(build().screening).toBe('Lista de triagem, não uma conclusão: cidades mais distantes de cidades parecidas no comparecimento e na virada desde 2022.')
    expect(build({ register: 'plain' }).screening).toContain('Não é uma conclusão')
  })

  it('the share text carries the screening text and the link, and names no city', () => {
    const s = outlierShare('https://exemplo.test/relatorios/cidades-fora-da-curva/')
    expect(s.text).toBe('Lista de triagem, não uma conclusão: cidades mais distantes de cidades parecidas no comparecimento e na virada desde 2022. https://exemplo.test/relatorios/cidades-fora-da-curva/')
    expect(s.text).not.toMatch(/Cidade (Alfa|Beta)/i)
  })

  it('no sentence of the report accuses, explains or concludes (both registers)', () => {
    const banned = /irregular|suspeit|fraude|manipul|erro|errad|culpa|porque|devido|vence|venceu|ganh|derrot|decid|explica/i
    for (const t of [...Object.values(OUTLIER_STANDARD), ...Object.values(OUTLIER_PLAIN)]) expect(t).not.toMatch(banned)
  })
})

describe('the rows', () => {
  const v = build()
  it('are ranked from 1 in the order given, each linking to the city card', () => {
    expect(v.rows.map((r) => [r.rank, r.name, r.href])).toEqual([[1, 'Cidade Alfa/MG', '/mg/cidade-alfa/'], [2, 'Cidade Beta/RJ', '/rj/cidade-beta/']])
  })
  it('print the valid-vote count next to the rate', () => {
    expect(v.rows[0]!.turnoutLine).toBe('58,2% (típico 76,4%)')
    expect(v.rows[0]!.validosLine).toBe('12.410 votos válidos')
    expect(v.rows[1]!.validosLine).toBe('8.932 votos válidos')
  })
  it('print the gap and the swing with their signs, and the typical swing', () => {
    expect(v.rows[0]).toMatchObject({ gap: '-18,2 pp', swing: '-2,1 pp', swingLine: 'virada desde 2022 -2,1 pp (típica -0,3 pp)' })
    expect(v.rows[1]).toMatchObject({ gap: '-16,1 pp', swing: '+0,4 pp' })
  })
  it('the anchor of a row is the id of its fact record', () => {
    expect(v.rows.map((r) => r.anchor)).toEqual(['mg-cidade-alfa', 'rj-cidade-beta'])
  })
  it('respects the base of the site in the links', () => {
    expect(build({ base: '/voto-a-voto-oss/' }).rows[0]!.href).toBe('/voto-a-voto-oss/mg/cidade-alfa/')
  })
})

describe('the filters', () => {
  const v = build({ filter: { uf: 'mg', min: 20_000 } })
  it('say what is chosen, in the words of the frame', () => {
    expect(v.filters.uf.label).toBe('Estado: Minas Gerais')
    expect(v.filters.min.label).toBe('Mínimo: 20 mil votos')
    expect(build().filters.uf.label).toBe('Estado: todos')
    expect(build({ filter: { uf: undefined, min: 1_000 } }).filters.min.label).toBe('Mínimo: 1 mil votos')
  })
  it('every option is a link to a static address that keeps the other filter, and the current one is marked', () => {
    expect(v.filters.uf.options.map((o) => [o.label, o.href, o.current])).toEqual([
      ['todos', '/relatorios/cidades-fora-da-curva/todos/20000/', false],
      ['Minas Gerais', '/relatorios/cidades-fora-da-curva/mg/20000/', true],
      ['Rio de Janeiro', '/relatorios/cidades-fora-da-curva/rj/20000/', false],
    ])
    expect(v.filters.min.options.map((o) => [o.label, o.href, o.current])).toEqual([
      ['1 mil', '/relatorios/cidades-fora-da-curva/mg/1000/', false],
      ['5 mil', '/relatorios/cidades-fora-da-curva/mg/5000/', false],
      ['20 mil', '/relatorios/cidades-fora-da-curva/mg/20000/', true],
      ['50 mil', '/relatorios/cidades-fora-da-curva/mg/50000/', false],
    ])
  })
  it('the count says how many were compared and how many are shown, for the state and the minimum', () => {
    expect(v.count).toBe('Mostrando 2 de 120 cidades com 20 mil ou mais votos válidos no 2º turno de 2026, em Minas Gerais.')
    expect(build().count).toContain('em todo o país')
  })
  it('an empty result says so instead of an empty list', () => {
    const e = build({ shown: [], compared: 0 })
    expect(e.rows).toEqual([])
    expect(e.empty).toBe('Nenhuma cidade com 5 mil ou mais votos válidos em todo o país.')
  })
  it(`never lists more than ${OUTLIERS_SHOWN}`, () => {
    expect(() => build({ shown: Array.from({ length: OUTLIERS_SHOWN + 1 }, () => row()) })).toThrow(/at most/)
  })
})

describe('the sign convention', () => {
  it('names both candidates of the pair and the direction of the signs, once', () => {
    expect(build().sign).toBe('Virada desde 2022: quanto a margem entre Lula e Flavio no 2º turno mudou, em pontos percentuais. O sinal + quer dizer que a margem cresceu no sentido de Lula; o sinal −, no de Flavio.')
  })
})
