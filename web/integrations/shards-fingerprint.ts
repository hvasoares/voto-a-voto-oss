/**
 * The shard fingerprint and the virtual module that publishes it — kept apart from the shard builder in
 * `shards.ts` so build tooling (vite/vitest configs) can import it without the app's `@site` resolution. Pure
 * Node: no imports from web/src beyond the plain `data-dir` helper and no @site imports at all.
 */
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'
import { dataDir } from '../src/lib/data-dir'

/** Virtual module that exposes the fingerprint of the dataset being built to client and page code. */
export const SHARD_VIRTUAL_ID = 'virtual:data-shards'

/**
 * The six committed dataset files (the five the app store reads and `centroids.csv`, ticket #40, which only the shards use), already in fingerprint order (code-point). Mirrors the DATA_FILES of the
 * site store; shards.test.ts locks the two lists so the store and the shards cannot drift apart.
 */
export const FINGERPRINT_FILES = ['candidates.csv', 'centroids.csv', 'cities.csv', 'manifest.json', 'turnout.csv', 'votes.csv'] as const

export type DataFile = (typeof FINGERPRINT_FILES)[number]

/** Sources of one dataset (its six file texts), the input of the fingerprint and of the shard builder. */
export type ShardSources = Record<DataFile, string>

/** A short, deterministic digest of the dataset: the shard directory name ("a stale copy is never served"). */
export function datasetFingerprint(sources: ShardSources): string {
  const hash = createHash('sha256')
  for (const f of FINGERPRINT_FILES) hash.update(f).update('\0').update(sources[f]!).update('\0')
  return hash.digest('hex').slice(0, 16)
}

/** The fingerprint of the configured dataset on disk (what the Playwright specs assert against the served build). */
export async function datasetFingerprintFromDisk(
  env: Record<string, string | undefined> = process.env,
  cwd = process.cwd(),
): Promise<string> {
  const dir = dataDir(env, cwd)
  const sources = {} as Record<string, string>
  for (const f of FINGERPRINT_FILES) sources[f] = readFileSync(resolve(dir, f), 'utf8')
  return datasetFingerprint(sources as ShardSources)
}

let fingerprintPromise: Promise<string> | undefined
/** The fingerprint of the dataset being built, for `virtual:data-shards` and the dataset integration. */
export function builtFingerprint(): Promise<string> {
  return (fingerprintPromise ??= datasetFingerprintFromDisk())
}

/** Vite plugin exposing `virtual:data-shards`: the only versioned fact the client and page code need. */
export function shardsModule(): Plugin {
  return {
    name: 'voto-shards',
    resolveId: (source) => (source === SHARD_VIRTUAL_ID ? '\0' + SHARD_VIRTUAL_ID : undefined),
    load: async (source) =>
      source === '\0' + SHARD_VIRTUAL_ID ? { code: `export const SHARD_VERSION = ${JSON.stringify(await builtFingerprint())}\n`, map: null } : undefined,
  }
}