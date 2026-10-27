import { expect, test, type Page } from '@playwright/test'
import { base } from './helpers'

/*
 * Ticket #40: the optional "Usar minha localização" button on Home. Fixture dataset: rj cities with centres around
 * (-22.9, -43.2), sp near São Paulo (-23.5, -46.6); the mt city has no centre (like Boa Esperança do Norte).
 * Playwright's geolocation permission stands for the visitor's answer to the browser prompt.
 */
const button = (page: Page) => page.getByRole('button', { name: 'Usar minha localização' })

test.describe('with the permission granted', () => {
  test.use({ permissions: ['geolocation'] })

  test('a position in rj opens the nearest rj city', async ({ page, context }) => {
    await context.setGeolocation({ latitude: -22.9, longitude: -43.2 })
    await page.goto(base)
    await button(page).click()
    await expect(page).toHaveURL(`${base}rj/cidade-exemplo/`)
  })

  test('a position in sp opens the sp city', async ({ page, context }) => {
    await context.setGeolocation({ latitude: -23.55, longitude: -46.63 })
    await page.goto(base)
    await button(page).click()
    await expect(page).toHaveURL(`${base}sp/cidade-exemplo-paulista/`)
  })

  test('a position outside Brazil gets a clear message and stays on Home', async ({ page, context }) => {
    await context.setGeolocation({ latitude: 38.72, longitude: -9.14 })
    await page.goto(base)
    await button(page).click()
    await expect(page.locator('[data-locate-status]')).toHaveText(/fora do Brasil/)
    await expect(page).toHaveURL(base)
    await expect(button(page)).toBeEnabled()
  })

  test('the position is never stored, not even when it opened a city, and nothing is sent', async ({ page, context }) => {
    const sent: string[] = []
    page.on('request', (r) => r.method() !== 'GET' && sent.push(r.url()))
    await context.setGeolocation({ latitude: -22.9, longitude: -43.2 })
    await page.goto(base)
    await button(page).click()
    await expect(page).toHaveURL(`${base}rj/cidade-exemplo/`)
    expect(await page.evaluate(() => JSON.stringify(Object.entries(localStorage)) + JSON.stringify(Object.entries(sessionStorage)))).toBe('[][]')
    await page.goto(base)
    await expect(page.locator('[data-place-shortcut]')).toBeHidden()
    expect(sent).toEqual([])
  })
})

test.describe('permission and first load', () => {
  test('nothing is asked and nothing is fetched until the tap', async ({ page }) => {
    const asked: string[] = []
    await page.addInitScript(() => {
      const original = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation)
      ;(window as unknown as { __asked: number }).__asked = 0
      navigator.geolocation.getCurrentPosition = (...args) => {
        ;(window as unknown as { __asked: number }).__asked++
        return original(...args)
      }
    })
    page.on('request', (r) => asked.push(new URL(r.url()).pathname))
    await page.goto(base)
    await page.waitForLoadState('networkidle')
    await expect(button(page)).toBeVisible()
    expect(await page.evaluate(() => (window as unknown as { __asked: number }).__asked)).toBe(0)
    expect(asked.filter((p) => p.endsWith('centroids.json') || p.includes('locate'))).toEqual([])
  })

  test('a denied permission shows a clear message, keeps the page usable and the button available', async ({ page }) => {
    await page.goto(base)
    await button(page).click()
    await expect(page.locator('[data-locate-status]')).toHaveText(/Sem permissão/)
    await expect(page).toHaveURL(base)
    await expect(button(page)).toBeEnabled()
    await expect(page.locator('a[data-uf="rj"]')).toBeVisible()
  })

  test('the button is a 44 px tap target with the note under it', async ({ page }) => {
    await page.goto(base)
    const box = (await button(page).boundingBox())!
    expect(box.height).toBeGreaterThanOrEqual(44)
    await expect(page.getByText('Só pedimos depois do toque. Nada é guardado.')).toBeVisible()
  })
})

test.describe('without a position API or without JavaScript', () => {
  test('no position API: the button is not offered', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true })
    })
    await page.goto(base)
    await page.waitForFunction(() => document.documentElement.dataset.ready !== undefined)
    await expect(page.locator('[data-locate]')).toBeHidden()
  })

  test.describe('no scripts', () => {
    test.use({ javaScriptEnabled: false })
    test('the button is not shown', async ({ page }) => {
      await page.goto(base)
      await expect(page.locator('[data-locate]')).toBeHidden()
    })
  })
})

test('the data page says when the position is asked and that it is neither sent nor kept', async ({ page }) => {
  await page.goto(`${base}sobre-os-dados/`)
  const section = page.locator('section[aria-labelledby="privacidade"]')
  await expect(section).toContainText('só pede a posição ao navegador depois do seu toque')
  await expect(section).toContainText('não é enviada nem guardada')
  await expect(page.locator('[data-source]').filter({ hasText: 'servicodados.ibge.gov.br' })).toContainText('27 arquivos')
})
