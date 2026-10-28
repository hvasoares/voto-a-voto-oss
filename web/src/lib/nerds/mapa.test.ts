import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { MAPA } from './catalog'
import { buildMapa, shading, stepOf } from './mapa'
import { assertCatalog } from './panels'
import { placesWithShards, readPlace } from './shards'

const root = resolve(process.cwd(), 'fixtures/data/nerds')
const known = placesWithShards(root).ufs

describe('map panel: shading and legend', () => {
  it('has a record that passes the gates', () => expect(() => assertCatalog([MAPA])).not.toThrow())

  it('divides the values into five equal whole-point steps and prints the numeric legend', () => {
    const s = shading([78.2, 80.1, 83.4, 85.9])
    expect(s.edges).toEqual([80, 82, 84, 86]) // lowest 78, highest 86 -> step ceil(8 / 5) = 2
    expect(s.legend).toEqual(['até 80%', '80–82%', '82–84%', '84–86%', '86% ou mais'])
    expect([78.2, 80.1, 82, 83.4, 85.9, 86, 99].map((v) => stepOf(v, s))).toEqual([0, 1, 2, 2, 3, 4, 4])
  })
})

describe('map panel: the step of every UF at each level comes from the shard values', () => {
  const spec = (level: 'brasil' | 'regiao' | 'estado', all: ReturnType<typeof readPlace>) => buildMapa(MAPA, { cycle: {}, all }, level, known)

  it('Brasil: one cell per UF with a step 0-4 and the printed value of the shard row; five region chips plus no Exterior', () => {
    const all = readPlace('brasil', null, root)
    const s = spec('brasil', all)
    const view = s.views['2022-1-comparecimento']!
    const rows = all.get('2022-1')!.children.ufs!.filter((r) => r.id !== 'zz')
    expect(Object.keys(view.cells).sort()).toEqual(rows.map((r) => r.id).sort())
    for (const row of rows) {
      const cell = view.cells[row.id]!
      const text = `${(Math.round((row.comparecimento / row.eleitorado) * 1000) / 10).toFixed(1).replace('.', ',')}%`
      expect(cell.text).toBe(text)
      expect(cell.step).toBe(stepOf(cell.value, view.shading))
    }
    expect(Object.keys(view.chips!)).not.toContain('exterior')
    expect(s.initial.key).toBe('2026-1-comparecimento')
  })

  it('região: only its UFs are shaded; the others have no cell (neutral)', () => {
    const s = spec('regiao', readPlace('regiao', 'sudeste', root))
    expect(Object.keys(s.views['2026-1-comparecimento']!.cells).sort()).toEqual(['rj', 'sp'])
    expect(s.views['2026-1-comparecimento']!.chips).toBeUndefined()
    expect(s.linked).toEqual(['rj', 'sp'])
  })

  it('reads its picker options from the record', () => {
    expect(spec('brasil', readPlace('brasil', null, root)).options.map((o) => o.id)).toEqual(['comparecimento', 'abstencao', 'brancos_nulos', 'validos'])
  })
})
