import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { base } from './helpers'
import { PHONE, DESKTOP, viewport } from './presets'

/*
 * Screenshot captures for ticket #64 (Baixar os dados desta página): /brasil/ in its fixture state at 390x844 (the link
 * must not show) and at 1440x900 and full page (the footer link of the Sketch frame "8 Brasil e regiões (desktop, com
 * Baixar os dados desta página)"). Output: web/.captures/page-data/ (git-ignored), reviewed per docs/screenshot-review-protocol.md.
 */
const sizes = [
  { name: 'phone-390x844', ...PHONE, fullPage: false },
  { name: 'desktop-1440x900', ...DESKTOP, fullPage: false },
  { name: 'desktop-1440-full', ...DESKTOP, fullPage: true },
]

for (const size of sizes) {
  test(`capture /brasil/ ${size.name}`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ viewport: viewport(size.width, size.height), baseURL })
    const page = await context.newPage()
    await page.goto(`${base}brasil/`)
    await page.getByRole('button', { name: 'Prosseguir' }).click() // the metrics notice covers the footer on a first visit
    await page.evaluate(() => document.fonts.ready)
    const dir = resolve('.captures', 'page-data')
    mkdirSync(dir, { recursive: true })
    const file = resolve(dir, `${size.name}.png`)
    await page.screenshot({ path: file, animations: 'disabled', fullPage: size.fullPage })
    writeFileSync(resolve(dir, `${size.name}.json`), JSON.stringify({ route: `${base}brasil/`, viewport: viewport(size.width, size.height), scrollY: 0, fullPage: size.fullPage }, null, 2) + '\n')
    const link = page.locator('[data-page-data-download]')
    if (size.width >= 1024) await expect(link).toBeVisible()
    else await expect(link).toBeHidden()
    await context.close()
  })
}
