import { expect, test, type Page } from '@playwright/test'
import { activateSearch, base } from './helpers'

/*
 * The metrics NOTICE (2026-10-27, g1/Globo-style): measurement is implied by the use of the site — a
 * build with a measurement id installs analytics on every page, the banner only informs and one
 * "Prosseguir" records the acknowledgment (so it does not reappear). With no
 * PUBLIC_GA_MEASUREMENT_ID set (default for this suite) analytics is a strict no-op: the traces below
 * pin that a no-op build never touches Google, and the with-id runs (googletagmanager stubbed with a
 * 204, GA_MEASUREMENT_ID set; measurement arrives even before the banner is answered) verify the
 * notice-only behavior end to end.
 */
const BANNER = '#consent-banner'
const NOTICE_KEY = 'voto-a-voto:notice'
/** The configured id of THIS run: absent in the default suite (analytics must be a no-op), a fake in the with-id runs. */
const GA_ID = (process.env.PUBLIC_GA_MEASUREMENT_ID ?? process.env.GA_MEASUREMENT_ID ?? '').trim()

function watchErrors(page: Page, ignoreBlockedScript = false): string[] {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => {
    if (ignoreBlockedScript && m.type() === 'error' && m.text().startsWith('Failed to load resource')) return
    // The blocked third-party script is browser noise outside the site (an ad blocker's abort); the
    // site's own code raising an exception IS a pageerror and is never ignored.
    if (['error', 'warning'].includes(m.type())) errors.push(m.text())
  })
  return errors
}

/** Waits until a gtag event of the given name is queued in window.dataLayer (or fails after the debounce window). */
async function waitForEvent(page: Page, name: string): Promise<void> {
  await page.waitForFunction((n) => {
    const w = globalThis as { dataLayer?: unknown[][] }
    return ((w.dataLayer ?? []) as unknown[][]).some((c) => c[0] === 'event' && c[1] === n)
  }, name, { timeout: 5_000 })
}

function isGoogle(url: string): boolean {
  return /googletagmanager\.com|google-analytics\.com/.test(url)
}

async function readNotice(page: Page): Promise<string | null> {
  return page.evaluate((key) => localStorage.getItem(key), NOTICE_KEY)
}

const dataLayerCommands = (page: Page) =>
  page.evaluate(() => ((globalThis as { dataLayer?: unknown[][] }).dataLayer ?? []).map((c) => c[0]))

test.describe('notice: the banner on a fresh visit (no id configured — analytics must stay a no-op)', () => {
  test.skip(!!GA_ID, 'the no-op assertions need PUBLIC_GA_MEASUREMENT_ID unset')

  test('the banner is VISIBLE (informational, one 44px+ "Prosseguir"), nothing stored yet', async ({ page }) => {
    await page.goto(base)
    const banner = page.locator(BANNER)
    await expect(banner).toBeVisible()
    await expect(banner.getByRole('button', { name: 'Prosseguir' })).toBeVisible()
    await expect(banner).toContainText('Google Analytics')
    await expect(banner).toContainText('você está ciente')
    expect(await readNotice(page)).toBeNull()
    const box = await banner.locator('[data-consent-continue]').boundingBox()
    expect(box?.height).toBeGreaterThanOrEqual(44)
  })

  test('fresh visit network trace with no id: NOT ONE request to Google, no gtag script tag', async ({ page }) => {
    const requests: string[] = []
    page.on('request', (r) => requests.push(r.url()))
    await page.goto(base)
    await page.waitForLoadState('networkidle')
    expect(requests.filter(isGoogle)).toEqual([])
    expect(await page.evaluate(() => document.querySelectorAll('script[data-vv-ga4]').length)).toBe(0)
  })

  test('Prosseguir: banner hides, the acknowledgment is remembered on reload, still nothing to Google', async ({ page }) => {
    const requests: string[] = []
    page.on('request', (r) => requests.push(r.url()))
    const errors = watchErrors(page)
    await page.goto(base)
    await page.locator('[data-consent-continue]').click()
    await expect(page.locator(BANNER)).toBeHidden()
    expect(await readNotice(page)).toBe('acknowledged')
    await page.reload()
    await expect(page.locator(BANNER)).toBeHidden()
    await page.waitForLoadState('networkidle')
    expect(requests.filter(isGoogle)).toEqual([]) // no measurement id: still nothing to Google
    expect(errors).toEqual([])
  })

  test('no id configured: the site runs fully anyway — pages, search and the open screens', async ({ page }) => {
    const errors = watchErrors(page)
    await page.goto(base)
    const box = await activateSearch(page)
    await box.fill('boa esperanca')
    await page.locator('a[data-position]').first().click()
    await expect(page).toHaveURL(new RegExp(`${base}mt/boa-esperanca-do-norte/$`))
    expect(errors).toEqual([])
  })
})

