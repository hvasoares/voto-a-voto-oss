import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from '@playwright/test'
import { base } from './helpers'
import { DESKTOP, acknowledgeNotice } from './presets'

/*
 * Gate 2 of the G2 city-card lines (#26, #41, #31, #33): the fixture city at 390x844 (phone frames "2 Cartão da cidade,
 * with the ... line", and "2 Cartão da cidade, com curiosidades (card na página)") and at 1440x900 (desktop frame
 * "2 Cartão da cidade (desktop, com as linhas V3)"). Output: web/.captures/city-lines/ (not committed).
 */
const shoot = async (page: import('@playwright/test').Page, route: string, name: string, full = false, scripted = true) => {
  await page.goto(`${base}${route}`)
  await page.evaluate(() => document.fonts.ready)
  if (scripted) await page.waitForFunction(() => document.documentElement.dataset.ready !== undefined)
  await page.evaluate(() => window.scrollTo(0, 0))
  const dir = resolve('.captures', 'city-lines')
  mkdirSync(dir, { recursive: true })
  const file = resolve(dir, `${name}.png`)
  await page.screenshot({ path: file, animations: 'disabled', fullPage: full })
  writeFileSync(resolve(dir, `${name}.json`), JSON.stringify({ route, viewport: page.viewportSize(), scrollY: await page.evaluate(() => window.scrollY), fullPage: full, capture: file }, null, 2) + '\n')
}

test('capture city lines / phone', async ({ page }) => {
  await acknowledgeNotice(page)
  await shoot(page, 'rj/cidade-exemplo/?turno=1', 'phone')
  // The frames are one 844 px screen; the lines sit lower on this longer page, so the rest of it is captured too.
  await shoot(page, 'rj/cidade-exemplo/?turno=1', 'phone-full', true)
})
test('capture city lines / desktop', async ({ page }) => {
  await acknowledgeNotice(page)
  await page.setViewportSize(DESKTOP)
  await shoot(page, 'rj/cidade-exemplo/?turno=1', 'desktop', true)
})
