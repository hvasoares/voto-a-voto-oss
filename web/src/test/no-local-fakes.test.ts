/**
 * Guard (#135): the shared pieces of src/test are the ONLY storage double, component cleanup and
 * sentence-input builder in the suite, so the copies removed there do not grow back. The rules, run
 * over every test file of src (this directory excluded — it holds the shared pieces):
 *  1. no `class X implements Storage`;
 *  2. no object literal defining both getItem and setItem;
 *  3. no `afterEach(cleanup)` / `afterEach(() => cleanup())` (the setup file already does it);
 *  4. in the sentence tests, no builder literal carrying both `validos:` and `turno:` — sentenceInput
 *     and rawSentenceInput are the way in.
 * findLocalFakes is pure; the seeded fixtures below prove every rule can fail before the same scan
 * runs over the real tree.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

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

const STORAGE_CLASS = /class\s+\w+\s+implements\s+[^\n{]*\bStorage\b/
const GET_DEF = /(?<![.\w$])getItem\s*[:(]/
const SET_DEF = /(?<![.\w$])setItem\s*[:(]/
const AFTER_CLEANUP = /afterEach\(\s*(?:\(\s*\)\s*=>\s*)?cleanup\b/
const VALIDOS_PROP = /(?<![.\w$])validos\s*:/
const TURNO_PROP = /(?<![.\w$])turno\s*:/

export function findLocalFakes(source: string, opts: { sentenceTest?: boolean } = {}): string[] {
  const code = blank(source)
  const line = (index: number) => code.slice(0, index).split('\n').length
  const found = new Set<string>()

  const klass = STORAGE_CLASS.exec(code)
  if (klass) found.add(`storage-class at line ${line(klass.index)}: a Storage implementation belongs to src/test/memory-storage.ts`)

  for (const [a, b] of braces(code)) {
    const body = code.slice(a, b + 1)
    if (GET_DEF.test(body) && SET_DEF.test(body))
      found.add(`storage-literal at line ${line(a)}: a storage object literal belongs to src/test/memory-storage.ts`)
  }

  for (const m of code.matchAll(new RegExp(AFTER_CLEANUP.source, 'g')))
    found.add(`afterEach-cleanup at line ${line(m.index)}: the cleanup runs in src/test/setup.ts, not per file`)

  if (opts.sentenceTest)
    for (const [a, b] of braces(code)) {
      const body = code.slice(a, b + 1)
      const innermost = !body.slice(1, -1).includes('{')
      if (innermost && VALIDOS_PROP.test(body) && TURNO_PROP.test(body))
        found.add(`sentence-builder-literal at line ${line(a)}: a validos/turno builder literal belongs to src/test/sentence-input.ts`)
    }

  return [...found].sort()
}

const SRC = join(import.meta.dirname, '..')
const testFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === 'test' ? [] : testFiles(path)
    return /\.test\.tsx?$/.test(name) ? [path] : []
  })
const isSentenceTest = (rel: string) => rel.startsWith(join('lib', 'sentences') + '/') || rel === join('lib', 'city-texts.test.ts')

describe('no local fakes grow back (#135)', () => {
  it.each([
    ['a class implementing Storage', 'class FakeStorage implements Storage {\n  getItem(k: string) { return null }\n  setItem(k: string, v: string) {}\n}', /storage-class/],
    ['an object literal with getItem and setItem', "const s = { getItem: (k: string) => null, setItem: (k: string, v: string) => {} }", /storage-literal/],
    ['a throwing storage literal', "const s = {\n  getItem: () => { throw new Error('blocked') },\n  setItem: () => { throw new Error('blocked') },\n}", /storage-literal/],
    ['afterEach(cleanup)', 'afterEach(cleanup)', /afterEach-cleanup/],
    ['afterEach(() => cleanup())', 'afterEach(() => cleanup())', /afterEach-cleanup/],
    ['a builder literal with validos and turno', "const r = buildCityResult({\n  turnout: { ano: 2026, turno: 1, uf: 'rj', validos: 900 },\n  votes: [],\n  candidates: [],\n})", /sentence-builder-literal/],
  ])('flags %s', (_label, source, rule) => {
    expect(findLocalFakes(source, { sentenceTest: true }).join(' | ')).toMatch(rule)
  })

  it.each([
    ['a storage read is not a definition', "const v = s.getItem(KEY)\ns.setItem(KEY, 'x')"],
    ['the shared throwing storage call', "const s = createThrowingStorage({ get: new Error('x'), set: new Error('y') })"],
    ['an afterEach with other work in it', 'afterEach(() => { vi.unstubAllGlobals() })'],
    ['a shared sentence-input call', "const r = sentenceInput({ aptos: 1000, votos: [500, 400] })"],
    ['a raw override with validos but no turno of its own', 'const r = rawSentenceInput({ turno: 2, turnout: { aptos: 1000, validos: 800 }, votes: [], candidates: [] })'],
  ])('lets %s pass', (_label, source) => {
    expect(findLocalFakes(source, { sentenceTest: true })).toEqual([])
  })

  it('no test file of src has a local fake', () => {
    const hits = testFiles(SRC).flatMap((path) => {
      const rel = relative(SRC, path)
      return findLocalFakes(readFileSync(path, 'utf8'), { sentenceTest: isSentenceTest(rel) }).map((f) => `${rel}: ${f}`)
    })
    expect(hits).toEqual([])
  })
})
