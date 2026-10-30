import { expect, test } from '@playwright/test'
import { base } from './helpers'
import { useNoJs } from './presets'
import { shareMock } from './share-mock'

/*
 * The city share sheet as a stub plus a data file (private#210). The sheet itself is pinned by share.spec.ts, guess-card.spec.ts and desktop-card.spec.ts;
 * here the new parts: the stub says when its data arrived (`data-ready`), the picture's PNG is made before any tap (the iOS gesture rule), a missing file
 * shows the failed state with a retry, a visitor without scripts is told the page needs them, and the stub stays noindex.
 */
const path = `${base}rj/cidade-exemplo/compartilhar/`
const DATA = /\/data\/v[0-9a-f]+\/compartilhar\/rj\/cidade-exemplo\.json$/

test.describe('share stub: the city route', () => {
  test('loads its data file once, says ready and draws the sheet', async ({ page }) => {
    const files: string[] = []
    page.on('request', (r) => DATA.test(new URL(r.url()).pathname) && files.push(r.url()))
    await page.goto(path)
    await expect(page.locator('[data-stub-area]')).toHaveAttribute('data-ready', 'yes')
    expect(files).toHaveLength(1)
    await expect(page.locator('[data-share-sheet] [data-share-picture] svg')).toBeVisible()
    await expect(page.locator('[data-stub-area] [data-stub-loading]')).toHaveText('o compartilhamento da cidade pronto.')
  })

  test('the PNG is made before the visitor taps Share, so the share call is made inside the tap', async ({ page }) => {
    await shareMock(page).install('shares')
    await page.goto(path)
    await expect(page.locator('[data-stub-area]')).toHaveAttribute('data-ready', 'yes')
    await expect(page.locator('[data-share-actions]')).toHaveAttribute('data-png', 'ready')
    await page.getByRole('button', { name: 'Compartilhar' }).click()
    const [call] = await shareMock(page).waitForCalls(1)
    expect(call!.active).toBe(true)
    expect(call!.files).toHaveLength(1)
  })

  test('keeps its address and title, and asks not to be indexed', async ({ page }) => {
    await page.goto(path)
    await expect(page).toHaveTitle(/Compartilhar · Cidade Exemplo/)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex')
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/rj\/cidade-exemplo\/compartilhar\/$/)
  })

  test('a missing data file shows the failed state with a retry, and the retry draws the sheet', async ({ page }) => {
    await page.route(DATA, (route) => route.fulfill({ status: 404, body: 'no' }))
    await page.goto(path)
    const area = page.locator('[data-stub-area]')
    await expect(area).toHaveAttribute('data-ready', 'no')
    await expect(area).toHaveAttribute('data-failed', /.*/)
    await expect(page.locator('[data-stub-back]')).toBeVisible()
    await page.unroute(DATA)
    await area.getByRole('button').click()
    await expect(area).toHaveAttribute('data-ready', 'yes')
    await expect(page.locator('[data-share-sheet] [data-share-picture] svg')).toBeVisible()
  })

  test.describe('without JavaScript', () => {
    useNoJs()
    test('says the page needs scripts and keeps the link back to the city', async ({ page }) => {
      await page.goto(path)
      await expect(page.locator('[data-stub-needs-scripts]')).toContainText('JavaScript')
      await expect(page.locator('[data-stub-back]')).toHaveAttribute('href', `${base}rj/cidade-exemplo/`)
    })
  })
})
