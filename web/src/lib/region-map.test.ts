import { describe, expect, it } from 'vitest'
import { groupRegions, loadRegionMap, REGION_ORDER } from './region-map'
import { loadUfMap } from './uf-map'

describe('the region map (#71)', () => {
  const map = loadRegionMap()

  it('draws the five regions of the committed membership file, each state in exactly one', () => {
    expect(map.shapes.map((s) => s.regiao)).toEqual([...REGION_ORDER])
    const members = map.shapes.flatMap((s) => s.ufs)
    expect(members).toHaveLength(27)
    expect(new Set(members)).toEqual(new Set(loadUfMap().shapes.map((s) => s.uf)))
  })

  it('has a region outline that is exactly the union of its states: the same paths, no second geometry', () => {
    const byUf = new Map(map.ufs.map((s) => [s.uf, s.d]))
    for (const region of map.shapes) expect(region.d, region.regiao).toBe(region.ufs.map((uf) => byUf.get(uf)).join(''))
    // Every state path appears in one region path and nowhere else, and the regions together carry all of them.
    expect(map.shapes.map((r) => r.d).join('')).toBe(map.shapes.flatMap((r) => r.ufs).map((uf) => byUf.get(uf)).join(''))
  })

  it('puts each region name inside the drawing', () => {
    for (const r of map.shapes) {
      expect(r.labelX).toBeGreaterThan(0)
      expect(r.labelX).toBeLessThan(map.width)
      expect(r.labelY).toBeGreaterThan(0)
      expect(r.labelY).toBeLessThan(map.height)
    }
  })

  it('refuses a membership that names a state with no outline', () => {
    expect(() => groupRegions(loadUfMap(), { regioes: { norte: ['xx'] } })).toThrow('xx has no outline')
  })
})
