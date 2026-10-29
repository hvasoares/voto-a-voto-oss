import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { checkOutcomes, shardTreeHashes, WEB } from './shard-baseline'

/** #139: the shard plumbing is pinned to what it produced before the shared helper existed (scripts/shard-baseline.json). */
const baseline = JSON.parse(readFileSync(resolve(WEB, 'scripts/shard-baseline.json'), 'utf8')) as { tree: Record<string, string>; checks: Record<string, unknown> }

describe('shard plumbing keeps its output (#139)', () => {
  it('the fixture shard tree is deterministic and has the recorded bytes', () => {
    expect(shardTreeHashes()).toEqual(shardTreeHashes())
    expect(shardTreeHashes()).toEqual(baseline.tree)
  })

  it('the six check scripts keep their exit code and message on the green and the red-path fixtures', { timeout: 120_000 }, async () => {
    expect(await checkOutcomes()).toEqual(baseline.checks)
  })
})
