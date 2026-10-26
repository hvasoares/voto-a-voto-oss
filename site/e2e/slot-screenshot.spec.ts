import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from '@playwright/test'
import { slotMetas, waitReady } from './helpers'

/*
 * Gate 2 of `npm run check-slot -- <slot>`: captures the fixture-state screenshot of the slot at 390x844,
 * scroll 0, next to the Sketch reference. The review itself is done by a fresh-context reviewer
 * following docs/screenshot-review-protocol.md. Output: site/.captures/<slot>/
 */
for (const m of slotMetas) {
  const states = [
    { name: 'default', route: m.fixtureRoute, reference: m.references[0] },
    ...(m.extraFixtures ?? []).map((e) => ({ name: e.name, route: e.route, reference: e.reference })),
  ]
  for (const s of states) {
    test(`capture ${m.id} / ${s.name}`, async ({ page }) => {
      await page.goto(s.route)
      await waitReady(page)
      await page.evaluate(() => document.fonts.ready)
      await page.evaluate(() => window.scrollTo(0, 0))
      const dir = resolve('.captures', m.id)
      mkdirSync(dir, { recursive: true })
      const file = resolve(dir, `${s.name}.png`)
      // The about frame is a long page (390x1123); every other frame is exactly one viewport.
      const referenceIsTall = m.id === 'about'
      await page.screenshot({ path: file, fullPage: referenceIsTall, animations: 'disabled' })
      const viewport = page.viewportSize()
      writeFileSync(
        resolve(dir, `${s.name}.json`),
        JSON.stringify({ slot: m.id, state: s.name, route: s.route, viewport, scrollY: await page.evaluate(() => window.scrollY), fullPage: referenceIsTall, reference: s.reference ? `reference/${s.reference}` : null, capture: file }, null, 2) + '\n',
      )
    })
  }
}
