import { expect, test, type Page } from '@playwright/test'
import { activateSearch, base } from './helpers'

/*
 * Ticket #20 — GA4 behind an LGPD consent banner. Build config decides the measurement ID:
 * with no PUBLIC_GA_MEASUREMENT_ID set (default for this suite) analytics is a strict no-op, and the
 * network traces below pin the consent-first guarantee: NO request ever leaves the site for Google
 * before "Aceitar" — not even the script tag. The granted-with-id runs (googletagmanager.com stubbed
 * with a 204) are skipped unless the suite is launched with GA_MEASUREMENT_ID set.
 */
const BANNER = '#consent-banner'
const CONSENT_KEY = 'voto-a-voto:consent'
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

async function readConsent(page: Page): Promise<string | null> {
  return page.evaluate((key) => localStorage.getItem(key), CONSENT_KEY)
}

test.describe('consent: the banner on a fresh visit (no id configured — analytics must stay a no-op)', () => {
  test.skip(!!GA_ID, 'the no-op assertions need PUBLIC_GA_MEASUREMENT_ID unset')

  test('the banner is VISIBLE (region with title and 44px+ answers), nothing stored yet', async ({ page }) => {
    await page.goto(base)
    const banner = page.locator(BANNER)
    await expect(banner).toBeVisible()
    await expect(banner.getByRole('button', { name: 'Aceitar' })).toBeVisible()
    await expect(banner.getByRole('button', { name: 'Recusar' })).toBeVisible()
    await expect(banner).toContainText('Google Analytics')
    expect(await readConsent(page)).toBeNull()
    for (const btn of ['[data-consent-accept]', '[data-consent-refuse]']) {
      const box = await banner.locator(btn).boundingBox()
      expect(box?.height).toBeGreaterThanOrEqual(44)
    }
  })

  test('fresh visit network trace: NOT ONE request to Google before the consent', async ({ page }) => {
    const requests: string[] = []
    page.on('request', (r) => requests.push(r.url()))
    await page.goto(base)
    await page.waitForLoadState('networkidle')
    expect(requests.filter(isGoogle)).toEqual([])
    expect(await page.evaluate(() => document.querySelectorAll('script[data-vv-ga4]').length)).toBe(0)
  })

  test('Recusar: no request to Google, banner hides, refusal remembered on reload', async ({ page }) => {
    const requests: string[] = []
    page.on('request', (r) => requests.push(r.url()))
    const errors = watchErrors(page)
    await page.goto(base)
    await page.locator('[data-consent-refuse]').click()
    await expect(page.locator(BANNER)).toBeHidden()
    expect(await readConsent(page)).toBe('refused')
    await page.reload()
    await expect(page.locator(BANNER)).toBeHidden()
    await page.waitForLoadState('networkidle')
    expect(requests.filter(isGoogle)).toEqual([])
    expect(await page.evaluate(() => document.querySelectorAll('script[data-vv-ga4]').length)).toBe(0)
    expect(errors).toEqual([])
  })

  test('Aceitar with no id configured: site works fully, pages and search run, still nothing to Google', async ({ page }) => {
    const requests: string[] = []
    page.on('request', (r) => requests.push(r.url()))
    const errors = watchErrors(page)
    await page.goto(base)
    await page.locator('[data-consent-accept]').click()
    await expect(page.locator(BANNER)).toBeHidden()
    expect(await readConsent(page)).toBe('granted')
    await page.waitForLoadState('networkidle')
    expect(requests.filter(isGoogle)).toEqual([]) // no measurement id: even granted nothing goes to Google

    // The screens keep working after the choice: search finds the city and opens it.
    const box = await activateSearch(page)
    await box.fill('boa esperanca')
    await page.locator('a[data-position]').first().click()
    await expect(page).toHaveURL(new RegExp(`${base}mt/boa-esperanca-do-norte/$`))
    expect(errors).toEqual([])
  })
})

