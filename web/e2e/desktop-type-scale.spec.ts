import { test } from '@playwright/test'
import { SCREENS, probe } from './type-scale-probe'

/* The desktop twin of type-scale.spec.ts (#87): the same routes at 1440x900. The desktop sizes map onto the same four steps (no display size). */
for (const screen of SCREENS) {
  test(`desktop type scale: ${screen.name}`, async ({ page }) => {
    await probe(page, screen)
  })
}
