/**
 * The lint half of #134: `findRawShareMocks` (a pure scan, imported from share-mock.ts) walks every web/e2e
 * file except share-mock.ts and fails when a spec redefines the share API by hand. A seeded fixture per pattern
 * proves each one can fail; the last case is the real scan of the directory.
 *
 * The fixture sources are assembled from fragments so this file passes the scan it asserts.
 */
import { globSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { findRawShareMocks } from './share-mock'

const here = fileURLToPath(new URL('.', import.meta.url))

const DEFINE = 'Object.define' + 'Property'
const NAV = 'navi' + 'gator'
const CAN = 'can' + 'Share'
const SHARE = 'sha' + 're'

const cases: { name: string; source: string }[] = [
  { name: 'defineProperty on share', source: `${DEFINE}(${NAV}, '${SHARE}', { value: undefined, configurable: true })` },
  { name: 'defineProperty on canShare, line broken after the call', source: `${DEFINE}(\n  ${NAV}, "${CAN}", {` },
  { name: 'an assignment to share', source: `${NAV}.${SHARE} = () => Promise.resolve()` },
  { name: 'an assignment to canShare', source: `${NAV}.${CAN} = undefined` },
  { name: 'a canShare property in an object literal', source: `const stub = { ${CAN}: () => true }` },
  { name: "a 'share' redefinition through a helper", source: `redefine(window.${NAV}, '${SHARE}', { value: 1 })` },
]

const clean = [
  "import { shareMock } from './share-mock'",
  "await shareMock(page).install('shares')",
  `${DEFINE}(${NAV}, 'geolocation', { value: undefined, configurable: true })`,
  `expect(${NAV}.${SHARE}).toBeDefined()`,
  `if (${NAV}.${CAN}(data)) await ${NAV}.${SHARE}(data)`,
].join('\n')

describe('no raw share mock (#134)', () => {
  it.each(cases)('catches $name', ({ source }) => {
    const first = source.split('\n')[0]!
    const [finding, ...rest] = findRawShareMocks(`// first line\n${source}`, 'fixture.spec.ts')
    expect(rest, first).toEqual([])
    expect(finding, first).toMatchObject({ file: 'fixture.spec.ts', line: 2 })
  })

  it('the fixture spellings and unrelated reads pass', () => {
    expect(findRawShareMocks(clean, 'fixture.spec.ts')).toEqual([])
  })

  it('no e2e file redefines the share API by hand', () => {
    const files = globSync('**/*.ts', { cwd: here }).filter((f) => f !== 'share-mock.ts')
    const failures: string[] = []
    for (const file of files)
      for (const f of findRawShareMocks(readFileSync(`${here}/${file}`, 'utf8'), file)) failures.push(`${f.file}:${f.line} "${f.literal}" — use the share fixture (share-mock.ts)`)
    expect(failures).toEqual([])
  })
})
