import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ESCADA } from './catalog'
import { buildEscada, ficha, fichaCsv, printedRow, sortFicha, weightText } from './escada'
import { readPlace } from './shards'
import { assertCatalog, specFor } from './panels'

const root = resolve(process.cwd(), 'fixtures/data/nerds')
const csvRows = (name: string) => {
  const [head, ...lines] = readFileSync(resolve(process.cwd(), 'fixtures/data', name), 'utf8').trim().split('\n')
  const keys = head!.split(',')
  return lines.map((l) => Object.fromEntries(l.split(',').map((v, i) => [keys[i]!, v])))
}
const place = (level: 'brasil' | 'regiao' | 'uf', id: string | null) => readPlace(level, id, root)
const spec = (level: 'brasil' | 'regiao' | 'uf', id: string | null) => buildEscada(ESCADA, { cycle: {}, all: place(level, id), reference: level === 'brasil' ? undefined : place('brasil', null) })

describe('Escada: the record and the measures', () => {
  it('passes the gates and is a bar panel over every cycle', () => {
    expect(() => assertCatalog([ESCADA])).not.toThrow()
    expect(ESCADA.kind).toBe('bar')
    expect(ESCADA.shard).toBe('ciclos')
  })

  it('reads its picker options from the record: the participação rates, no eleitorado', () => {
    expect(spec('brasil', null).options.map((o) => o.id)).toEqual(['comparecimento', 'abstencao', 'brancos_nulos', 'validos'])
    const more = { ...ESCADA, measure: { ...ESCADA.measure, options: ['comparecimento', 'validos'] } }
    expect(buildEscada(more, { cycle: {}, all: place('brasil', null) }).options.map((o) => o.id)).toEqual(['comparecimento', 'validos'])
  })
})

describe('Escada: golden data (printed values equal the shard values, across three cycles)', () => {
  const cases = [['brasil', null, null], ['regiao', 'sudeste', ['rj', 'sp']], ['uf', 'rj', ['rj']]] as const
  it.each(cases)('%s %s: comparecimento of every cycle and turno equals an independent sum of the CSV', (level, id, ufs) => {
    const cities = csvRows('cities.csv')
    const keep = (cd: string) => !ufs || ufs.includes(cities.find((c) => c.cd_municipio === cd)!.uf as never)
    const s = spec(level, id)
    for (const row of s.rows) {
      for (const turno of [1, 2] as const) {
        const rows = csvRows('turnout.csv').filter((r) => r.ano === String(row.ciclo) && r.turno === String(turno) && keep(r.cd_municipio!))
        const aptos = rows.reduce((t, r) => t + Number(r.aptos), 0)
        const comp = rows.reduce((t, r) => t + Number(r.comparecimento), 0)
        const want = `${(Math.round((comp / aptos) * 1000) / 10).toFixed(1).replace('.', ',')}%`
        expect(row.cells.comparecimento![turno - 1]!.text, `${level} ${row.ciclo} ${turno}º`).toBe(want)
      }
    }
  })
})

describe('Escada: bars, absence and the reference line', () => {
  it('has a row per cycle, 0-100 values, and no row of zeros where a cycle did not exist for the place', () => {
    const mt = spec('uf', 'mt')
    expect(mt.rows.map((r) => r.ciclo)).toEqual([2026]) // Boa Esperança do Norte exists only in 2026: no 2018/2022 rows
    for (const row of spec('brasil', null).rows) for (const [a, b] of Object.values(row.cells)) for (const r of [a, b]) expect(r!.value).toBeGreaterThan(0), expect(r!.value).toBeLessThanOrEqual(100)
  })

  it('has null (printed "sem 2º turno") where the 2º turno did not happen, never a zero', () => {
    const all = new Map(place('uf', 'rj'))
    all.delete('2022-2')
    const s = buildEscada(ESCADA, { cycle: {}, all })
    const row = s.rows.find((r) => r.ciclo === 2022)!
    expect(row.cells.comparecimento![1]).toBeNull()
    expect(printedRow(ficha(s), s.rows.indexOf(row))).toContain('sem 2º turno')
  })

  it('prints the Brasil reference on região and estado only, with its value and label, and the Brasil page has none', () => {
    expect(spec('brasil', null).reference).toBeUndefined()
    for (const [level, id] of [['regiao', 'sudeste'], ['uf', 'rj']] as const) {
      const ref = spec(level, id).reference!
      expect(ref.label).toBe('Brasil, 1º turno de 2026')
      expect(ref.byMeasure.comparecimento!.text).toBe(spec('brasil', null).rows.find((r) => r.ciclo === 2026)!.cells.comparecimento![0]!.text)
    }
  })

  it('orders and ranks nothing: rows are the cycles in order', () => {
    expect(spec('uf', 'rj').rows.map((r) => r.ciclo)).toEqual([2018, 2022, 2026])
  })
})

describe('Escada: the chart, the Ficha and the CSV read one structure', () => {
  const s = spec('uf', 'sp')
  const f = ficha(s)

  it('agrees cell by cell: chart rates, Ficha cells and CSV lines are the same strings', () => {
    const lines = fichaCsv(f).trim().split('\n').map((l) => l.split(';'))
    expect(lines[0]).toEqual(f.columns.map((c) => c.label))
    s.rows.forEach((row, i) => {
      const printed = printedRow(f, i)
      expect(lines[i + 1]).toEqual(printed)
      s.options.forEach((o) => {
        for (const turno of [1, 2] as const) {
          const j = f.columns.findIndex((c) => c.measure === o.id && c.turno === turno)
          expect(printed[j]).toBe(row.cells[o.id]![turno - 1]?.text ?? 'sem 2º turno')
        }
      })
    })
  })

  it('sorts stably by any column, with "sem 2º turno" last in either direction, and the default order is by cycle', () => {
    const all = new Map(place('uf', 'rj'))
    all.delete('2022-2')
    const g = ficha(buildEscada(ESCADA, { cycle: {}, all }))
    const col = g.columns.findIndex((c) => c.key === 'comparecimento-2')
    for (const dir of ['asc', 'desc'] as const) expect(sortFicha(g, col, dir).rows.at(-1)!.ciclo).toBe(2022)
    expect(sortFicha(g, 0, 'desc').rows.map((r) => r.ciclo)).toEqual([2026, 2022, 2018])
    const tied = { columns: g.columns, rows: g.rows.map((r) => ({ ...r, cells: r.cells.map(() => g.rows[0]!.cells[0]!) })) }
    expect(sortFicha(tied, 1, 'asc').rows.map((r) => r.ciclo)).toEqual([2018, 2022, 2026])
  })

  it('prints the weight of the shards it reads', () => {
    expect(s.weight.files).toBe(7) // three cycles x two turnos of the estado + the Brasil shard of the reference
    expect(weightText(s.weight)).toMatch(/^Lê 7 arquivos de dados, \d+,\d kB comprimidos$/)
    expect(specFor(ESCADA, { cycle: {}, all: place('uf', 'sp') }).kind).toBe('bar')
  })
})
