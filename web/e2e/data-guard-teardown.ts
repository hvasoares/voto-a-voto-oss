import { printGuardReport } from './presets'

/** Playwright globalTeardown (#132): `data guard: N tests skipped (no <dir>/<file>)` at the end of a run. */
export default async function dataGuardTeardown(): Promise<void> {
  printGuardReport()
}
