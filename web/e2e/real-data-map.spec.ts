import { expect, test } from '@playwright/test'
import { UF_NOME } from '../src/lib/uf-names'
import { base, mapFrame } from './helpers'
import { DESKTOP, useNoJs, dataGuard } from './presets'

/* Ticket #53 on the REAL build: all 27 states have a page, so every shape of the Home map is a link to it. */
test.skip(...dataGuard())
test.use({ viewport: DESKTOP, isMobile: false, hasTouch: false })

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
  useNoJs()
  test('the map works: a state link opens the state page', async ({ page }) => {
    await page.goto(base)
    // The click goes where the state's label is (inside its shape; the centre of a link's bounding box may lie over a neighbour).
    const box = (await mapFrame(page).locator('a[data-map-uf="mt"] text').boundingBox())!
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    await expect(page).toHaveURL(`${base}mt/`)
  })
})
