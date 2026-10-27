import { expect, test } from '@playwright/test'
import { base } from './helpers'

/* Ticket #35: the privacy text of the data page lists exactly what the site stores on the device. */
test.describe('data page: the privacy text lists what is stored', () => {
  test('names every key the site writes, says it never leaves the device, and the list matches the control', async ({ page }) => {
    await page.goto(`${base}sobre-os-dados/`)
    const list = page.locator('[data-component="stored-items"]')
    const keys = await list.locator('li').evaluateAll((els) => els.map((e) => e.getAttribute('data-stored-key')))
    expect(keys.sort()).toEqual(['voto-a-voto:notice', 'voto-a-voto:place', 'voto-a-voto:register'])
    await expect(page.locator('section[aria-labelledby="privacidade"]')).toContainText('Nada disso é enviado')
    await expect(page.locator('section[aria-labelledby="privacidade"]')).toContainText('esquecer meus dados')
  })

  test('everything the site writes while it is used is on that list', async ({ page }) => {
    await page.goto(base)
    await page.waitForFunction(() => document.documentElement.dataset.ready !== undefined)
    await page.locator('a[data-uf="rj"]').click()
    await page.goto(`${base}rj/cidade-exemplo/?turno=1`)
    await page.waitForFunction(() => document.documentElement.dataset.ready !== undefined)
    await page.getByRole('button', { name: /Linguagem simples/ }).click()
    await page.goto(base)
    await page.locator('[data-consent-continue]').click()
    const written = await page.evaluate(() => Object.keys(localStorage).sort())
    await page.goto(`${base}sobre-os-dados/`)
    const listed = await page.locator('[data-component="stored-items"] li').evaluateAll((els) => els.map((e) => e.getAttribute('data-stored-key')).sort())
    expect(written).toEqual(listed)
  })
})
