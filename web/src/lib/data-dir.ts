import { resolve } from 'node:path'

/**
 * Where the dataset comes from, relative to web/. Default: the committed fixtures in web/fixtures/data.
 * Real data: DATA_DIR=../data (relative to web/).
 */
export function dataDir(env: Record<string, string | undefined> = process.env, cwd = process.cwd()): string {
  return resolve(cwd, env.DATA_DIR ?? 'fixtures/data')
}
