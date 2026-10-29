import { test } from '@playwright/test'
import { capture } from './capture'
import { base } from './helpers'
import { acknowledgeNotice } from './presets'

/*
 * Gate 2 of ticket #36: the footer with the donation link, at 390 wide, fixture state: a placeholder address
 * configured (PUBLIC_DONATION_URL=https://doacao.example.test/apoie at build time) and the metrics notice acknowledged.
 * Next to the Sketch frame "14 Sobre os dados, with donation footer" (page "Election SPA v3", 390x1123, whose
 * bottom is the section "Apoie o projeto" and the footer): the data page is taller than the frame, so the capture is
 * its last 330 px; the Home footer has no frame of its own and is captured at 390x844 (viewport) scrolled to its end.
 */
test('capture about / donation footer', async ({ page }) => {
  await acknowledgeNotice(page)
  await page.goto(`${base}sobre-os-dados/`)
  const height = await page.evaluate(() => document.documentElement.scrollHeight)
  await capture(page, {
    dir: 'about',
    name: 'donation',
    route: `${base}sobre-os-dados/`,
    fullPage: true,
    omit: ['fullPage'],
    clip: { x: 0, y: height - 330, width: 390, height: 330 },
    extra: { slot: 'about', state: 'donation', clip: { y: height - 330, height: 330 }, reference: 'Sketch: 14 Sobre os dados, with donation footer (bottom 160 px)' },
  })
})

test('capture home / donation footer', async ({ page }) => {
  await acknowledgeNotice(page)
  await page.goto(base)
  await page.waitForFunction(() => document.documentElement.dataset.ready !== undefined)
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  await capture(page, {
    dir: 'home',
    name: 'donation-footer',
    route: base,
    scrollY: 'page',
    extra: { slot: 'home', state: 'donation-footer', reference: 'none (no frame for the footer line)' },
  })
})
