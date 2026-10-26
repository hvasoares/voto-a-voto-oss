import { describe, expect, it } from 'vitest'
import type { City } from '../../data'
import { frameTexts } from './fixture'
import { countLabel, sketchState, stateRows } from './state-list'

const city = (nome: string, slug: string, uf = 'rj'): City => ({ uf, cdMunicipio: slug, cdIbge: '', nome, slug, regiao: 'x', ciclos: [2026] })

describe('stateRows', () => {
  it('sorts accent- and case-insensitively and shows names as people write them', () => {
    const rows = stateRows([city('ÁGUAS CLARAS', 'aguas-claras'), city('ARARUAMA', 'araruama'), city('ABREU E LIMA', 'abreu-e-lima'), city('Zé Doca', 'ze-doca')])
    expect(rows.map((r) => r.nome)).toEqual(['Abreu e Lima', 'Águas Claras', 'Araruama', 'Zé Doca'])
    expect(rows.map((r) => r.slug)).toEqual(['abreu-e-lima', 'aguas-claras', 'araruama', 'ze-doca'])
  })

  it('keeps every city, including duplicated display names', () => {
    expect(stateRows([city('X', 'x'), city('X', 'x-2')])).toHaveLength(2)
  })
})

describe('countLabel', () => {
  it.each([[92, '92 municípios'], [1, '1 município'], [645, '645 municípios']])('%i -> %s', (n, label) => {
    expect(countLabel(n)).toBe(label)
  })
})

describe('sketchState (the frame "5 Estado" as data)', () => {
  const s = sketchState(frameTexts)
  it('reads the illustrative figures drawn in the frame', () => {
    expect(s.countText).toBe('92 municípios (exemplo)')
    expect(s.banner).toBe('EXEMPLO  ·  NOMES E MAPA ILUSTRATIVOS')
    expect(s.names).toEqual(['Cidade Exemplo A', 'Cidade Exemplo B', 'Cidade Exemplo C', 'Cidade Exemplo D', 'Cidade Exemplo E'])
    expect(s.subline).toBe('Município fictício')
  })
})
