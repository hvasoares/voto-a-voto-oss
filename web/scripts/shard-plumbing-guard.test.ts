import { globSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * #139 guard: the build-time loaders and the check scripts get the data directory, the fingerprint files and the shards from the shared
 * plumbing (`dataDir`, `createNodeStore`, `readShardSources`, `loadDatasetShards`). One that re-implements the preamble fails here.
 */
const WEB = resolve(import.meta.dirname, '..')
const SCANNED = [
  ...globSync('src/lib/**/*-{load,data}.ts', { cwd: WEB }),
  'src/lib/states.ts',
  ...globSync('scripts/*-check.ts', { cwd: WEB }).filter((f) => !f.includes('css-decoy')),
].filter((f) => !f.endsWith('.test.ts')).sort()

/** The copied preamble, piece by piece. */
export const FORBIDDEN: [RegExp, string][] = [
  [/\bFINGERPRINT_FILES\b/, 'reads the fingerprint files itself: use readShardSources / loadDatasetShards'],
  [/\bbuildShards\(/, 'builds the shards from sources it read itself: use loadDatasetShards'],
  [/\bdiskSource\(/, 'wires the disk source itself: use createNodeStore'],
  [/\bcreateStore\(/, 'creates the store itself: use createNodeStore'],
  [/process\.env\.DATA_DIR/, 'reads DATA_DIR itself: use dataDir'],
]

export const violations = (files: Record<string, string>): string[] =>
  Object.entries(files).flatMap(([file, text]) => FORBIDDEN.filter(([re]) => re.test(text)).map(([, why]) => `${file}: ${why}`))

describe('loaders and check scripts use the shared shard plumbing (#139)', () => {
  it('scans the 14 loaders and the 6 check scripts (a glob that matches nothing guards nothing)', () => {
    expect(SCANNED.filter((f) => f.startsWith('scripts/'))).toHaveLength(6)
    expect(SCANNED.filter((f) => f.startsWith('src/')).length).toBeGreaterThanOrEqual(14)
  })

  it('none of them re-implements the data-dir or fingerprint preamble', () => {
    const texts = Object.fromEntries(SCANNED.map((f) => [f, readFileSync(resolve(WEB, f), 'utf8')]))
    expect(violations(texts)).toEqual([])
  })

  it('can fail: the old preamble pasted into a loader is reported', () => {
    const old = "const dir = dataDir()\nconst sources = {} as ShardSources\nfor (const f of FINGERPRINT_FILES) sources[f] = readFileSync(resolve(dir, f), 'utf8')\nconst built = buildShards(sources)\nconst store = createStore(diskSource(dir))\n"
    expect(violations({ 'src/lib/x-load.ts': old })).toHaveLength(4)
  })
})
