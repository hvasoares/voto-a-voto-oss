import { describe, expect, it } from 'vitest'
import { stayHomeModel, viewSlug, parseViewSlug } from './stay-home-view'
import type { StayHomeRow, StayHomeView } from './stay-home'

const rows: StayHomeRow[] = [
  { uf: 'rj', aptos: 1000, naoVotaram: 250, share: 25 },
  { uf: 'sp', aptos: 3000, naoVotaram: 633, share: 21.1 },
  { uf: 'mt', aptos: 500, naoVotaram: 100, share: 20 },
]
const views: StayHomeView[] = [
  { ano: 2026, turno: 1 },
  { ano: 2026, turno: 2 },
  { ano: 2022, turno: 1 },
]
const model = (over: Partial<Parameters<typeof stayHomeModel>[0]> = {}) => stayHomeModel({ view: views[0]!, views, rows, claim: { cities: 100, greater: 52, tenths: 520 }, ...over })

describe('view slugs', () => {
  it('round trip', () => {
    expect(viewSlug({ ano: 2022, turno: 2 })).toBe('2022-2')
    expect(parseViewSlug('2022-2')).toEqual({ ano: 2022, turno: 2 })
  })
  it.each(['', '2022', '2022-3', 'x-1', '2022-1-1'])('refuses %j', (s) => expect(parseViewSlug(s)).toBeUndefined())
})

describe('the model of the screen', () => {
  it('prints the percentage of every state, never only a colour', () => {
    const m = model()
    expect(m.cells.rj!.text).toBe('25,0%')
    expect(m.cells.sp!.text).toBe('21,1%')
    expect(m.cells.mt!.label).toBe('MT · Mato Grosso: 20,0% do eleitorado não votou em ninguém; 100 de 500 eleitores aptos')
  })

  it('lists the cycles and rounds, marking the one shown', () => {
    const m = model({ view: views[2]! })
    expect(m.views.map((v) => [v.label, v.slug, v.current])).toEqual([
      ['2026 · 1º turno', '2026-1', false],
      ['2026 · 2º turno', '2026-2', false],
      ['2022 · 1º turno', '2022-1', true],
    ])
  })

  it('orders by electorate size and starts on the largest state: no ranking by the value', () => {
    const m = model()
    expect(m.order).toEqual(['sp', 'rj', 'mt'])
    expect(m.defaultUf).toBe('sp')
  })

  it('the selected-state panel says the electorate and who did not vote', () => {
    const m = model()
    expect(m.cells.sp!.selected).toBe('SP · selecionado')
    expect(m.cells.sp!.lines[0]).toBe('Eleitores aptos: 3.000 · não votaram: 633')
    expect(m.cells.sp!.lines[1]).toContain('Exterior não aparece como estado')
  })

  it('carries the per-cycle claim with its limits, or none when the measure has no cities', () => {
    expect(model().claim!.line).toContain('Em 52,0% das cidades')
    expect(model().claim!.line).toContain('1º turno de 2026')
    expect(model({ claim: undefined }).claim).toBeUndefined()
  })

  it('the colour step grows with the share and the legend lists every edge', () => {
    const m = model()
    expect(m.cells.rj!.bin).toBeGreaterThan(m.cells.mt!.bin)
    expect(m.legend.edges).toEqual(['17', '20', '23', '26', '29', '32'])
    expect(m.legend.fills).toHaveLength(7)
  })

  it('has no candidate and no state outside the rows (overseas is never invented)', () => {
    const m = model()
    expect(Object.keys(m.cells).sort()).toEqual(['mt', 'rj', 'sp'])
    expect(JSON.stringify(m)).not.toMatch(/Lula|Flavio|Candidato/)
  })

  it('a view without rows has no states and says so', () => {
    const m = model({ rows: [] })
    expect(m.order).toEqual([])
    expect(m.defaultUf).toBe('')
    expect(m.empty).toBe('Não há dados do 1º turno de 2026 neste conjunto.')
  })

  it('plain register reads simply', () => {
    expect(model({ register: 'plain' }).cells.sp!.lines[0]).toBe('Eleitores que podiam votar: 3.000. Não votaram: 633.')
  })
})