test.describe('notice: the privacy section', () => {
  test('the footer "Privacidade" link leads to an honest description of the notice-only measurement', async ({ page }) => {
    await page.goto(base)
    await page.getByRole('link', { name: 'Privacidade', exact: true }).click()
    await expect(page).toHaveURL(/sobre-os-dados\/#privacidade/)
    await page.locator('#privacidade').scrollIntoViewIfNeeded()
    const section = page.locator('section[aria-labelledby="privacidade"]')
    await expect(section).toContainText('nada pessoal')
    await expect(section).toContainText('Google Analytics')
    await expect(section).toContainText('você está ciente')
  })
})

test.describe('notice: the site runs fully with the Google origins blocked (ad blocker)', () => {
  test.skip(!!GA_ID, 'the no-op assertions need PUBLIC_GA_MEASUREMENT_ID unset')

  test('hard block (no id): no errors, search and navigation unaffected', async ({ page }) => {
    const errors = watchErrors(page)
    await page.route(/googletagmanager\.com|google-analytics\.com/, (route) => route.abort())
    await page.goto(base)
    const box = await activateSearch(page)
    await box.fill('cidade exemplo')
    await page.locator('a[data-position]').first().click()
    await expect(page).toHaveURL(new RegExp(`${base}rj/cidade-exemplo/$`))
    await expect(page.locator('#main')).toBeVisible()
    expect(errors).toEqual([])
    // The informational banner element stays on every page (Base renders it) and hides after Prosseguir.
    await expect(page.locator(BANNER)).toBeVisible()
    await page.locator('[data-consent-continue]').click()
    await expect(page.locator(BANNER)).toBeHidden()
  })
})

/* ── With a configured (FAKE, stubbed) id: run with `PUBLIC_GA_MEASUREMENT_ID=G-TEST… rtk proxy npx playwright test --project=phone` ── */

test.describe('with a configured, stubbed measurement id the measurement runs ahead of the banner', () => {
  test.skip(!GA_ID, 'needs PUBLIC_GA_MEASUREMENT_ID set (a fake G-TEST id; the Google origin is stubbed below)')

  test('the gtag script is injected on a plain open (stubbed to 204) and the page view is queued — nothing waits for Prosseguir', async ({ page }) => {
    let requested: string | null = null
    page.route(/googletagmanager\.com\/gtag\/js\?id=/, (route) => {
      requested = route.request().url()
      return route.fulfill({ status: 204, body: '' })
    })
    await page.goto(base)
    expect(requested).toContain('gtag/js?id=')
    expect(await page.evaluate(() => document.querySelectorAll('script[data-vv-ga4]').length)).toBe(1)
    // The queue: js + config (send_page_view off) + the boot's explicit page_view for the current page.
    expect(await dataLayerCommands(page)).toEqual(['js', 'config', 'event'])
    // Search emits the documented event through the same queue (debounced 600 ms).
    const box = await activateSearch(page)
    await box.fill('boa esperanca')
    await waitForEvent(page, 'search')
  })

  test('Prosseguir only records the acknowledgment; the page view was already queued and is not resent', async ({ page }) => {
    await page.goto(base)
    expect(await dataLayerCommands(page)).toEqual(['js', 'config', 'event'])
    await page.locator('[data-consent-continue]').click()
    await expect(page.locator(BANNER)).toBeHidden()
    expect(await readNotice(page)).toBe('acknowledged')
    expect(await dataLayerCommands(page)).toEqual(['js', 'config', 'event'])
  })

  test('a second page: the provider is there from the start, report events are not dropped', async ({ page }) => {
    await page.goto(`${base}relatorios/cidades-que-viraram/`)
    const events = await page.evaluate(() => ((globalThis as { dataLayer?: unknown[][] }).dataLayer ?? []).map((c) => String(c[1])))
    expect(events).toContain('page_view')
    expect(events).toContain('report_opened')
  })

  test('the queued properties are the coarse ones only (the typed search text NEVER reaches the queue)', async ({ page }) => {
    await page.goto(base)
    const box = await activateSearch(page)
    await box.fill('texto privadissimo da busca')
    // The island only debounces the emission (600 ms): wait until the search event is queued.
    await waitForEvent(page, 'search')
    const search = await page.evaluate(() => {
      const w = globalThis as { dataLayer?: unknown[][] }
      const queue = (w.dataLayer ?? []) as unknown[][]
      return queue.find((c) => c[0] === 'event' && c[1] === 'search') as unknown[] | undefined
    })
    expect((search![2] as Record<string, unknown>).typed_text).toBeUndefined()
    expect((search![2] as Record<string, unknown>).query_length).toBe('texto privadissimo da busca'.trim().length)
    expect(JSON.stringify(search![2])).not.toContain('privadissimo')
  })

  test('an ad blocker does not break the site: blocked gtag, no errors, search and navigation work', async ({ page }) => {
    const errors = watchErrors(page, true)
    await page.route(/googletagmanager\.com/, (route) => route.abort())
    await page.goto(base)
    await expect(page.locator('#main')).toBeVisible()
    const box = await activateSearch(page)
    await box.fill('cidade exemplo')
    await page.locator('a[data-position]').first().click()
    await expect(page).toHaveURL(new RegExp(`${base}rj/cidade-exemplo/$`))
    expect(errors).toEqual([])
  })
})