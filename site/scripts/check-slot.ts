/**
 * One command per slot: `npm run check-slot -- <slot>`.
 * Gates, in order (a failed gate stops the run and is never waived):
 *   1. behaviour tests: the slot's unit tests, then the e2e route/layout/frontend-only checks for its routes
 *   2. screenshot capture of the fixture state at 390x844 -> .captures/<slot>/ next to the Sketch reference
 * Gate 2 only CAPTURES. The review (docs/screenshot-review-protocol.md) is a separate step by a fresh-context reviewer.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { slots } from '../src/slots/registry'

const id = process.argv[2]
if (!id || !slots.some((s) => s.meta.id === id)) {
  console.error(`usage: npm run check-slot -- <slot>\nslots: ${slots.map((s) => s.meta.id).join(', ')}`)
  process.exit(2)
}
const slot = slots.find((s) => s.meta.id === id)!
const run = (label: string, cmd: string, args: string[], env: Record<string, string> = {}) => {
  console.log(`\n=== ${label}`)
  const r = spawnSync(cmd, args, { stdio: 'inherit', env: { ...process.env, SLOT: id, ...env } })
  return r.status === 0
}

const results: [string, boolean][] = []
const gate = (name: string, ok: boolean) => {
  results.push([name, ok])
  if (!ok) {
    summary()
    process.exit(1)
  }
}
function summary() {
  console.log(`\n--- check-slot ${id} (ticket #${slot.meta.ticket}) ---`)
  for (const [n, ok] of results) console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}`)
}

gate('1a behaviour tests (vitest, slot + shared)', run('1a vitest', 'npx', ['vitest', 'run', `src/slots/${id}`, 'src/shared']))
gate('1b route, layout and frontend-only checks (playwright, 390x844)', run('1b playwright', 'npx', ['playwright', 'test', '--project=phone']))
gate('2 fixture-state screenshot captured', run('2 capture', 'npx', ['playwright', 'test', '--project=capture']))

summary()
for (const state of ['default', ...(slot.meta.extraFixtures ?? []).map((e) => e.name)]) {
  const meta = resolve('.captures', id, `${state}.json`)
  if (!existsSync(meta)) continue
  const m = JSON.parse(readFileSync(meta, 'utf8'))
  console.log(`\nreview state "${state}":\n  render:    ${m.capture}\n  reference: ${m.reference ? resolve(m.reference) : '(none: no Sketch frame)'}\n  viewport:  ${m.viewport.width}x${m.viewport.height}, scrollY ${m.scrollY}, route ${m.route}`)
}
console.log('\nNext: give a fresh-context reviewer ONLY the reference, the render and docs/screenshot-review-protocol.md.')