test.describe('consent: the change affordance — footer "Privacidade" link and the privacy section button', () => {
  test('the banner hides after a choice; the footer link leads to the change affordance; changing works', async ({ page }) => {
    await page.goto(base)
    await page.locator('[data-consent-accept]').click()
    await expect(page.locator(BANNER)).toBeHidden() // banner hides once a choice exists

    await page.getByRole('link', { name: 'Privacidade', exact: true }).click()
    await expect(page).toHaveURL(/sobre-os-dados\/#privacidade/)
    await page.locator('#privacidade').scrollIntoViewIfNeeded()
    await expect(page.locator('#privacidade')).toBeInViewport()

    await page.locator('[data-consent-change]').click()
    await expect(page.locator(BANNER)).toBeVisible()
    await expect(page.locator('[data-consent-status]')).toContainText('aceitado')

    await page.locator('[data-consent-refuse]').click()
    await expect(page.locator(BANNER)).toBeHidden()
    expect(await readConsent(page)).toBe('refused')
    await page.reload()
    await expect(page.locator(BANNER)).toBeHidden() // the new choice is the remembered one
    expect(await readConsent(page)).toBe('refused')
  })
})

test.describe('consent: the site runs fully with the Google origins blocked (ad blocker)', () => {
  test('grant + hard block: no errors, search and navigation unaffected', async ({ page }) => {
    // Only with an id configured is the gtag script actually loaded (and here blocked): the browser
    // logs the blocked resource — browser noise, not a site error; the pageerror check is strict.
    const errors = watchErrors(page, !!GA_ID)
    await page.route(/googletagmanager\.com|google-analytics\.com/, (route) => route.abort())
    await page.goto(base)
    await page.locator('[data-consent-accept]').click()
    const box = await activateSearch(page)
    await box.fill('cidade exemplo')
    await page.locator('a[data-position]').first().click()
    await expect(page).toHaveURL(new RegExp(`${base}rj/cidade-exemplo/$`))
    await expect(page.locator('#main')).toBeVisible()
    expect(errors).toEqual([])
  })

  test('refuse + hard block: every screen still works, no banner after the refusal', async ({ page }) => {
    const errors = watchErrors(page)
    await page.route(/googletagmanager\.com|google-analytics\.com/, (route) => route.abort())
    await page.goto(base)
    await page.locator('[data-consent-refuse]').click()
    for (const path of ['rj/', 'rj/cidade-exemplo/', 'compartilhar/', 'sobre-os-dados/', 'mapa/rj/']) {
      await page.goto(base + path)
      await expect(page.locator('[data-consent-banner]')).toBeHidden() // the refusal is remembered page-wide
    }
    expect(errors).toEqual([])
    expect(await readConsent(page)).toBe('refused')
    await expect(page.locator(BANNER)).toBeHidden()
  })
})

/* ── Granted with a configured (FAKE, stubbed) id: run with `PUBLIC_GA_MEASUREMENT_ID=G-TEST… rtk proxy npx playwright test --project=phone` ── */

test.describe('consent granted with a configured, stubbed measurement id', () => {
  test.skip(!GA_ID, 'needs PUBLIC_GA_MEASUREMENT_ID set (a fake G-TEST id; the Google origin is stubbed below)')

  test('Aceitar injects the gtag script once (stubbed to 204) and the grant page view is queued', async ({ page }) => {
    let requested: string | null = null
    page.route(/googletagmanager\.com\/gtag\/js\?id=/, (route) => {
      requested = route.request().url()
      return route.fulfill({ status: 204, body: '' })
    })
    await page.goto(base)
    await expect(page.locator(BANNER)).toBeVisible()
    await page.locator('[data-consent-accept]').click()
    expect(requested).toContain('gtag/js?id=')
    expect(await page.evaluate(() => document.querySelectorAll('script[data-vv-ga4]').length)).toBe(1)
    // The queue: js + config (send_page_view off) + the boot's explicit page_view for the current page.
    const cmds = await page.evaluate(() => ((globalThis as { dataLayer?: unknown[][] }).dataLayer ?? []).map((c) => c[0]))
    expect(cmds).toEqual(['js', 'config', 'event'])
    // Search after the grant emits the documented event through the same queue (debounced 600 ms).
    const box = await activateSearch(page)
    await box.fill('boa esperanca')
    await waitForEvent(page, 'search')
  })

  test('a remembered grant: the boot script installs analytics BEFORE the page scripts emit (nothing dropped)', async ({ page }) => {
    await page.goto(base)
    await page.locator('[data-consent-accept]').click()
    // A report page emits report_opened from its own script — with the remembered grant nothing is lost.
    await page.goto(`${base}relatorios/cidades-que-viraram/`)
    const events = await page.evaluate(() => ((globalThis as { dataLayer?: unknown[][] }).dataLayer ?? []).map((c) => String(c[1])))
    expect(events).toContain('page_view')
    expect(events).toContain('report_opened')
  })

  test('refused with an id: still no script tag, no request to Google', async ({ page }) => {
    const googleRequests: string[] = []
    page.on('request', (r) => {
      if (isGoogle(r.url())) googleRequests.push(r.url())
    })
    await page.goto(base)
    await page.locator('[data-consent-refuse]').click()
    await page.reload()
    await page.waitForLoadState('networkidle')
    expect(googleRequests).toEqual([])
    expect(await page.evaluate(() => document.querySelectorAll('script[data-vv-ga4]').length)).toBe(0)
  })

  test('the queued properties are the coarse ones only (the typed search text NEVER reaches the queue)', async ({ page }) => {
    await page.goto(base)
    await page.locator('[data-consent-accept]').click()
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

  test('an ad blocker does not break the granted site either the same way', async ({ page }) => {
    const errors = watchErrors(page, true)
    await page.route(/googletagmanager\.com/, (route) => route.abort())
    await page.goto(base)
    await page.locator('[data-consent-accept]').click()
    await expect(page.locator('#main')).toBeVisible()
    const box = await activateSearch(page)
    await box.fill('cidade exemplo')
    await page.locator('a[data-position]').first().click()
    await expect(page).toHaveURL(new RegExp(`${base}rj/cidade-exemplo/$`))
    expect(errors).toEqual([])
  })
})