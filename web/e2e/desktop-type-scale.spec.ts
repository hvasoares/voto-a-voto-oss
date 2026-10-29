import { test } from '@playwright/test'
import { maybeThrottleCpu } from './helpers'
import { SCREENS, probe } from './type-scale-probe'

// #123 flake-hunt repeats: E2E_CPU_RATE slows the CPU of every page in this file.
test.beforeEach(async ({ page }) => maybeThrottleCpu(page))

/* The desktop twin of type-scale.spec.ts (#87): the same routes at 1440x900. The desktop sizes map onto the same four steps (no display size). */
for (const screen of SCREENS) {
  test(`desktop type scale: ${screen.name}`, async ({ page }) => {
    await probe(page, screen)
  })
}
