/**
 * `npm run approve-baseline -- <slot>`: stores the CURRENT render of the slot (fixture state, 390x844) as its
 * regression baseline (e2e/baselines/<platform>/<slot>-<state>.png, via Playwright toHaveScreenshot).
 *
 * Run this ONLY after the screenshot review of the checkpoint passed and the checkpoint was approved.
 * Agents do not approve their own work: the approval is a human (or the designated reviewer) decision.
 * Pass --yes to confirm that the review passed.
 */
import { spawnSync } from 'node:child_process'
import { slots } from '../src/slots/registry'

const [id, flag] = process.argv.slice(2)
if (!id || !slots.some((s) => s.meta.id === id)) {
  console.error(`usage: npm run approve-baseline -- <slot> --yes\nslots: ${slots.map((s) => s.meta.id).join(', ')}`)
  process.exit(2)
}
if (flag !== '--yes') {
  console.error('Refusing: pass --yes to confirm the screenshot review of this checkpoint passed and was approved.')
  process.exit(2)
}
const r = spawnSync('npx', ['playwright', 'test', '--project=baseline', '--update-snapshots'], { stdio: 'inherit', env: { ...process.env, SLOT: id, UPDATE_BASELINE: '1' } })
process.exit(r.status ?? 1)
