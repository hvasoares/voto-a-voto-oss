import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * The one directory-tree walker of the test guards (#111 landed it inline; #110 extracts it, per the
 * shared-helper rule of both tickets). Returns every file under `dir`, recursively — callers filter.
 */
export function walkFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? walkFiles(p) : [p]
  })
}
