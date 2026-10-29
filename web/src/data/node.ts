import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { dataDir } from '../lib/data-dir'
import { createStore } from './store'
import type { DataStore, TextSource } from './types'

export function diskSource(dir: string): TextSource {
  return (file) => readFile(resolve(dir, file), 'utf8')
}

/** The store over the configured dataset directory (`dataDir`: DATA_DIR, default the fixtures), or over `dir`. */
export function createNodeStore(dir = dataDir()): DataStore {
  return createStore(diskSource(dir))
}
