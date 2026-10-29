import { test } from '@playwright/test'
import { capture } from './capture'
import { base } from './helpers'
import { SOBRE_FRAME } from './presets'

/*
 * Screenshot source for the review of /sobre-os-dados/ (ticket #18): 390x844 fullPage (the Sketch
 * frame is tall: 390x1123 of content) and 1280 wide. Output: web/.captures/about/ (not committed,
 * no baselines); review follows web/docs/screenshot-review-protocol.md.
 */
test('capture about / phone full page', async ({ page }) => {
  await page.goto(base + 'sobre-os-dados/')
  await page.evaluate(() => window.scrollTo(0, 0))
  await capture(page, {
    dir: 'about',
    name: 'phone-full',
    route: base + 'sobre-os-dados/',
    scrollY: 'page',
    fullPage: true,
    extra: { slot: 'about', state: 'default', reference: 'web/reference/14-sobre-os-dados.png' },
  })
})

test('capture about / desktop', async ({ page }) => {
  await page.setViewportSize(SOBRE_FRAME)
  await page.goto(base + 'sobre-os-dados/')
  await page.evaluate(() => window.scrollTo(0, 0))
  await capture(page, {
    dir: 'about',
    name: 'desktop-full',
    route: base + 'sobre-os-dados/',
    viewport: SOBRE_FRAME,
    scrollY: 'page',
    fullPage: true,
    extra: { slot: 'about', state: 'desktop', reference: 'web/reference/14-sobre-os-dados.png' },
  })
})
