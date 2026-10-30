/**
 * One sentence as DATA and the one code that draws it (private#213, the lighter-site milestone). PURE: no DOM, no file system, no framework, and no
 * runtime import of the catalog (only its types), so the build and the browser draw a fact record's sentence with this same code and the text cannot
 * drift. A sentence is a `PhrasePart`: a catalog key with its slots (`phrase`), a plain string or number, or a list that is written one after the other.
 * A slot may hold another phrase, so a register-dependent word (the "where" of a list, the "what" of a ranking) is drawn in the register asked, never fixed
 * in one. The part is JSON: the build stores it in the data file of the page, the client draws it with the templates of its subset of the catalog
 * (`catalogSubset`), so it ships the words the page needs and not the catalog.
 */
import type { Key, Locale, MessageKey, Register, Voice } from './catalog'

/** A catalog key with its slots. `n` picks the `.one` / `.other` pair of a plural key; `i` picks one word of a `a|b|c` template (the number words). */
export interface Phrase {
  k: MessageKey
  p?: Record<string, PhrasePart>
  n?: number
  i?: number
}
export type PhrasePart = string | number | Phrase | readonly PhrasePart[]

/** The phrase of `key` with its slots, written as the catalog's `message` is called. */
export const phrase = (k: MessageKey, p?: Record<string, PhrasePart>, n?: number): Phrase => ({ k, ...(p ? { p } : {}), ...(n === undefined ? {} : { n }) })
/** One word of a `a|b|c` template, by position (`i` out of the list: the position itself, as a number). */
export const phraseWord = (k: MessageKey, i: number): Phrase => ({ k, i })

/** Fills `{slot}`s; an unknown slot is left visible as `{slot}` so a typo cannot pass silently in a test. */
export function fill(tpl: string, params: Record<string, string | number>): string {
  return tpl.replace(/\{(\w+)\}/g, (whole, name: string) => (name in params ? String(params[name]) : whole))
}

/** Zero reads as "other" ("0 votos"), although CLDR files 0 under "one" for Portuguese. */
export function pluralCategory(locale: Locale, count: number): 'one' | 'other' {
  return count !== 0 && new Intl.PluralRules(locale).select(count) === 'one' ? 'one' : 'other'
}

/** Where a template comes from: the whole catalog on the build, a subset in the browser. */
export type Template = (voice: Voice, key: Key) => string

const isPhrase = (part: PhrasePart): part is Phrase => typeof part === 'object' && !Array.isArray(part)

/** The sentence, in the voice asked, from the templates of `template`. */
export function drawPhrase(part: PhrasePart, voice: Voice, template: Template): string {
  if (typeof part === 'string') return part
  if (typeof part === 'number') return String(part)
  if (!isPhrase(part)) return (part as readonly PhrasePart[]).map((x) => drawPhrase(x, voice, template)).join('')
  const key = (part.n === undefined ? part.k : `${part.k}.${pluralCategory(voice.locale, part.n)}`) as Key
  const tpl = template(voice, key)
  if (part.i !== undefined) return tpl.split('|')[part.i] ?? String(part.i)
  const params: Record<string, string | number> = {}
  for (const [name, value] of Object.entries(part.p ?? {})) params[name] = drawPhrase(value, voice, template)
  return fill(tpl, params)
}

/** Every catalog key a sentence can ask for (plural keys in both forms), whatever its voice. */
export function phraseKeys(part: PhrasePart, into = new Set<Key>()): Set<Key> {
  if (typeof part === 'string' || typeof part === 'number') return into
  if (!isPhrase(part)) {
    for (const x of part as readonly PhrasePart[]) phraseKeys(x, into)
    return into
  }
  if (part.n === undefined) into.add(part.k as Key)
  else into.add(`${part.k}.one` as Key).add(`${part.k}.other` as Key)
  for (const value of Object.values(part.p ?? {})) phraseKeys(value, into)
  return into
}

/** The templates a page needs, per register, already resolved through the catalog's fallbacks: the whole of what the browser ships for these sentences. */
export type CatalogSubset = Record<Register, Record<string, string>>

/** The subset of the catalog that draws `parts` in `locale`; `template` is the catalog's. */
export function catalogSubset(parts: readonly PhrasePart[], locale: Locale, template: Template, registers: readonly Register[] = ['standard', 'plain']): CatalogSubset {
  const keys = new Set<Key>()
  for (const part of parts) phraseKeys(part, keys)
  const out = { standard: {}, plain: {} } as CatalogSubset
  for (const register of registers) for (const key of [...keys].sort()) out[register][key] = template({ locale, register }, key)
  return out
}

/** The `Template` over a subset: what the browser passes to `drawPhrase`. */
export const subsetTemplate = (subset: CatalogSubset): Template => ({ register }, key) => subset[register][key] ?? key
