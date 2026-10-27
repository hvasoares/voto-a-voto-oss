import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { UF_NOME } from '@/lib/uf-names'
import { CALLOUTS_LEFT, CALLOUTS_RIGHT, loadUfMap, pathData, projectOutlines, type OutlineFile } from './uf-map'

const FILE = resolve(import.meta.dirname, '../../../data/geo/uf-outlines.json')
const file = JSON.parse(readFileSync(FILE, 'utf8')) as OutlineFile
const map = projectOutlines(file)

describe('the committed outline file, projected', () => {
  it('has exactly the 27 states of the dataset, matched by code: no missing shape, no extra, no overseas', () => {
    expect(map.shapes.map((s) => s.uf).sort()).toEqual(Object.keys(UF_NOME).filter((uf) => uf !== 'zz').sort())
    expect(map.shapes.map((s) => s.uf)).not.toContain('zz')
    expect(new Set(map.shapes.map((s) => s.uf)).size).toBe(27)
  })

  it('draws every state inside its own viewBox', () => {
    expect(map.width).toBeGreaterThan(500)
    expect(map.height).toBeGreaterThan(380)
    for (const shape of map.shapes) {
      expect(shape.d.startsWith('M')).toBe(true)
      expect(shape.d.endsWith('z')).toBe(true)
      expect(shape.labelX).toBeGreaterThan(0)
      expect(shape.labelX).toBeLessThan(map.width)
      expect(shape.labelY).toBeGreaterThan(0)
      expect(shape.labelY).toBeLessThan(map.height)
    }
  })

  it('keeps the geography: north above south, west left of east', () => {
    const at = (uf: string) => map.shapes.find((s) => s.uf === uf)!
    expect(at('rr').labelY).toBeLessThan(at('rs').labelY)
    expect(at('ac').labelX).toBeLessThan(at('pb').labelX)
    expect(at('am').labelX).toBeLessThan(at('ba').labelX)
  })

  it('names the small coastal states and Acre outside the map, with a key and a leader line to the state', () => {
    const called = map.shapes.filter((s) => s.callout).map((s) => s.uf)
    expect(called.sort()).toEqual([...CALLOUTS_RIGHT, ...CALLOUTS_LEFT].sort())
    for (const shape of map.shapes.filter((s) => s.callout)) {
      expect(shape.callout!.lineFrom).toEqual([shape.labelX, shape.labelY])
      expect(shape.callout!.keyY).toBeGreaterThanOrEqual(0)
    }
    const keys = CALLOUTS_RIGHT.map((uf) => map.shapes.find((s) => s.uf === uf)!.callout!.keyY)
    expect(keys).toEqual([...keys].sort((a, b) => a - b))
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('is deterministic: the same file gives the same drawing', () => {
    expect(projectOutlines(file)).toEqual(map)
    expect(loadUfMap(FILE)).toEqual(map)
  })
})

describe('pathData', () => {
  it('writes the first point absolute, the rest relative, minus signs as separators, rings closed by z', () => {
    expect(pathData([[[10, 20], [12.5, 20], [12.5, 18], [10, 20]]])).toBe('M10 20l2.5 0 0-2z')
  })
})
