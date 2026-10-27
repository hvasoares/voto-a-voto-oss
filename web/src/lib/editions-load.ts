/**
 * Build-time loader of the editions (ticket #59): `editions/<id>/edition.json` next to the dataset (`EDITIONS_DIR`,
 * default `<DATA_DIR>/../editions`: `editions/` at the repo root for the real data, `fixtures/editions` for the fixtures).
 * The edition the pages show is the one whose fingerprint is the dataset being built; no match fails the build, so a page
 * never links an edition that does not exist (`make publish-edition` creates it).
 */
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { builtFingerprint } from '../../integrations/shards-fingerprint'
import { dataDir } from './data-dir'
import { newestFirst, type Edition } from './editions'

export function editionsDir(env: Record<string, string | undefined> = process.env, cwd = process.cwd()): string {
  return env.EDITIONS_DIR ? resolve(cwd, env.EDITIONS_DIR) : resolve(dataDir(env, cwd), '..', 'editions')
}

/** Every edition on disk, newest first. */
export function loadEditions(dir = editionsDir()): Edition[] {
  const found = readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => JSON.parse(readFileSync(resolve(dir, e.name, 'edition.json'), 'utf8')) as Edition)
  return newestFirst(found)
}

let memo: Promise<Edition> | undefined
/** The edition the dataset being built is. */
export function currentEdition(): Promise<Edition> {
  return (memo ??= (async () => {
    const fingerprint = await builtFingerprint()
    const edition = loadEditions().find((e) => e.fingerprint === fingerprint)
    if (!edition) throw new Error(`the dataset ${dataDir()} (fingerprint ${fingerprint}) is not a published edition in ${editionsDir()}: run \`make publish-edition\``)
    return edition
  })())
}
