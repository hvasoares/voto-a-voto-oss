/**
 * Guard (ticket #141): the three small shared libs are the ONLY place their pattern may live, so the
 * copies removed in this ticket do not grow back. The rules, run over every source file of web/src:
 *
 *  1. `new Intl.NumberFormat(` — only in `lib/number-format.ts`, the number-format helper;
 *  2. the voice-with-defaults interface — a braced type/interface body whose WHOLE content is the
 *     optional pair `locale?: …; register?: …` — only in `lib/sentences/voice.ts` as `VoiceInput`.
 *     Wider options/props interfaces that EMBED the pair among other fields (card Props, `Place`)
 *     predate this ticket and are not the pair-shape copies it removed, so they pass; a new
 *     interface that IS the pair is a copy and fails;
 *  3. `DEFAULT_REGISTER` / `DEFAULT_LOCALE` defined — only in `lib/sentences/voice.ts` (the
 *     re-export shims `catalog.ts` and `register.ts` name the constants without re-defining them);
 *  4. a `try { … localStorage … }` block — only in `lib/safe-storage.ts`; every other store reads
 *     and writes through `readStored`/`writeStored`/`removeStored`/`browserStorage`.
 *
 * Strings and comments are blanked (`blank`, the #135 convention) before scanning, so doc comments
 * and inline-script payloads (the register boot string, the consent banner's note) do not classify.
 * Rule 4 skips `*.test.*` files: the suite legitimately drives jsdom's real `localStorage`
 * (`localStorage.clear()` in Game/ShareSheet tests); rules 1-3 scan tests too. `web/e2e` is out of
 * this tree — it holds two `Intl.NumberFormat` copies owned by #132, listed in the ticket.
 *
 * The three helper exemptions are named here WITH the pattern each one is expected to trip, and the
 * exemption is asserted live: a helper that stops tripping its own rule (moved away, renamed) fails
 * instead of silently exempting nothing. findCopies is pure; the seeded fixtures below prove every
 * rule can fail before the same scan runs over the real tree.
 */
import { readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { walkFiles } from '../../scripts/walk'

const NUMBER_HELPER = 'lib/number-format.ts'
const VOICE_HELPER = 'lib/sentences/voice.ts'
const STORAGE_HELPER = 'lib/safe-storage.ts'

/** The source with strings and comments blanked (same length), so their braces cannot unbalance a literal scan. */
const blank = (src: string): string =>
  src.replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))

/** The [start, end] span of every {...} region, nesting included. */
const braces = (code: string): [number, number][] => {
  const open: number[] = []
  const spans: [number, number][] = []
  for (let i = 0; i < code.length; i++) {
    if (code[i] === '{') open.push(i)
    else if (code[i] === '}' && open.length > 0) spans.push([open.pop()!, i])
  }
  return spans
}

