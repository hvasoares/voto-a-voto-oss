import { describe, expect, it } from 'vitest'
import { sentenceInput } from '@/test/sentence-input'
import { CATALOG, KEYS, STANDARD_ONLY_KEYS, message, pluralCategory, template, type Key, type Voice } from './catalog'
import './catalog-facts'
import './catalog-duel'
import './catalog-stayhome'
import './catalog-outliers'
import './catalog-brasil'
import './catalog-headline'
import './catalog-margin'
import './catalog-arc'
import './catalog-twin'
import './catalog-stat'
import './catalog-recap'
import './catalog-meu-brasil'
import './catalog-preview'
import './catalog-register'
import './catalog-shell'
import './catalog-hint'
import { headline } from './headline'

const slots = (tpl: string) => [...tpl.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).sort()
const std = (locale: Voice['locale'] = 'pt-BR'): Voice => ({ locale, register: 'standard' })
const plain = (locale: Voice['locale'] = 'pt-BR'): Voice => ({ locale, register: 'plain' })

describe('catalog keys', () => {
  it('standard Portuguese has every key of the one list, and nothing else', () => {
    expect(Object.keys(CATALOG['pt-BR'].standard).sort()).toEqual([...KEYS].sort())
  })
  it('plain Portuguese has every key except the standard-only keys, and nothing else', () => {
    expect(Object.keys(CATALOG['pt-BR'].plain).sort()).toEqual(KEYS.filter((k) => !(STANDARD_ONLY_KEYS as readonly string[]).includes(k)).sort())
  })
  it('the keys are listed once', () => {
    expect(new Set(KEYS).size).toBe(KEYS.length)
  })
  it.each(['en', 'es'] as const)('%s only translates listed keys, with the same slots as standard Portuguese', (locale) => {
    for (const register of ['standard', 'plain'] as const)
      for (const [key, tpl] of Object.entries(CATALOG[locale][register]) as [Key, string][]) {
        expect(KEYS).toContain(key)
        expect(slots(tpl)).toEqual(slots(CATALOG['pt-BR'].standard[key]!))
      }
  })
  it('plain Portuguese uses the same slots as the standard template of the same key', () => {
    for (const [key, tpl] of Object.entries(CATALOG['pt-BR'].plain) as [Key, string][]) expect(slots(tpl), key).toEqual(slots(CATALOG['pt-BR'].standard[key]!))
  })
})

describe('fallback', () => {
  it('a missing translation falls back to Portuguese without an error', () => {
    expect(template(std('en'), 'single')).toBe(CATALOG['pt-BR'].standard.single)
    expect(template(std('en'), 'noData')).toBe('No data for this cycle.')
  })
  it('a missing plain version falls back to the locale standard, then to Portuguese', () => {
    expect(template(plain('en'), 'noData')).toBe('No data for this cycle.')
    expect(template(plain('en'), 'single')).toBe(CATALOG['pt-BR'].plain.single)
    expect(template(plain('es'), 'register.plain')).toBe('Linguagem simples')
  })
  it('a whole sentence in an unfinished locale reads in Portuguese where it must and never throws', () => {
    const r = sentenceInput({ aptos: 1000, votos: [500, 400], comparecimento: 900, nomes: ['C1', 'C2'] })
    expect(headline(r, { cityName: 'X', locale: 'en' })).toBe('In X, in round 1 of 2026, 10% do eleitorado não votou, menos do que C2, o segundo mais votado, recebeu (40%).')
    expect(headline(undefined, { cityName: 'X', locale: 'es' })).toBe('Sin datos en este ciclo.')
    expect(() => headline(r, { cityName: 'X', locale: 'en', register: 'plain' })).not.toThrow()
  })
})

describe('plurals and slots', () => {
  it('zero is "other" in the plural pairs, one is "one"', () => {
    expect(pluralCategory('pt-BR', 1)).toBe('one')
    expect(pluralCategory('pt-BR', 0)).toBe('other')
    expect(pluralCategory('pt-BR', 2)).toBe('other')
    expect(message(std(), 'votes.count', { n: 1 }, 1)).toBe('1 voto')
    expect(message(std(), 'votes.count', { n: 0 }, 0)).toBe('0 votos')
  })
  it('a slot with no value stays visible', () => {
    expect(message(std(), 'lead.city', { city: 'X' })).toBe('Em X, no {turno}º turno de {ano}, ')
  })
})
