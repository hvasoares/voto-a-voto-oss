import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DETALHE } from './catalog'
import { childrenSum, detalhe, detalheColumns } from './detalhe'
import { assertCatalog } from './panels'
import { placesWithShards, readPlace } from './shards'

const root = resolve(process.cwd(), 'fixtures/data/nerds')
const known = placesWithShards(root)
const csv = (name: string) => {
  const [head, ...lines] = readFileSync(resolve(process.cwd(), 'fixtures/data', name), 'utf8').trim().split('\n')
  const keys = head!.split(',')
  return lines.map((l) => Object.fromEntries(l.split(',').map((v, i) => [keys[i]!, v])))
}
const spec = (level: 'brasil' | 'regiao' | 'uf', id: string | null, ano = 2022) => {
  const all = readPlace(level, id, root)
  return detalhe(DETALHE, { 1: all.get(`${ano}-1`), 2: all.get(`${ano}-2`) }, known)
}
const int = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')

describe('Tabela de detalhe, every level from its own shard with identical columns', () => {
  it('has a record that passes the gates and takes its columns from the measure family', () => {
    expect(() => assertCatalog([DETALHE])).not.toThrow()
    expect(() => detalheColumns('candidatos', [1, 2])).toThrow('no columns for the candidatos family')
  })

  const levels = [['brasil', null, ['Exterior', 'Sudeste']], ['regiao', 'sudeste', ['Rio de Janeiro', 'São Paulo']], ['uf', 'rj', ['Cidade Exemplo', 'Cidade Exemplo A', 'Cidade Exemplo B', 'Cidade Exemplo C', 'Cidade Exemplo D', 'Cidade Exemplo E']]] as const
  it.each(levels)('%s %s lists its children alphabetically, never by result, with the level total last', (level, id, names) => {
    const s = spec(level, id)
    expect(s.columns.map((c) => c.key)).toEqual(['nome', 'eleitorado', 'comparecimento-1', 'comparecimento-2', 'abstencao-1', 'abstencao-2', 'brancos_nulos-1', 'brancos_nulos-2'])
    const rows = s.rows.filter((r) => !r.total)
    expect(rows.map((r) => r.cells[0])).toEqual(names)
    expect(s.rows.at(-1)!.total).toBe(true)
  })

  it.each(levels)('%s %s: the last row equals the sum of the children (eleitorado, from the shard) ', (level, id) => {
    const s = spec(level, id)
    expect(s.rows.at(-1)!.cells[1]).toBe(int(childrenSum(s)))
    expect(s.rows.at(-1)!.values![1]).toBe(childrenSum(s))
  })

  it('opens Brasil into its regiões and a região into its UFs: only the places with a page link and open', () => {
    const brasil = spec('brasil', null)
    expect(brasil.rows.find((r) => r.id === 'sudeste')).toMatchObject({ open: { level: 'regiao', id: 'sudeste' }, href: 'dados-para-nerds/regiao/sudeste/' })
    expect(brasil.rows.find((r) => r.id === 'exterior')!.open).toBeUndefined()
    expect(spec('regiao', 'sudeste').rows.find((r) => r.id === 'rj')).toMatchObject({ open: { level: 'uf', id: 'rj' }, href: 'dados-para-nerds/estado/rj/' })
    expect(spec('uf', 'rj').rows[0]).toMatchObject({ href: 'rj/cidade-exemplo/' })
    expect(spec('uf', 'rj').rows[0]!.open).toBeUndefined()
  })

  it('prints the shard values of every município of rj equal to the source CSV (golden)', () => {
    const cities = csv('cities.csv').filter((c) => c.uf === 'rj')
    const s = spec('uf', 'rj', 2022)
    for (const city of cities) {
      const row = s.rows.find((r) => r.id === city.slug)!
      const t1 = csv('turnout.csv').find((r) => r.ano === '2022' && r.turno === '1' && r.cd_municipio === city.cd_municipio)!
      expect(row.cells[1], city.slug).toBe(int(Number(t1.aptos)))
      expect(row.cells[2], city.slug).toBe(`${(Math.round((Number(t1.comparecimento) / Number(t1.aptos)) * 1000) / 10).toFixed(1).replace('.', ',')}%`)
    }
  })

  it('reads "sem 2º turno" (null) for a place with no 2º turno row, never a zero, and the sort values are null too', () => {
    const all = readPlace('uf', 'rj', root)
    const first = all.get('2022-2')!
    const gone = { ...first, children: { municipios: first.children.municipios!.filter((m) => m.id !== 'cidade-exemplo-a') } }
    const s = detalhe(DETALHE, { 1: all.get('2022-1'), 2: gone }, known)
    const row = s.rows.find((r) => r.id === 'cidade-exemplo-a')!
    expect(row.cells[3]).toBeNull()
    expect(row.values![3]).toBeNull()
    expect(row.cells[2]).not.toBeNull()
  })
})