const INTL = /new\s+Intl\s*\.\s*NumberFormat\s*\(/
const DEFAULT_DEF = /\bDEFAULT_(?:REGISTER|LOCALE)\s*[:=]/
const TRY = new RegExp(String.raw`\btry\s*\{`, 'g')
const LOCALSTORAGE = /\blocalStorage\b/
const OPTIONAL_LOCALE = /\blocale\?\s*:/
const OPTIONAL_REGISTER = /\bregister\?\s*:/

/** The copies of a shared-lib pattern in one source. Pure; the helpers' own sources are scanned too. */
export function findCopies(source: string): string[] {
  const code = blank(source)
  const line = (index: number) => code.slice(0, index).split('\n').length
  const found = new Set<string>()

  const intl = INTL.exec(code)
  if (intl) found.add(`number-format copy at line ${line(intl.index)}: Intl.NumberFormat belongs to ${NUMBER_HELPER}`)

  const def = DEFAULT_DEF.exec(code)
  if (def) found.add(`voice default redefined at line ${line(def.index)}: DEFAULT_REGISTER and DEFAULT_LOCALE are defined in ${VOICE_HELPER} and re-exported from there`)

  const spans = braces(code)
  for (const [a, b] of spans) {
    const body = code.slice(a + 1, b)
    if (body.includes('{')) continue // the pair is detected at the innermost region that holds it
    if (!OPTIONAL_LOCALE.test(body) || !OPTIONAL_REGISTER.test(body)) continue
    const members = body.split(/[;\n]/).map((s) => s.trim()).filter(Boolean)
    if (members.length === 2 && members.every((mem) => /^(?:locale|register)\?\s*:/.test(mem)))
      found.add(`voice-with-defaults interface at line ${line(a)}: the optional locale/register pair is ${VOICE_HELPER}'s VoiceInput; widen it or extend it, do not copy it`)
  }

  for (const m of code.matchAll(TRY)) {
    const open = code.indexOf('{', m.index)
    const span = spans.find(([a]) => a === open)
    if (span && LOCALSTORAGE.test(code.slice(span[0], span[1] + 1)))
      found.add(`guarded localStorage block at line ${line(m.index)}: storage access goes through ${STORAGE_HELPER} (readStored / writeStored / removeStored / browserStorage)`)
  }

  return [...found].sort()
}

const SRC = join(import.meta.dirname, '..')
const files = walkFiles(SRC).filter((p) => /\.(ts|tsx|astro)$/.test(p))
const text = new Map(files.map((p) => [relative(SRC, p).split(sep).join('/'), readFileSync(p, 'utf8')]))
const isTest = (rel: string) => /\.test\.(ts|tsx)$/.test(rel)

describe('the shared-lib copies do not grow back (#141)', () => {
  it('has a real tree to scan', () => {
    expect(files.length, `found ${files.length} source files, expected at least 400`).toBeGreaterThanOrEqual(400)
  })

  it('the three helpers exist', () => {
    for (const helper of [NUMBER_HELPER, VOICE_HELPER, STORAGE_HELPER]) expect(text.has(helper), `${helper} missing`).toBe(true)
  })

  it.each([
    [NUMBER_HELPER, /number-format copy/],
    [VOICE_HELPER, /voice-with-defaults interface/],
    [VOICE_HELPER, /voice default redefined/],
    [STORAGE_HELPER, /guarded localStorage block/],
  ])('the exemption for %s is still needed (%s)', (helper, rule) => {
    const hits = findCopies(text.get(helper)!)
    expect(hits.filter((h) => rule.test(h)), `${helper} no longer trips ${rule} — drop the exemption if the rule it owned moved`).not.toEqual([])
  })

  it('no Intl.NumberFormat outside the number-format helper', () => {
    const hits = [...text].filter(([p]) => p !== NUMBER_HELPER).flatMap(([p, src]) => findCopies(src).filter((h) => h.startsWith('number-format copy')).map((h) => `${p}: ${h}`))
    expect(hits).toEqual([])
  })

  it('no voice-with-defaults interface outside the voice helper', () => {
    const hits = [...text].filter(([p]) => p !== VOICE_HELPER).flatMap(([p, src]) => findCopies(src).filter((h) => h.startsWith('voice-with-defaults interface')).map((h) => `${p}: ${h}`))
    expect(hits).toEqual([])
  })

  it('DEFAULT_REGISTER and DEFAULT_LOCALE defined only in the voice helper', () => {
    const hits = [...text].filter(([p]) => p !== VOICE_HELPER).flatMap(([p, src]) => findCopies(src).filter((h) => h.startsWith('voice default redefined')).map((h) => `${p}: ${h}`))
    expect(hits).toEqual([])
  })

  it('no try+localStorage block outside the safe-storage helper', () => {
    const hits = [...text]
      .filter(([p]) => p !== STORAGE_HELPER && !isTest(p))
      .flatMap(([p, src]) => findCopies(src).filter((h) => h.startsWith('guarded localStorage block')).map((h) => `${p}: ${h}`))
    expect(hits).toEqual([])
  })

  it.each([
    ['a hand-rolled number format', "const f = new Intl.NumberFormat('pt-BR')", /number-format copy/],
    ['the voice-with-defaults interface copied as an interface', 'interface Voice { locale?: Locale; register?: Register }', /voice-with-defaults interface/],
    ['the voice-with-defaults interface copied as a type alias', 'type Voice = { locale?: Locale; register?: Register }', /voice-with-defaults interface/],
    ['the pair inline in a multi-line declaration', 'interface In {\n  locale?: Locale\n  register?: Register\n}', /voice-with-defaults interface/],
    ['a DEFAULT_REGISTER definition', "export const DEFAULT_REGISTER: Register = 'standard'", /voice default redefined/],
    ['a DEFAULT_LOCALE definition', "const DEFAULT_LOCALE = 'pt-BR'", /voice default redefined/],
    ['a try around a localStorage read', "let v: string | null\ntry {\n  v = localStorage.getItem('k')\n} catch {\n  v = null\n}", /guarded localStorage block/],
    ['a try around a localStorage write', "try {\n  localStorage.setItem('k', JSON.stringify(v))\n} catch {\n  // full or blocked\n}", /guarded localStorage block/],
  ])('flags %s', (_label, source, rule) => {
    expect(findCopies(source).join(' | ')).toMatch(rule)
  })

  it.each([
    ['re-exporting the constants', "export { DEFAULT_REGISTER, REGISTERS, type Register } from './voice'"],
    ['using a constant in a default', "export function message(voice: VoiceInput = {}) { return { locale: voice.locale ?? DEFAULT_LOCALE, register: voice.register ?? DEFAULT_REGISTER } }"],
    ['the canonical full voice', 'interface Voice { locale: Locale; register: Register }'],
    ['an options interface embedding the pair among other fields', 'interface CardOptions {\n  alt?: string\n  locale?: Locale\n  register?: Register\n}'],
    ['an interface with the pair and a method', 'interface Store {\n  locale?: Locale\n  register?: Register\n  read(): string\n}'],
    ['an Intl name in a comment', "// prefer Intl.NumberFormat once the locale lands\nexport const x = 1"],
    ['a guarded access inside a string payload', "export const bootScript = `try { localStorage.getItem('k') } catch {}`"],
    ['a try that never names localStorage', "try {\n  JSON.parse(raw)\n} catch {\n  return undefined\n}"],
    ['a localStorage mention without a try (covered by the helper contract, not this guard)', 'const s = globalThis.localStorage'],
  ])('lets %s pass', (_label, source) => {
    expect(findCopies(source)).toEqual([])
  })
})
