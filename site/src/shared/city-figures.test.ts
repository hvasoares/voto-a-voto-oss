import { describe, expect, it } from 'vitest'
import { candidateRows, turnoutBarProps } from './city-figures'
import { testContext } from './test-context'

const { data } = testContext()

describe('city figures from the data layer (fixture = Sketch city card)', () => {
  it('derives the voted/not-voted bar of Cidade Exemplo 2026 round 1', async () => {
    const city = (await data.city('rj', 'cidade-exemplo'))!
    expect(await turnoutBarProps(data, city, 2026, 1)).toEqual({
      votedPct: 70,
      notVoted: { abstencaoPct: 78, brancosPct: 10, nulosPct: 12 },
      candidates: { a: { label: 'Candidato A', pct: 52 }, b: { label: 'Candidato B', pct: 48 } },
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

  it('returns undefined (never zeros) for a cycle the city has no data in', async () => {
    const city = (await data.city('mt', 'boa-esperanca-do-norte'))!
    expect(await turnoutBarProps(data, city, 2018, 1)).toBeUndefined()
    expect(await candidateRows(data, city, 2018, 1)).toEqual([])
  })
})
