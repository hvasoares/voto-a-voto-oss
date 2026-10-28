import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DISTRIBUICAO, PAR_RECORD } from './catalog'
import { bins, buildDistribuicao, fences, fiveNumber, oneDecimal, printedFive } from './distribuicao'
import { assertCatalog } from './panels'
import { par, PAR_NOTE } from './par'
import { readPlace } from './shards'

const root = resolve(process.cwd(), 'fixtures/data/nerds')
const table = (name: string) => {
  const [head, ...lines] = readFileSync(resolve(process.cwd(), 'fixtures/data', name), 'utf8').trim().split('\n')
  const keys = head!.split(',')
  return lines.map((l) => Object.fromEntries(l.split(',').map((v, i) => [keys[i]!, v]))) as Record<string, string>[]
}
const cities = table('cities.csv')
const turnout = table('turnout.csv')
const cycle = (level: 'brasil' | 'regiao' | 'uf', id: string | null, ano: number) => {
  const all = readPlace(level, id, root)
  return { 1: all.get(`${ano}-1`), 2: all.get(`${ano}-2`) }
}

describe('five-number summary', () => {
  it('uses linear interpolation between ranks (a known sample)', () => {
    expect(fiveNumber([6, 1, 3, 2, 5, 4])).toEqual({ min: 1, q1: 2.25, median: 3.5, q3: 4.75, max: 6 })
    expect(fiveNumber([7])).toEqual({ min: 7, q1: 7, median: 7, q3: 7, max: 7 })
    expect(fences({ min: 0, q1: 10, median: 12, q3: 14, max: 20 })).toEqual([4, 20])
    expect(printedFive(fiveNumber([1, 2, 3])).map((f) => f.text)).toEqual(['1,0', '1,5', '2,0', '2,5', '3,0'])
    expect(oneDecimal(82.349)).toBe('82,3')
  })

  it('matches an independent computation from the CSV on the fixture (estado rj, comparecimento, 2022 1º turno)', () => {
    const rj = new Set(cities.filter((c) => c.uf === 'rj').map((c) => c.cd_municipio))
    const rates = turnout.filter((r) => r.ano === '2022' && r.turno === '1' && rj.has(r.cd_municipio!)).map((r) => (Number(r.comparecimento) / Number(r.aptos)) * 100)
    const spec = buildDistribuicao(DISTRIBUICAO, { cycle: cycle('uf', 'rj', 2022), all: new Map() })
    expect(spec.byKey['1-comparecimento']!.five).toEqual(fiveNumber(rates))
    expect(spec.byKey['1-comparecimento']!.n).toBe(rates.length)
  })
})

describe('Distribuição: bins', () => {
  it('uses fixed two-point bins aligned to even numbers and counts every value once', () => {
    const b = bins([70.6, 71.9, 72, 77.5, 87.7])
    expect(b.map((x) => [x.lo, x.hi])).toEqual([[70, 72], [72, 74], [74, 76], [76, 78], [78, 80], [80, 82], [82, 84], [84, 86], [86, 88]])
    expect(b.map((x) => x.count)).toEqual([2, 1, 0, 1, 0, 0, 0, 0, 1])
    expect(bins([98.5, 100]).at(-1)).toMatchObject({ hi: 100, count: 2 })
  })

  it.each([['brasil', null, 'UFs'], ['regiao', 'sudeste', 'UFs'], ['uf', 'rj', 'municípios']] as const)('%s: the counts sum to the number of children (%s)', (level, id, unit) => {
    const all = readPlace(level, id, root)
    const spec = buildDistribuicao(DISTRIBUICAO, { cycle: cycle(level, id, 2026), all })
    expect(spec.unit).toBe(unit)
    const children = level === 'brasil' ? 2 : level === 'regiao' ? 2 : 6 // fixture: rj+sp (+mt in 2026) on Brasil without the overseas post; rj and sp; six municípios of rj
    for (const key of Object.keys(spec.byKey)) {
      const d = spec.byKey[key]!
      expect(d.bins.reduce((t, b) => t + b.count, 0), `${level} ${key}`).toBe(d.n)
    }
    expect(spec.byKey['1-comparecimento']!.n).toBe(level === 'brasil' ? 3 : children)
  })

  it('names nobody: the spec holds numbers, the rule and no place name', () => {
    const spec = buildDistribuicao(DISTRIBUICAO, { cycle: cycle('uf', 'rj', 2026), all: new Map() })
    const text = JSON.stringify(spec)
    for (const name of ['Cidade Exemplo', 'cidade-exemplo', 'Rio de Janeiro']) expect(text).not.toContain(name)
    expect(spec.rule).toContain('1,5 × a amplitude interquartil')
    expect(spec.rule).toContain('Nenhum lugar é nomeado')
  })

  it('passes the gates', () => expect(() => assertCatalog([DISTRIBUICAO, PAR_RECORD])).not.toThrow())
})

describe('Par 1º→2º', () => {
  const shards = cycle('uf', 'rj', 2022)
  const sudeste = cycle('regiao', 'sudeste', 2022)
  const brasil = cycle('brasil', null, 2022)

  it('prints both values for the place, the região above it and Brasil, and nothing else', () => {
    const spec = par(PAR_RECORD, { own: { name: 'Rio de Janeiro', shards }, parent: { name: 'Sudeste', shards: sudeste }, brasil })
    expect(spec.rows.map((r) => r.cells[0])).toEqual(['Rio de Janeiro', 'Sudeste', 'Brasil'])
    expect(spec.columns.map((c) => c.label)).toEqual(['Lugar', '1º turno', '2º turno'])
    expect(spec.note).toBe(PAR_NOTE)
    // no computed difference anywhere: every printed cell is a rate of a shard, never a signed or "pp" figure
    const printable = new Set(spec.rows.flatMap((r) => r.cells.slice(1)))
    for (const cell of printable) expect(cell).toMatch(/^\d{1,3},\d%$/)
    expect(JSON.stringify(spec)).not.toMatch(/diferença(?! é calculada| entre os turnos é calculada)|pp\b|[+−]\d/)
  })

  it('reads "sem 2º turno" (null) where there was none, and lists Brasil once', () => {
    const spec = par(PAR_RECORD, { own: { name: 'Brasil', shards: { 1: brasil[1] } }, brasil: { 1: brasil[1] } })
    expect(spec.rows).toHaveLength(1)
    expect(spec.rows[0]!.cells).toEqual(['Brasil', expect.stringMatching(/%$/), null])
  })
})
