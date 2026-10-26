import { describe, expect, it } from 'vitest'
import { UF_TILES } from './uf-grid'

describe('UF tile map', () => {
  it('has the 27 federative units, each once, in lower case', () => {
    expect(UF_TILES).toHaveLength(27)
    expect(new Set(UF_TILES.map((t) => t.uf)).size).toBe(27)
    for (const t of UF_TILES) expect(t.uf).toBe(t.uf.toLowerCase())
  })

  it('never offers the overseas post as a state', () => {
    expect(UF_TILES.map((t) => t.uf)).not.toContain('zz')
  })

  it('puts every tile in its own cell of a 7-column grid', () => {
    const cells = UF_TILES.map((t) => `${t.col},${t.row}`)
    expect(new Set(cells).size).toBe(27)
    for (const t of UF_TILES) {
      expect(t.col).toBeGreaterThanOrEqual(1)
      expect(t.col).toBeLessThanOrEqual(7)
      expect(t.row).toBeGreaterThanOrEqual(1)
    }
  })
})
