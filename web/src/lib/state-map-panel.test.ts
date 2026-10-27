import { describe, expect, it } from 'vitest'
import { BIN_COLOR } from '@/lib/scale'
import { defaultUf, mapCells, panelLines, valueOf } from './state-map-panel'
import type { StateMapData, StateMapRow } from './state-map-data'

const rows: StateMapRow[] = [
  { uf: 'sp', validos1: 25_000_000, validos2: 26_258_452, margin1: -13.7, margin2: -7.7, swing: 6.0 },
  { uf: 'mg', validos1: 12_000_000, validos2: 12_500_000, margin1: -4.9, margin2: 0.9, swing: 5.8 },
  { uf: 'rj', validos1: 8_000_000, validos2: 8_400_000, margin1: -13.6, margin2: -6.2, swing: 7.4 },
]
const data: StateMapData = {
  ano: 2026,
  ladoANome: 'Lula',
  ladoBNome: 'Flavio',
  ladoANomeCompleto: 'Lula',
  ladoBNomeCompleto: 'Flavio',
  rows,
  national: {} as StateMapData['national'],
}

describe('the desktop state map cells (#54)', () => {
  it('prints the dataset own rounded value, with the sign, for margin and swing', () => {
    expect(mapCells('margin', data).sp!.text).toBe('-7,7')
    expect(mapCells('margin', data).mg!.text).toBe('+0,9')
    expect(mapCells('swing', data).rj!.text).toBe('+7,4')
    expect(mapCells('swing', data).sp!.big).toBe('+6,0 pp')
  })

  it('colours with the same diverging scale as the mosaic: the margin steps and the swing steps', () => {
    expect(mapCells('margin', data).sp!.fill).toBe(BIN_COLOR.neg1) // -7,7 pp is the lightest blue step
    expect(mapCells('margin', data).mg!.fill).toBe(BIN_COLOR.pos1)
    expect(mapCells('swing', data).rj!.fill).toBe(BIN_COLOR.pos3) // +7,4 pp swing: the top step of the swing scale (5 and up)
  })

  it('never leaves meaning to colour: every cell has a text value, a direction in words and its figures in the label', () => {
    for (const kind of ['margin', 'swing'] as const)
      for (const cell of Object.values(mapCells(kind, data))) {
        expect(cell.text).toMatch(/^[+-]\d+,\d$/)
        expect(cell.label).toContain(cell.text)
        expect(cell.label).toMatch(/à frente|variação para/)
        expect(cell.label).toContain('votos válidos')
      }
  })

  it('writes the two sentences of the panel for each view (frames 10 and 10b), no computed difference of ours', () => {
    expect(panelLines('margin', data, rows[0]!)).toEqual([
      'Votos válidos (2º turno): 26.258.452',
      'Margem (Lula − Flavio): -7,7 pp. Na eleição anterior: -13,7 pp.',
    ])
    expect(panelLines('swing', data, rows[0]!)[1]).toBe('A margem de Lula sobre Flavio era de -13,7 pp e passou para -7,7 pp. Variação: +6,0 pp.')
  })

  it('opens on the state with the most valid votes of the round', () => {
    expect(defaultUf(rows)).toBe('sp')
    expect(defaultUf([])).toBe('')
  })

  it('valueOf picks the margin of the round or the swing', () => {
    expect([valueOf(rows[0]!, 'margin'), valueOf(rows[0]!, 'swing')]).toEqual([-7.7, 6.0])
  })
})
