import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createStore } from './store'
import type { DataStore, TextSource } from './types'

/** Where the data comes from. Default: committed fixtures. Real data: DATA_DIR=../data (relative to site/). */
export function dataDir(env: NodeJS.ProcessEnv = process.env, cwd = process.cwd()): string {
  return resolve(cwd, env.DATA_DIR ?? 'fixtures/data')
}

export function diskSource(dir: string): TextSource {
  return (file) => readFile(resolve(dir, file), 'utf8')
}

export function createNodeStore(dir = dataDir()): DataStore {
  return createStore(diskSource(dir))
}
