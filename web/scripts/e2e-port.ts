/**
 * One e2e port per checkout (ticket #124): Playwright, the serve script and `npm run e2e:port` all derive
 * the same port from the working directory, so worktrees and parallel agents never collide on a fixed port.
 * An explicit E2E_PORT still wins.
 */
import { spawnSync } from 'node:child_process'
import { realpathSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

// 20000-29999: outside the common dev ports and the old 4173-4180. The hash is stable, so the Playwright
// config, the serve script and any later command agree with no shared state.
export const PORT_MIN = 20000
export const PORT_SPAN = 10000
export const PROBE_LIMIT = 50

export function fnv1a32(input: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** realpath so a checkout reached through a symlink hashes the same; missing paths (unit tests) resolve. */
function canonical(cwd: string): string {
  try {
    return realpathSync(cwd)
  } catch {
    return resolve(cwd)
  }
}

/** E2E_PORT_OFFSET (default 0): `make e2e-pages` and CI's second base pass set 1; the CDN legs add 2 and 3. */
export function offsetFrom(env: Record<string, string | undefined>): number {
  const raw = env.E2E_PORT_OFFSET
  if (raw === undefined || raw === '') return 0
  const offset = Number(raw)
  if (!Number.isInteger(offset) || offset < 0) throw new Error(`E2E_PORT_OFFSET must be a non-negative integer (got "${raw}")`)
  return offset
}

export function portFor(cwd: string, env: Record<string, string | undefined>, taken: (p: number) => boolean, offset = 0): number {
  const explicit = env.E2E_PORT
  if (explicit !== undefined && explicit !== '') {
    // Explicit wins: it is returned as-is (no offset) — but a busy explicit port is still reported.
    const port = Number(explicit)
    if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error(`E2E_PORT must be a port number (got "${explicit}")`)
    if (taken(port)) throw inUse(port, cwd)
    return port
  }
  const start = PORT_MIN + ((fnv1a32(canonical(cwd)) + offset) % PORT_SPAN)
  // Deterministic probe: two processes started one after another agree unless a port was taken between them.
  for (let step = 0; step < PROBE_LIMIT; step++) {
    const port = PORT_MIN + ((start - PORT_MIN + step) % PORT_SPAN)
    if (!taken(port)) return port
  }
  throw inUse(start, cwd)
}

function inUse(port: number, cwd: string): Error {
  return new Error(`E2E port ${port} is in use (checkout ${cwd}). Set E2E_PORT=<other> or stop the other run; do not kill by port.`)
}

/** Synchronous TCP bind test: can a server take this port right now? Costs one child process per probe. */
export function tcpTaken(port: number): boolean {
  const probe = `
    const s = require('node:net').createServer()
    s.on('error', () => process.exit(1))
    s.listen(${port}, () => s.close(() => process.exit(0)))
  `
  return spawnSync(process.execPath, ['-e', probe]).status !== 0
}

// Only when run as a script (`npm run e2e:port`): print the port for the current checkout.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(portFor(process.cwd(), process.env, tcpTaken, offsetFrom(process.env)))
}
