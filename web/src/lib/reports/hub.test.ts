/**
 * The hub headlines, pinned to the repo notes. Real data:
 * - "Lula virou 211 cidades; Flavio Bolsonaro virou 1" (frame 6 + highlights note)
 * - "Maior variação: Campos dos Goytacazes/RJ, +9,8 pp"
 * - "Lula: +3.862.039 votos no país"
 * - "Marquinho/PR: empate, diferença de 0 votos"
 * - "Mais alto: Santa Maria do Herval/RS, 90,5%. Mais baixo: Itaubal/AP, 59,0%"
 * The two rows that are lists (Comparar, Como cada grupo votou) carry a descriptive headline,
 * like the frame. Rows without a built report (tickets #13-15) have no `to`.
 */
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { diskSource } from '@site/data/node'
import { createStore } from '@site/data/store'
import { MIN_BIG_SWING_VALIDOS, computeReports, type MarginInput } from './compute'
import { formatInt } from './format'
import { hubRows } from './hub'
import { loadReportsData } from './load'

const REAL_DATA = resolve(import.meta.dirname, '../../../../data')

async function fixtureInput(): Promise<MarginInput> {
  return loadReportsData()
}

async function realInput(): Promise<MarginInput> {
  const store = createStore(diskSource(REAL_DATA))
  const [cities, votes, turnout, candidates] = await Promise.all([store.cities(), store.votes(), store.turnout(), store.candidates()])
  return { cities, votes, turnout, candidates }
}

describe('hub rows (fixture state)', () => {
  it('has seven rows', async () => {
    expect(hubRows(computeReports(await fixtureInput()), await fixtureInput())).toHaveLength(7)
  })

  it('the built report row announces the flips with the real candidate names the fixture plays', async () => {
    const input = await fixtureInput()
    const [first] = hubRows(computeReports(input), input)
    expect(first).toMatchObject({
      id: 'cidades-que-viraram',
      title: 'Cidades que viraram no 2º turno',
      headline: 'Candidato A virou 2 cidades; Candidato B virou 1',
      to: '/relatorios/cidades-que-viraram/',
    })
  })

  it('five rows are stubs (como-cada-grupo-votou is built, ticket #15): headline computed, no route', async () => {
    const input = await fixtureInput()
    const rows = hubRows(computeReports(input), input)
    expect(rows.filter((r) => r.to === undefined)).toHaveLength(5)
    expect(rows[1]).toMatchObject({ id: 'maiores-viradas', headline: `Nenhuma cidade de ${formatInt(MIN_BIG_SWING_VALIDOS)}+ votos válidos` }) // the fixtures have no 100 mil+ city
    expect(rows[2]).toMatchObject({ id: 'votos-ganhos-e-perdidos', headline: 'Candidato A: -14.914 votos no país' })
    expect(rows[3]).toMatchObject({ id: 'disputas-mais-apertadas', headline: 'Cidade Exemplo A/RJ: margem de -0,1 pp' })
    expect(rows[4]).toMatchObject({ id: 'comparecimento' })
    expect(rows[4]!.headline).toContain('Cidade Exemplo C/RJ, 78,2%. Mais baixo: Cidade Exemplo E/RJ, 70,5%')
    expect(rows[5]).toMatchObject({ id: 'comparar', headline: 'Os seis maiores estados: Candidato A e Candidato B, votos e percentuais' })
    expect(rows[6]).toMatchObject({ id: 'como-cada-grupo-votou', headline: 'Cidades agrupadas por quem venceu em 2018 e 2022', to: '/relatorios/como-cada-grupo-votou/' })
  })
})

describe.skipIf(!existsSync(resolve(REAL_DATA, 'cities.csv')))('hub rows (real data, figures of the highlights note)', () => {
  it('every headline reproduces the frame 6 figures', async () => {
    const input = await realInput()
    const reports = computeReports(input)
    const rows = hubRows(reports, input)
    expect(rows[0]!.headline).toBe('Lula virou 211 cidades; Flavio Bolsonaro virou 1')
    expect(rows[1]!.headline).toBe('Maior variação: Campos dos Goytacazes/RJ, +9,8 pp')
    expect(rows[2]!.headline).toBe('Lula: +3.862.039 votos no país')
    expect(rows[3]!.headline).toBe('Marquinho/PR: empate, diferença de 0 votos')
    expect(rows[4]!.headline).toBe('Mais alto: Santa Maria do Herval/RS, 90,5%. Mais baixo: Itaubal/AP, 59,0%')
  })
})