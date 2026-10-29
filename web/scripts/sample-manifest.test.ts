/**
 * The guard of ticket #109: the real-data spec list on disk, `e2e/sample.json` and the committed
 * `docs/real-data-sample.md` cannot drift apart. A real-data spec that is in neither the derived sample set nor
 * `fullOnly` fails here, naming the file; so does a stale `fullOnly` entry or a hand-edited doc.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { docPath, loadSampleManifest, realDataSpecs, renderSampleDoc, sampleSpecs } from './sample-manifest'

const webRoot = fileURLToPath(new URL('..', import.meta.url))
const manifest = loadSampleManifest(webRoot)
const disk = realDataSpecs(webRoot)

describe('the real-data sample manifest (ticket #109)', () => {
  it('classifies every real-data spec on disk: the sample set or fullOnly, naming the file otherwise', () => {
    const inSample = new Set(sampleSpecs(manifest, disk))
    const inFullOnly = new Set(manifest.fullOnly.map((f) => f.spec))
    const lost = disk.filter((name) => !inSample.has(name) && !inFullOnly.has(name))
    const both = disk.filter((name) => inSample.has(name) && inFullOnly.has(name))
    expect(lost, `real-data specs in neither the sample set nor fullOnly`).toEqual([])
    expect(both, `real-data specs in BOTH the sample set and fullOnly`).toEqual([])
  })

  it('lists no stale or duplicated fullOnly specs', () => {
    const names = manifest.fullOnly.map((f) => f.spec)
    const stale = names.filter((name) => !disk.includes(name))
    expect(stale, 'fullOnly specs that no longer exist on disk').toEqual([])
    expect(new Set(names).size, 'fullOnly entries duplicated').toBe(names.length)
  })

  it('sorts the states and gives each one a reason (deterministic selection)', () => {
    const ufs = manifest.states.map((s) => s.uf)
    expect(ufs).toEqual([...ufs].sort())
    for (const s of manifest.states) expect(s.why, `state ${s.uf} has no reason`).toBeTruthy()
    for (const f of manifest.fullOnly) expect(f.why, `${f.spec} has no reason`).toBeTruthy()
  })

  it('keeps docs/real-data-sample.md in sync with the manifest (doc is generated, not written by hand)', () => {
    const committed = readFileSync(docPath(webRoot), 'utf8')
    expect(committed, 'run: npx tsx scripts/sample-manifest.ts doc').toBe(renderSampleDoc(manifest, disk))
  })
})
