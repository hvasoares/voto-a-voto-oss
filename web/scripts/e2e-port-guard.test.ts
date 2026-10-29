/**
 * Port hygiene guard (ticket #124): no fixed E2E_PORT literal may come back into the scripts, configs,
 * package.json or Makefile, and no script may end a process by port. A leftover server is named by the
 * portFor error text; the human stops it by PID. The forbidden tool names are assembled from fragments so
 * this test file itself stays scannable.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const web = fileURLToPath(new URL('..', import.meta.url))

const scanned = [
  resolve(web, '..', 'Makefile'),
  resolve(web, 'package.json'),
  ...readdirSync(join(web, 'scripts')).filter((f) => f.endsWith('.ts')).map((f) => join(web, 'scripts', f)),
  ...readdirSync(web).filter((f) => f.endsWith('.config.ts')).map((f) => join(web, f)),
]

// E2E_PORT=<digits> or E2E_PORT="<digits>" (env-assignment style); `E2E_PORT: '25000'` in a test fixture is
// a function input, not a pinned port, and E2E_PORT_OFFSET=1 shifts the hash instead of pinning.
const fixedPort = /\bE2E_PORT\s*=\s*["']?\d/

const finders = [
  { tool: 'ls' + 'of', pattern: new RegExp('\\bls' + 'of\\b') },
  { tool: 'fu' + 'ser', pattern: new RegExp('\\bfu' + 'ser\\b') },
]
const ending = new RegExp('\\bki' + 'll\\b')
const portShaped = /\b\d{4,5}\b|\$\(/

describe('e2e port guard', () => {
  it('no file pins E2E_PORT to a numeric literal or ends processes by port', () => {
    const failures: string[] = []
    for (const file of scanned) {
      const content = readFileSync(file, 'utf-8')
      if (fixedPort.test(content)) failures.push(`${file}: assigns E2E_PORT a numeric literal`)
      for (const { tool, pattern } of finders) if (pattern.test(content)) failures.push(`${file}: ${tool} finds a process by port`)
      const lines = content.split('\n')
      for (const [index, line] of lines.entries()) {
        if (ending.test(line) && portShaped.test(line)) failures.push(`${file}:${index + 1}: ends a process next to something port-shaped`)
      }
    }
    expect(failures).toEqual([])
  })

  it('the scanned set is not empty (a moved file must not empty the guard)', () => {
    expect(scanned.length).toBeGreaterThan(4)
  })
})
