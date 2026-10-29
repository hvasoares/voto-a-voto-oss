/**
 * The voice defaults (#141): the holes are filled, the explicit parts are kept, and the defaults are the
 * ones the catalog and the registers re-export (one definition, in voice.ts).
 */
import { describe, expect, it } from 'vitest'
import { DEFAULT_LOCALE as CATALOG_DEFAULT_LOCALE, DEFAULT_REGISTER as CATALOG_DEFAULT_REGISTER } from './catalog'
import { DEFAULT_REGISTER as REGISTERS_DEFAULT_REGISTER } from './register'
import { DEFAULT_LOCALE, DEFAULT_REGISTER, voiceOf } from './voice'

describe('voiceOf (#141)', () => {
  it('fills every hole with the defaults', () => {
    expect(voiceOf()).toEqual({ locale: 'pt-BR', register: 'standard' })
    expect(voiceOf({})).toEqual({ locale: 'pt-BR', register: 'standard' })
  })

  it('keeps the parts given and fills the rest', () => {
    expect(voiceOf({ register: 'plain' })).toEqual({ locale: 'pt-BR', register: 'plain' })
    expect(voiceOf({ locale: 'en' })).toEqual({ locale: 'en', register: 'standard' })
    expect(voiceOf({ locale: 'es', register: 'plain' })).toEqual({ locale: 'es', register: 'plain' })
  })

  it('honours both registers', () => {
    expect(voiceOf({ register: 'standard' }).register).toBe('standard')
    expect(voiceOf({ register: 'plain' }).register).toBe('plain')
  })

  it('returns a fresh object a caller may hold onto', () => {
    const a = voiceOf({ locale: 'en' })
    const b = voiceOf({ locale: 'en' })
    expect(a).toEqual(b)
    expect(a).not.toBe(b)
  })
})

describe('the defaults are defined once (#141)', () => {
  it('DEFAULT_LOCALE and DEFAULT_REGISTER are the pt-BR standard voice', () => {
    expect(DEFAULT_LOCALE).toBe('pt-BR')
    expect(DEFAULT_REGISTER).toBe('standard')
  })

  it('the catalog and the registers re-export the same values', () => {
    expect(CATALOG_DEFAULT_LOCALE).toBe(DEFAULT_LOCALE)
    expect(CATALOG_DEFAULT_REGISTER).toBe(DEFAULT_REGISTER)
    expect(REGISTERS_DEFAULT_REGISTER).toBe(DEFAULT_REGISTER)
  })
})
