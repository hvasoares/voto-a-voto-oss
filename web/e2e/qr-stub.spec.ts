import { expect, test } from '@playwright/test'
import { base } from './helpers'
import { useNoJs } from './presets'

/*
 * The city QR page as a stub plus a data file (private#208, the pilot of the lighter-site milestone). The screen itself is pinned by qr.spec.ts
 * (unchanged); here the new parts: the stub says when its data arrived (`data-ready`), a missing file shows the failed state with a retry, a
 * visitor without scripts is told the page needs them, and the stub stays noindex.
 */
const path = `${base}rj/cidade-exemplo/qr/`
const DATA = /\/data\/v[0-9a-f]+\/qr\/rj\/cidade-exemplo\.json$/

test.describe('qr stub: the city route', () => {
  test('loads its data file once, says ready and draws the screen', async ({ page }) => {
    const files: string[] = []
    page.on('request', (r) => DATA.test(new URL(r.url()).pathname) && files.push(r.url()))
    await page.goto(path)
    await expect(page.locator('[data-stub-area]')).toHaveAttribute('data-ready', 'yes')
    expect(files).toHaveLength(1)
    await expect(page.locator('[data-qr] svg')).toBeVisible()
    await expect(page.locator('[data-stub-area] [data-stub-loading]')).toHaveText('o QR da cidade pronto.')
  })

  test('keeps its address and title, and asks not to be indexed', async ({ page }) => {
    await page.goto(path)
    await expect(page).toHaveTitle(/Mostrar QR · Cidade Exemplo/)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex')
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/rj\/cidade-exemplo\/qr\/$/)
  })

  test('a missing data file shows the failed state with a retry, and the retry draws the screen', async ({ page }) => {
    await page.route(DATA, (route) => route.fulfill({ status: 404, body: 'no' }))
    await page.goto(path)
    const area = page.locator('[data-stub-area]')
    await expect(area).toHaveAttribute('data-ready', 'no')
    await expect(area).toHaveAttribute('data-failed', /.*/)
    await expect(page.locator('[data-stub-back]')).toBeVisible()
    await page.unroute(DATA)
    await area.getByRole('button').click()
    await expect(area).toHaveAttribute('data-ready', 'yes')
    await expect(page.locator('[data-qr] svg')).toBeVisible()
  })

  test.describe('without JavaScript', () => {
    useNoJs()
    test('says the page needs scripts and keeps the link back', async ({ page }) => {
      await page.goto(path)
      await expect(page.locator('[data-stub-needs-scripts]')).toContainText('JavaScript')
      await expect(page.locator('[data-stub-back]')).toHaveAttribute('href', `${base}rj/cidade-exemplo/compartilhar/`)
    })
  })
})
