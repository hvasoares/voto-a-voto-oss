import { expect, test } from '@playwright/test'
import { base, expectNoHorizontalScroll, resizeTo, WIDTHS } from './helpers'

/* Meu Brasil on desktop (frame "16 Meu Brasil (desktop)", ticket #27): the headline over the fields, one column per place, the share button centred. */
const THREE = `${base}meu-brasil/?mora=rj/cidade-exemplo&vota=sp/cidade-exemplo-paulista&nasceu=mt/boa-esperanca-do-norte`

test('at 1440 the places are three columns and the picture is only for sharing', async ({ page }) => {
  await page.goto(THREE)
  await page.waitForSelector('[data-meu-brasil][data-ready="yes"]')
  await expect(page.locator('[data-headline]')).toContainText('a parcela do eleitorado que não votou foi de')
  const cols = await page.locator('[data-place-column]').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().x)))
  expect(cols).toHaveLength(3)
  expect(new Set(cols).size).toBe(3)
  await expect(page.locator('[data-card-picture]')).toBeHidden()
  await expect(page.getByRole('button', { name: 'Compartilhar o cartão' }).or(page.getByRole('button', { name: 'Copiar link' }))).toBeVisible()
  await expectNoHorizontalScroll(page)
})

for (const width of WIDTHS)
  test(`no sideways scroll at ${width}`, async ({ page }) => {
    await resizeTo(page, width)
    await page.goto(THREE)
    await page.waitForSelector('[data-meu-brasil][data-ready="yes"]')
    await expectNoHorizontalScroll(page)
  })
