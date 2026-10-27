import { describe, expect, it } from 'vitest'
import type { CityShard } from '../city-shard'
import type { TotalsFile } from '../shard-files'
import { failedChecks, runChecks, sealLines, sealProblems } from './checks'

const city = (uf: string, aptos: number, comparecimento: number, validos: number): CityShard => ({ city: { uf, slug: uf, nome: uf, regiao: 'sul', cdMunicipio: '1', cdIbge: '1', ciclos: [2026] }, cycles: { '2026': { '2': { aptos, comparecimento, validos } } }, candidates: {} })
const cities = [city('rj', 1000, 800, 700), city('sp', 3000, 2500, 2300)]
const totals: TotalsFile = { national: { '2026': { '2': { aptos: 4000, comparecimento: 3300, validos: 3000 } } }, regions: { sul: { '2026': { '2': { aptos: 4000, comparecimento: 3300, validos: 3000 } } } } }
const edition = { '2026-2': { comparecimento: 3300, validos: 3000 } }
const rounds = [{ ano: 2026, turno: 2 }]

describe('the seal checks', () => {
  const checks = runChecks(cities, totals, edition)

  it('measure the site against the edition totals and the municipalities against the country, for every round', () => {
    expect(checks.map((c) => [c.kind, c.ano, c.turno, c.ok])).toEqual([['national', 2026, 2, true], ['municipios', 2026, 2, true]])
    expect(checks[1]!.items).toEqual([{ field: 'aptos', got: 4000, want: 4000 }, { field: 'comparecimento', got: 3300, want: 3300 }, { field: 'validos', got: 3000, want: 3000 }])
  })

  it('write the seal from the measured numbers, naming what each was checked against', () => {
    expect(sealLines(checks, ['national', 'municipios'], rounds, { date: '2026-10-27' })).toEqual([
      'Contra o total nacional da edição de 27/10/2026 (2026, 2º turno): 3.300 comparecimentos e 3.000 votos válidos, iguais.',
      'Contra a soma dos 2 municípios e postos do exterior (2026, 2º turno): 4.000 eleitores aptos, 3.300 comparecimentos e 3.000 votos válidos, iguais ao total do país.',
    ])
  })

  it('fail when a city does not add up (and the seal has no line for it)', () => {
    const bad = runChecks([city('rj', 1000, 800, 701), cities[1]!], totals, edition)
    expect(failedChecks(bad)).toEqual(['municipios 2026 round 2: validos 3001 != 3000'])
    expect(sealLines(bad, ['municipios'], rounds, { date: '2026-10-27' })).toEqual([])
    expect(sealProblems(bad, ['municipios'], rounds)).toEqual(['no passing municipios check for 2026 round 2'])
  })

  it('fail when the edition recorded other totals, or none', () => {
    expect(failedChecks(runChecks(cities, totals, { '2026-2': { comparecimento: 3300, validos: 2999 } }))).toEqual(['national 2026 round 2: validos 3000 != 2999'])
    expect(failedChecks(runChecks(cities, totals, {}))).toHaveLength(1)
  })

  it('fail when the regions do not add up to the country', () => {
    const skew: TotalsFile = { ...totals, regions: { sul: { '2026': { '2': { aptos: 3999, comparecimento: 3300, validos: 3000 } } } } }
    expect(failedChecks(runChecks(cities, skew, edition))).toEqual(['municipios 2026 round 2: regions aptos 3999 != 4000'])
  })
})
