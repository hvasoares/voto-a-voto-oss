import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { UF_NOME } from '../src/lib/uf-names'
import { base, mapFrame } from './helpers'

/* Ticket #53 on the REAL build: all 27 states have a page, so every shape of the Home map is a link to it. */
test.skip(!existsSync(resolve('../data/cities.csv')), 'no ../data')
test.use({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false })

const STATES = Object.keys(UF_NOME).filter((uf) => uf !== 'zz').sort()

test('every one of the 27 shapes of the Home map is a link to its state page, and overseas is not drawn', async ({ page }) => {
  await page.goto(base)
  const frame = mapFrame(page)
  const links = await frame.locator('a[data-map-uf]').evaluateAll((els) => els.map((e) => [e.getAttribute('data-map-uf'), e.getAttribute('href')]))
  expect(links.map(([uf]) => uf).sort()).toEqual(STATES)
  for (const [uf, href] of links) expect(href).toBe(`${base}${uf}/`)
  await expect(frame.locator('[data-map-uf="zz"]')).toHaveCount(0)
  await expect(frame.locator('g[aria-disabled]')).toHaveCount(0)
})

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })
  test('the map works: a state link opens the state page', async ({ page }) => {
    await page.goto(base)
    await mapFrame(page).getByRole('link', { name: /RJ · Rio de Janeiro/ }).click()
    await expect(page).toHaveURL(`${base}rj/`)
  })
})
