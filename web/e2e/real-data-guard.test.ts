/**
 * The real-data specs take their figures and their wording from the oracle (#127), and this guard keeps it that way
 * (modelled on `src/lib/sentences/outside-catalog.test.ts`):
 *
 *  1. no real-data spec holds a catalog sentence inside a quoted string: it would not follow a copy change. The sentences
 *     are the pt-BR templates of `CATALOG` (every `catalog-*.ts` registered), taken by their static fragments with the
 *     same rule as the outside-catalog guard (`fragments()`: at least 14 characters and 4 words);
 *  2. no real-data spec reads a data file itself (`parseCsv`, `readFileSync(` of a .csv, of `../data`, of `DATA_DIR` or of the
 *     manifest): the oracle is the one reader.
 *
 * Deliberate golden values (a published ranking that is itself the product of the formula, so counting cannot give it) are
 * listed once in `GOLDEN` with a reason each. A listed literal exempts the quoted strings that contain it; the test fails on a
 * listed literal that no longer appears in its file (stale), so the list cannot outlive the spec.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { REAL_DATA_SPEC } from '../scripts/sample-manifest'
import { CATALOG } from '../src/lib/sentences/catalog'

const E2E = import.meta.dirname
// Every `catalog-<feature>.ts` registers itself on import; the glob finds them, so a new catalog file needs no edit here.
import.meta.glob(['../src/lib/sentences/catalog-*.ts', '!../src/lib/sentences/catalog-*.test.ts'], { eager: true })
// The data-only catalogs (their owner registers them "for the build and the tests", see outside-catalog.test.ts).
await import('../src/lib/question')

/** Golden values kept on purpose: `file`, the `literal` as it stands in the spec, and why counting cannot give it. */
export const GOLDEN: readonly { file: string; literal: string; reason: string }[] = [
  { file: 'real-data-cidades-fora-da-curva.spec.ts', literal: 'Itaubal/AP', reason: 'the first city of the outlier ranking: the ranking orders by the distance from the median of five similar cities, a formula (src/lib/reports/outliers.ts), not a count' },
  { file: 'real-data-cidades-fora-da-curva.spec.ts', literal: '59,0% (típico 82,2%)', reason: 'its turnout against the median of its five similar cities: the typical value needs the peers file' },
  { file: 'real-data-cidades-fora-da-curva.spec.ts', literal: 'Marechal Thaumaturgo/AC', reason: 'second of the same ranking' },
  { file: 'real-data-cidades-fora-da-curva.spec.ts', literal: 'Iracema/RR', reason: 'third of the same ranking' },
  { file: 'real-data-cidades-fora-da-curva.spec.ts', literal: 'mediana de 5 cidades parecidas', reason: 'five peers is the method (src/lib/reports/outliers.ts), not a figure of the data' },
  { file: 'reports-real-data.spec.ts', literal: "['es', 'apiaca']", reason: 'the page orders the many one-vote races by its own tie-breaking rule; the spec names two of them and counts their votes' },
  { file: 'reports-real-data.spec.ts', literal: "['go', 'anhanguera']", reason: 'the one-vote race whose row id failed in 1.13.0 (backtest case 4bd5da4): named by slug, its votes counted' },
]

/** The static stretches of a template (between its `{slots}`) that are long enough to be telling: the outside-catalog rule. */
const fragments = (tpl: string) => tpl.split(/\{\w+\}/).map((s) => s.trim()).filter((s) => s.length >= 14 && (s.match(/\p{L}{2,}/gu) ?? []).length >= 4)

/** Source with its comments blanked out, line numbers kept (a comment may quote a sentence to explain it). */
const code = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:])\/\/.*$/gm, '$1')

interface Literal { text: string; line: number }
/** The quoted strings of a source; a template literal's `${...}` holes become U+0000 so a fragment cannot straddle one. */
const literals = (src: string): Literal[] =>
  [...src.matchAll(/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g)].map((m) => ({
    text: (m[1] ?? m[2] ?? m[3] ?? '').replace(/\$\{[^}]*\}/g, '\u0000'),
    line: src.slice(0, m.index).split('\n').length,
  }))

