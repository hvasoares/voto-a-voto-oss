import { clearGuardLog } from './presets'

/** Playwright globalSetup (#132): the data-guard skip counter starts each run empty. */
export default async function dataGuardSetup(): Promise<void> {
  clearGuardLog()
}
