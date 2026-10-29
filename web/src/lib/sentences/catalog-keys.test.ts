/**
 * The partition of the sentence catalog (#112): `catalog.ts` keeps the core (the keys two or more features read) and each
 * feature declares its own keys in `catalog-<feature>.ts`. This test pins the split: every key of the one list lives in
 * exactly one module, the modules together cover the list, and a duplicate registration fails loudly instead of silently
 * overwriting another feature's sentence.
 */
import { describe, expect, it } from 'vitest'
import { CATALOG, CORE_KEYS, KEYS, STANDARD_ONLY_KEYS, registerSentences, type Key, type Locale, type Register } from './catalog'
import { ARC_KEYS } from './catalog-arc'
import { MARGIN_KEYS } from './catalog-margin'
import { TWIN_KEYS } from './catalog-twin'
import { STAT_KEYS } from './catalog-stat'
import { RECAP_KEYS } from './catalog-recap'
import { MEUBRASIL_KEYS } from './catalog-meu-brasil'
import { PREVIEW_KEYS } from './catalog-preview'
import { REGISTER_KEYS } from './catalog-register'
import { HEADLINE_KEYS } from './catalog-headline'
import { DUEL_KEYS } from './catalog-duel'
import { STAYHOME_KEYS } from './catalog-stayhome'
import { OUTLIER_KEYS } from './catalog-outliers'
import { BRASIL_KEYS } from './catalog-brasil'
import { FACTS_KEYS } from './catalog-facts'
import { SHELL_KEYS } from './catalog-shell'

/** The modules that compose the catalog: the core and one per feature, in the order KEYS lists them. */
const MODULES: readonly (readonly Key[])[] = [
  CORE_KEYS,
  HEADLINE_KEYS,
  MARGIN_KEYS,
  ARC_KEYS,
  TWIN_KEYS,
  STAT_KEYS,
  RECAP_KEYS,
  MEUBRASIL_KEYS,
  PREVIEW_KEYS,
  REGISTER_KEYS,
  DUEL_KEYS,
  STAYHOME_KEYS,
  OUTLIER_KEYS,
  BRASIL_KEYS,
  FACTS_KEYS,
  SHELL_KEYS,
]

describe('the catalog partition', () => {
  it('every key lives in exactly one module', () => {
    const seen = new Map<Key, number>()
    for (const keys of MODULES) {
      expect(new Set(keys).size, 'a module lists a key twice').toBe(keys.length)
      for (const key of keys) seen.set(key, (seen.get(key) ?? 0) + 1)
    }
    const duplicated = [...seen.entries()].filter(([, n]) => n > 1).map(([key]) => key)
    expect(duplicated).toEqual([])
  })
  it('the modules together declare exactly the one list of keys', () => {
    expect(MODULES.flatMap((keys) => [...keys]).sort()).toEqual([...KEYS].sort())
  })
  it('each module registers every key it declares, in both registers it must fill', () => {
    for (const keys of MODULES)
      for (const key of keys) {
        expect(CATALOG['pt-BR'].standard[key], key).toBeDefined()
        if (!(STANDARD_ONLY_KEYS as readonly string[]).includes(key)) expect(CATALOG['pt-BR'].plain[key], key).toBeDefined()
      }
  })
  it('a registration that would land on a key already present throws, before writing anything', () => {
    const locale: Locale = 'pt-BR'
    const register: Register = 'standard'
    const target = CATALOG[locale][register]
    const before = { ...target }
    expect(() => registerSentences(locale, register, { noData: 'duplicate' })).toThrow(/already has "noData"/)
    expect(target).toEqual(before)
  })
})
