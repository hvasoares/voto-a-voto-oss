import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { dataDir } from '../src/lib/data-dir'
import { loadDatasetShards } from './shards'
import { datasetFingerprint, FINGERPRINT_FILES, readShardSources } from './shards-fingerprint'

/** The shared plumbing of #139: which directory, which six files, which shards. */
const fixtures = resolve(import.meta.dirname, '../fixtures/data')
let work: string
beforeEach(() => {
  work = mkdtempSync(join(tmpdir(), 'shard-plumbing-'))
})
afterEach(() => rmSync(work, { recursive: true, force: true }))
const copyOfFixtures = (): string => {
  const d = join(work, 'data')
  cpSync(fixtures, d, { recursive: true })
  return d
}

describe('readShardSources (the I/O half)', () => {
  it('reads the six fingerprint files of a directory as text', () => {
    const sources = readShardSources(fixtures)
    expect(Object.keys(sources)).toEqual([...FINGERPRINT_FILES])
    expect(datasetFingerprint(sources)).toMatch(/^[0-9a-f]{16}$/)
  })

  it('a missing file throws the file system error, or the caller error naming the file', () => {
    const dir = copyOfFixtures()
    rmSync(join(dir, 'centroids.csv'))
    expect(() => readShardSources(dir)).toThrow(/ENOENT.*centroids\.csv/)
    expect(() => readShardSources(dir, (f) => new Error(`no ${f}`))).toThrow('no centroids.csv')
  })

  it('a missing directory fails on the first file', () => {
    expect(() => readShardSources(join(work, 'nowhere'))).toThrow(/ENOENT.*candidates\.csv/)
  })
})

describe('loadDatasetShards (directory, sources and shards in one step)', () => {
  it('uses the fixtures when DATA_DIR is unset', () => {
    const { dir, built } = loadDatasetShards({}, resolve(fixtures, '../..'))
    expect(dir).toBe(fixtures)
    expect(built.files.length).toBeGreaterThan(0)
  })

  it('uses DATA_DIR relative to the working directory when it is set', () => {
    const dir = copyOfFixtures()
    const { dir: used, built } = loadDatasetShards({ DATA_DIR: 'data' }, work)
    expect(used).toBe(dir)
    expect(built.fingerprint).toBe(loadDatasetShards({}, resolve(fixtures, '../..')).built.fingerprint)
    expect(used).toBe(dataDir({ DATA_DIR: 'data' }, work))
  })

  it('a missing fingerprint file fails', () => {
    const dir = copyOfFixtures()
    rmSync(join(dir, 'manifest.json'))
    expect(() => loadDatasetShards({ DATA_DIR: dir }, work)).toThrow(/manifest\.json/)
  })

  it('an empty shard source fails with the schema error of the file', () => {
    const dir = copyOfFixtures()
    writeFileSync(join(dir, 'votes.csv'), '')
    expect(() => loadDatasetShards({ DATA_DIR: dir }, work)).toThrow('votes.csv: empty file')
  })
})
