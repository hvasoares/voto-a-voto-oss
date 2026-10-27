import { resolve } from 'node:path'

/**
 * Where the dataset comes from, relative to web/. Default: the committed fixtures of site/ (reused, not copied).
 * Real data: DATA_DIR=../data
 */
export function dataDir(env: Record<string, string | undefined> = process.env, cwd = process.cwd()): string {
  return resolve(cwd, env.DATA_DIR ?? '../site/fixtures/data')
}
