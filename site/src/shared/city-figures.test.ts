import { describe, expect, it } from 'vitest'
import { candidateRows, loadCityResult, toLegendRows, toTurnoutBarProps, turnoutBarProps } from './city-figures'
import { testContext } from './test-context'

const { data } = testContext()

describe('city figures: model to component props (fixture = Sketch city card)', () => {
  it('derives the voted/not-voted bar of Cidade Exemplo 2026 round 1', async () => {
    const city = (await data.city('rj', 'cidade-exemplo'))!
    expect(await turnoutBarProps(data, city, 2026, 1)).toEqual({
      votedPct: 70,
      notVoted: { abstencaoPct: 78, brancosPct: 10, nulosPct: 12 },
      candidates: { a: { label: 'Candidato A', pct: 52, votos: 36400 }, b: { label: 'Candidato B', pct: 48, votos: 33600 } },
      others: undefined,
    })
  })

  it('lists the five legend rows with the votes of the frame', async () => {
    const city = (await data.city('rj', 'cidade-exemplo'))!
    const rows = await candidateRows(data, city, 2026, 1)
    expect(rows.map((r) => [r.label, r.votes, r.shareLabel])).toEqual([
      ['Candidato A', 36400, '52% dos votos'],
      ['Candidato B', 33600, '48% dos votos'],
      ['Abstenção', 23400, '78% dos que não votaram'],
      ['Brancos', 3000, '10% dos que não votaram'],
      ['Nulos', 3600, '12% dos que não votaram'],
    ])
  })

  it('no data: undefined / no rows, never zeros', async () => {
    const city = (await data.city('mt', 'boa-esperanca-do-norte'))!
    expect(await turnoutBarProps(data, city, 2018, 1)).toBeUndefined()
    expect(await candidateRows(data, city, 2018, 1)).toEqual([])
  })

  it('round 1 with many candidates adds the "Outros" segment and legend row', async () => {
    const city = (await data.city('rj', 'cidade-exemplo'))!
    const base = (await loadCityResult(data, city, 2026, 1))!
    const withOthers = {
      ...base,
      voted: [...base.voted, { key: 'outros' as const, label: 'Outros candidatos (11)', votos: 100, pct: 10 }],
    }
    expect(toTurnoutBarProps(withOthers).others).toEqual({ label: 'Outros candidatos (11)', pct: 10, votos: 100 })
    const rows = toLegendRows(withOthers)
    expect(rows.map((r) => r.kind)).toEqual(['a', 'b', 'outros', 'abstencao', 'brancos', 'nulos'])
    expect(rows[2]!.shareLabel).toBe('10% dos votos')
  })
})
