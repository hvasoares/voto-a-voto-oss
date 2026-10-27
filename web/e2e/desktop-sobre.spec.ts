import { expect, test } from '@playwright/test'
import { base, collectRequests, expectNoHorizontalScroll, resizeTo, WIDTHS } from './helpers'

/* Ticket #57: Sobre os dados on desktop. */
const url = `${base}sobre-os-dados/`

for (const width of WIDTHS) {
  test(`at ${width} px it does not scroll sideways`, async ({ page }) => {
    await resizeTo(page, width)
    await page.goto(url)
    await expectNoHorizontalScroll(page)
  })
}

test('at 768 and 1440 the content is one centered column of about 720 px', async ({ page }) => {
  for (const width of [768, 1440]) {
    await resizeTo(page, width)
    await page.goto(url)
    const main = (await page.locator('#main').boundingBox())!
    expect(main.width).toBeLessThanOrEqual(760)
    expect(Math.abs(main.x * 2 + main.width - width)).toBeLessThanOrEqual(2)
  }
})

test('the existing sections are all there on desktop', async ({ page }) => {
  await page.goto(url)
  for (const heading of ['De onde vêm os números', 'Como os números do site são calculados', 'Privacidade']) {
    await expect(page.getByRole('heading', { name: new RegExp(heading) })).toBeVisible()
  }
  await expect(page.locator('[data-component="manifest-list"] > li').first()).toBeVisible()
})

test('it still lists exactly what is stored on the visitor\'s device, and states that donations and analytics are separate and that there are no ads', async ({ page }) => {
  await page.goto(url)
  const stored = await page.locator('main').innerText()
  expect(stored).toContain('voto-a-voto:place')
  expect(stored).toContain('voto-a-voto:register')
  expect(stored).toContain('voto-a-voto:notice')
  expect(stored).toMatch(/anúncios/i)
  expect(stored).toMatch(/separad/i)
})

test('a phone does not fetch the desktop module', async ({ page }) => {
  const seen = collectRequests(page)
  await resizeTo(page, 390)
  await page.goto(url)
  await page.waitForLoadState('networkidle')
  expect(seen.filter((r) => /desktop-shell|topbar-search|fragmentos/.test(r.url))).toEqual([])
})
