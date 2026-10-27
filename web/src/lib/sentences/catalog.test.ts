import { describe, expect, it } from 'vitest'
import { buildCityResult } from '@/shared/city-model'
import { CATALOG, KEYS, message, pluralCategory, template, type Key } from './catalog'
import { headline } from './headline'

const slots = (tpl: string) => [...tpl.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).sort()

describe('catalog', () => {
  it('Portuguese has every key of the one list, and nothing else', () => {
    expect(Object.keys(CATALOG['pt-BR']).sort()).toEqual([...KEYS].sort())
  })
  it('the keys are listed once', () => {
    expect(new Set(KEYS).size).toBe(KEYS.length)
  })
  it.each(['en', 'es'] as const)('%s only translates listed keys, with the same slots as Portuguese', (locale) => {
    for (const [key, tpl] of Object.entries(CATALOG[locale]) as [Key, string][]) {
      expect(KEYS).toContain(key)
      expect(slots(tpl)).toEqual(slots(CATALOG['pt-BR'][key]))
    }
  })
  it('a missing translation falls back to Portuguese without an error', () => {
    expect(template('en', 'single')).toBe(CATALOG['pt-BR'].single)
    expect(template('en', 'noData')).toBe('No data for this cycle.')
  })
  it('a whole sentence in an unfinished locale reads in Portuguese where it must and never throws', () => {
    const r = buildCityResult({
      turnout: { ano: 2026, turno: 1, uf: 'rj', cdMunicipio: '1', aptos: 1000, comparecimento: 900, abstencoes: 100, brancos: 0, nulos: 0, anuladosApuSep: 0, validos: 900 },
      votes: [{ ano: 2026, turno: 1, uf: 'rj', cdMunicipio: '1', candidatoNumero: 1, votos: 500 }, { ano: 2026, turno: 1, uf: 'rj', cdMunicipio: '1', candidatoNumero: 2, votos: 400 }],
      candidates: [1, 2].map((n) => ({ ano: 2026, turno: 1 as const, candidatoNumero: n, nomeUrna: `C${n}`, partido: 'P' })),
    })
    expect(headline(r, { cityName: 'X', locale: 'en' })).toBe('In X, in round 1 of 2026, 10% do eleitorado não votou, menos do que C2, o segundo mais votado, recebeu (40%).')
    expect(headline(undefined, { cityName: 'X', locale: 'es' })).toBe('Sin datos en este ciclo.')
  })
  it('zero is "other" in the plural pairs, one is "one"', () => {
    expect(pluralCategory('pt-BR', 1)).toBe('one')
    expect(pluralCategory('pt-BR', 0)).toBe('other')
    expect(pluralCategory('pt-BR', 2)).toBe('other')
    expect(message('pt-BR', 'votes.count', { n: 1 }, 1)).toBe('1 voto')
    expect(message('pt-BR', 'votes.count', { n: 0 }, 0)).toBe('0 votos')
  })
  it('a slot with no value stays visible', () => {
    expect(message('pt-BR', 'lead.city', { city: 'X' })).toBe('Em X, no {turno}º turno de {ano}, ')
  })
})
