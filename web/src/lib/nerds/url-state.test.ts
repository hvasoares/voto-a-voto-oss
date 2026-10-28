import { describe, expect, it } from 'vitest'
import { defaultState, parseQuery, toQuery } from './url-state'

const cycles = [2018, 2022, 2026]

describe('the address is the only state of a view', () => {
  it('round-trips URL -> state -> URL for every cycle and turno', () => {
    for (const ciclo of cycles) for (const turno of [1, 2] as const) {
      const query = `?ciclo=${ciclo}&turno=${turno}&cargo=presidente`
      const { state, notes } = parseQuery(query, cycles)
      expect(notes).toEqual([])
      expect(toQuery(state)).toBe(query)
    }
  })

  it('opens the latest cycle, 1º turno, Presidente, when the address says nothing', () => {
    expect(parseQuery('', cycles).state).toEqual(defaultState(cycles))
    expect(defaultState(cycles)).toEqual({ ciclo: 2026, turno: 1, cargo: 'presidente' })
  })

  it.each(['?ciclo=1990', '?ciclo=abc', '?ciclo=', '?ciclo=2022%27%20onerror', '?ciclo=20262026'])('falls back to the latest cycle with a visible note for %s', (query) => {
    const { state, notes } = parseQuery(query, cycles)
    expect(state.ciclo).toBe(2026)
    expect(notes).toHaveLength(1)
    expect(notes[0]).toContain('mostrando 2026')
    expect(notes[0]!.length).toBeLessThan(120)
  })

  it('falls back on a malformed turno and an unknown cargo, one note each, and keeps the rest', () => {
    const { state, notes } = parseQuery('?ciclo=2022&turno=3&cargo=governador', cycles)
    expect(state).toEqual({ ciclo: 2022, turno: 1, cargo: 'presidente' })
    expect(notes).toHaveLength(2)
  })

  it('carries a well-formed measure and drops a malformed one', () => {
    expect(parseQuery('?medida=abstencao', cycles).state.medida).toBe('abstencao')
    expect(parseQuery('?medida=<script>', cycles).state.medida).toBeUndefined()
    expect(toQuery({ ...defaultState(cycles), medida: 'abstencao' })).toBe('?ciclo=2026&turno=1&cargo=presidente&medida=abstencao')
  })
})
