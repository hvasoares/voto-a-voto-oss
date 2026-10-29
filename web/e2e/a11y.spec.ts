import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { base } from './helpers'
import { A11Y_ROUTES as ROUTES } from './routes-inventory'

/*
 * Screen-reader pass of ticket #19, automated: axe's free checks on a sample of routes plus
 * the home. The static (pre-hydration) markup is what axe sees here — the islands render their
 * whole body server-side, so tabs, tiles, table and legend are all present without JavaScript.
 * "Don't chase zero-everything": only the violations the pages can actually fix are kept in scope
 * (the skip list below names each disabled rule and why). The sample lives in e2e/routes-inventory.ts
 * (A11Y_ROUTES, #110): sampled on purpose, and a listed URL that no page answers is a stale entry
 * the route-inventory guard fails on.
 */

test.describe('a11y: axe on the audited routes', () => {
  for (const { route, name } of ROUTES) {
    test(`axe finds no violations on ${name}`, async ({ page }) => {
      await page.goto(route === '/' ? base : `${base}${route}`)
      await page.waitForLoadState('load')
      let builder = new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        // Rules intentionally out of this pass's scope (each with the reason):
        // - target-size: the pages' own tap-target budget (>= 44px) is asserted separately with
        //   real geometry in the other specs; axe's target-size flags the inline text links of the
        //   footer sentences, which stay inline text (24px rule) by design.
        // - nested-interactive/aria-* on pre-hydration astro-island wrappers: the hydration
        //   (client:interaction / client:idle) upgrades them; static wrappers are Astro's own.
        .disableRules(['target-size'])
      if (route === 'mapa/') {
        // Documented allowance (issue #19): the tile labels sit on the Sketch-scale bin colours,
        // where `fgOf` (issue #16) already picks the maximum-contrast ink; the positive-2 bin
        // (#d15c53) tops out at 4.4:1 under both inks — the palette cannot reach AA's 4.5:1.
        // The value is never colour-only there: written on the tile, and read twice as text (the
        // sr-only sentence on the tile and the state table below). Scoped to those anchors only.
        builder = builder.exclude('[data-slot="state-map"] a[data-uf]')
      }
      const { violations } = await builder.analyze()
      const summary = violations.map((v) => `${v.id} [${(v.nodes.length > 3 ? v.nodes.slice(0, 3) : v.nodes).map((n) => n.target.join(' ')).join(', ')}${v.nodes.length > 3 ? ` …+${v.nodes.length - 3}` : ''}]`)
      expect(summary, `${name}: ${violations.length} violation(s)`).toEqual([])
    })
  }
})