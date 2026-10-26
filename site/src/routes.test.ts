import { describe, expect, it } from 'vitest'
import { fillPattern, matchPattern, specificity } from './routes'
import { normalizeBase, stripBase, withBase } from './paths'

describe('matchPattern', () => {
  it('matches a city path and extracts params', () => {
    expect(matchPattern('/:uf/:slug/', '/rj/niteroi/')).toEqual({ uf: 'rj', slug: 'niteroi' })
  })
  it('does not let :uf swallow named top-level routes', () => {
    expect(matchPattern('/:uf/', '/brasil/')).toBeNull()
    expect(matchPattern('/:uf/:slug/', '/relatorios/cidades-que-viraram/')).toBeNull()
  })
  it('ignores trailing-slash differences', () => {
    expect(matchPattern('/mapa/', '/mapa')).toEqual({})
  })
  it('matches the root', () => {
    expect(matchPattern('/', '/')).toEqual({})
  })
  it('prefers static segments (specificity)', () => {
    expect(specificity('/relatorios/cidades-que-viraram/')).toBeGreaterThan(specificity('/relatorios/:report/'))
  })
})

describe('fillPattern', () => {
  it('fills params', () => {
    expect(fillPattern('/:uf/:slug/qr/', { uf: 'rj', slug: 'cidade-exemplo' })).toBe('/rj/cidade-exemplo/qr/')
  })
  it('throws on a missing param', () => {
    expect(() => fillPattern('/:uf/', {})).toThrow(/missing param/)
  })
})

describe('base path', () => {
  it('normalizes', () => {
    expect(normalizeBase(undefined)).toBe('/')
    expect(normalizeBase('voto-a-voto')).toBe('/voto-a-voto/')
  })
  it('round-trips with and without a base', () => {
    for (const base of ['/', '/voto-a-voto/']) {
      expect(stripBase(base, withBase(base, '/rj/niteroi/'))).toBe('/rj/niteroi/')
    }
  })
  it('strips index.html and adds the trailing slash', () => {
    expect(stripBase('/x/', '/x/rj/index.html')).toBe('/rj/')
    expect(stripBase('/', '/rj')).toBe('/rj/')
  })
})
