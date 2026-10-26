import { expect, test } from '@playwright/test'
import { slotMetas, waitReady } from './helpers'

/*
 * Regression baselines (Playwright toHaveScreenshot). A baseline exists ONLY after a human or reviewer
 * approved a checkpoint and ran `npm run approve-baseline -- <slot>` (see docs/screenshot-review-protocol.md).
 * Without an approved baseline the test is skipped; nothing is auto-approved.
 * Baselines live in e2e/baselines/<platform>/ and are only valid on the platform they were made on.
 */
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

for (const m of slotMetas) {
  const states = [{ name: 'default', route: m.fixtureRoute }, ...(m.extraFixtures ?? []).map((e) => ({ name: e.name, route: e.route }))]
  for (const s of states) {
    const file = `${m.id}-${s.name}.png`
    const approved = existsSync(resolve('e2e/baselines', process.platform, file))
    test(`baseline ${m.id} / ${s.name}`, async ({ page }) => {
      test.skip(!approved && !process.env.UPDATE_BASELINE, 'no approved baseline yet')
      await page.goto(s.route)
      await waitReady(page)
      await page.evaluate(() => document.fonts.ready)
      await expect(page).toHaveScreenshot(file, { fullPage: m.id === 'about' })
    })
  }
}