const FRAGMENTS = [...new Set(Object.values(CATALOG['pt-BR']).flatMap((messages) => Object.values(messages as Record<string, string>)).flatMap(fragments))]

/** Pure: what is wrong with one real-data spec (its file name, its source and the golden list). */
export function violations(file: string, source: string, golden = GOLDEN): string[] {
  const exempt = golden.filter((g) => g.file === file).map((g) => g.literal)
  const body = code(source)
  const out: string[] = []
  for (const { text, line } of literals(body)) {
    if (exempt.some((literal) => text.includes(literal))) continue
    for (const fragment of FRAGMENTS) if (text.includes(fragment)) out.push(`${file}:${line}: catalog sentence in a string: "${fragment}"`)
  }
  if (/\bparseCsv\b|readFileSync\([^)]*(\.csv|\.\.\/data|DATA_DIR|manifest\.json)/.test(body)) out.push(`${file}: parses a data file; use real-data-oracle.ts`)
  return out
}

const specs = readdirSync(E2E).filter((f) => REAL_DATA_SPEC.test(f)).sort()
const source = new Map(specs.map((f) => [f, readFileSync(join(E2E, f), 'utf8')]))

describe('the real-data specs hold no catalog sentence and read no data file', () => {
  it('has the specs and the catalog fragments to compare with', () => {
    expect(specs.length, 'real-data specs found').toBeGreaterThanOrEqual(21)
    expect(FRAGMENTS.length, 'catalog fragments found').toBeGreaterThan(500)
  })

  it.each(specs)('%s', (file) => {
    expect(violations(file, source.get(file)!)).toEqual([])
  })

  it('every golden value still appears in its spec (a stale entry fails)', () => {
    expect(GOLDEN.filter((g) => !source.get(g.file)?.includes(g.literal)).map((g) => `${g.file}: ${g.literal}`)).toEqual([])
  })

  it('every golden value names its reason', () => {
    expect(GOLDEN.filter((g) => g.reason.length < 20)).toEqual([])
  })

  describe('the guard can fail', () => {
    const sentence = 'Lista de triagem, não uma conclusão: cidades mais distantes de cidades parecidas no comparecimento e na virada desde 2022.'

    it('a spec string that holds a catalog fragment is one violation, with file and line', () => {
      const spec = `import { test } from '@playwright/test'\ntest('x', async () => {\n  await expect(page.locator('p')).toHaveText('${sentence}')\n})\n`
      const found = violations('real-data-fake.spec.ts', spec)
      expect(found).toHaveLength(1)
      expect(found[0]).toMatch(/^real-data-fake\.spec\.ts:3: catalog sentence/)
    })

    it('a fragment inside a comment is not a violation', () => {
      expect(violations('real-data-fake.spec.ts', `// "${sentence}"\n/* '${sentence}' */\nconst x = 1\n`)).toEqual([])
    })

    it('a listed golden literal exempts its string, and only in its own file', () => {
      const spec = `const x = '${sentence} Itaubal/AP'\n`
      const golden = [{ file: 'real-data-fake.spec.ts', literal: 'Itaubal/AP', reason: 'a golden value for the unit case' }]
      expect(violations('real-data-fake.spec.ts', spec, golden)).toEqual([])
      expect(violations('real-data-other.spec.ts', spec, golden)).toHaveLength(1)
    })

    it('a spec that parses a data file itself is a violation', () => {
      expect(violations('real-data-fake.spec.ts', "import { readFileSync } from 'node:fs'\nconst t = readFileSync(resolve('../data', 'cities.csv'), 'utf8')\n")).toHaveLength(1)
      expect(violations('real-data-fake.spec.ts', 'const rows = parseCsv(text)\n')).toHaveLength(1)
      expect(violations('real-data-fake.spec.ts', "const m = readFileSync(resolve('../data/manifest.json'), 'utf8')\n")).toHaveLength(1)
    })
  })
})
