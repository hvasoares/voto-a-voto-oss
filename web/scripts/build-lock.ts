import { mkdirSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'

/**
 * One fixture `astro build` at a time per checkout (#117). Two builds of the same checkout share
 * `web/.astro/.prerender`, so vitest files that each run `astro build` (the CSS decoy check #125, the
 * own-copies guard #117) would delete each other's prerender chunks when vitest runs them in parallel.
 * Every such build runs inside `withBuildLock`: the lock is a directory made atomically in the OS temp
 * folder, keyed by the checkout path (two checkouts never wait for each other); a lock older than
 * `STALE_MS` belongs to a crashed run and is taken over. Synchronous, like the `execFileSync` it wraps.
 */
const STALE_MS = 5 * 60_000
const POLL_MS = 150

const sleep = (ms: number): void => void Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)

export function withBuildLock<T>(webRoot: string, run: () => T): T {
  const lock = join(tmpdir(), `voto-a-voto-build-${createHash('sha1').update(webRoot).digest('hex').slice(0, 12)}.lock`)
  for (;;) {
    try {
      mkdirSync(lock)
      break
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
      try {
        if (Date.now() - statSync(lock).mtimeMs > STALE_MS) rmSync(lock, { recursive: true, force: true })
      } catch {
        // the holder released it between the two calls: try again
      }
      sleep(POLL_MS)
    }
  }
  try {
    return run()
  } finally {
    rmSync(lock, { recursive: true, force: true })
  }
}
