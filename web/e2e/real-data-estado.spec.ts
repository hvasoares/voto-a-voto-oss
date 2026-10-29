import { expect, test, type Page } from '@playwright/test'
import { base, waitReady } from './helpers'
import { dataGuard } from './presets'

/*
 * The state page on the REAL dataset (#83; run with `npm run test:real`): the largest states have hundreds of rows (SP 645, MG 853), so
 * the ONE list, the search above it and the tap on a row are checked where it hurts: the order, the count, the filter against an
 * independent oracle, how long one keystroke takes, a tap in a real state, and typing before the island hydrates.
 */
test.skip(...dataGuard())

const STATES = [
  { uf: 'sp', count: 645, capital: 'São Paulo', slug: 'sao-paulo' },
  { uf: 'mg', count: 853, capital: 'Belo Horizonte', slug: 'belo-horizonte' },
]
const rows = (page: Page) => page.locator('[data-map-area] nav a[data-cd]')
const box = (page: Page) => page.locator('[data-state-search]')
const input = (page: Page) => page.getByRole('searchbox')
const fold = (s: string) => s.normalize('NFD').replace(/\p{M}+/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

for (const { uf, count, capital, slug } of STATES) {
  test.describe(`estado ${uf} (${count} municipalities)`, () => {
    test('the search is above ONE list with every municipality, each row coloured with its figures and a link to its card', async ({ page }) => {
      await page.goto(`${base}${uf}/`)
      await waitReady(page)
      await expect(rows(page)).toHaveCount(count)
      await expect(page.getByRole('navigation', { name: 'Municípios' })).toHaveCount(1)
      const [field, first] = await Promise.all([input(page).boundingBox(), rows(page).first().boundingBox()])
      expect(field!.y + field!.height).toBeLessThanOrEqual(first!.y)
      const row = rows(page).first()
      await expect(row).toContainText(capital)
      await expect(row).toContainText(/[+-]\d+,\d pp/)
      await expect(row).toHaveAttribute('href', `${base}${uf}/${slug}/`)
    })

    test('a tap on a row opens its City card (the D1 bug, in a real state)', async ({ page }) => {
      await page.goto(`${base}${uf}/`)
      await waitReady(page)
      await rows(page).first().tap()
      await expect(page).toHaveURL(`${base}${uf}/${slug}/`)
      await expect(page.getByRole('heading', { level: 1 })).toContainText(capital)
    })

    test('the filter agrees with an independent count, ignores accents and capitals, and one keystroke is instant', async ({ page }) => {
      await page.goto(`${base}${uf}/`)
      await waitReady(page)
      const names = await rows(page).evaluateAll((els) => els.map((e) => e.querySelectorAll('span')[1]!.textContent!))
      for (const text of ['SAO', 'santa', 'Águas', 'zzzz']) {
        const want = names.filter((n) => fold(n).includes(fold(text))).length
        await input(page).fill(text)
        await expect(box(page)).toHaveAttribute('data-filtered', want === 0 ? 'none' : String(want))
        await expect(page.locator('[data-map-area] nav a[data-cd]:visible')).toHaveCount(want)
      }
      // The cost of one keystroke on the page: input event to the drawn filter, synchronously (hidden toggles, no re-render).
      const ms = await page.evaluate(() => {
        const el = document.querySelector<HTMLInputElement>('[data-state-search] input')!
        const t0 = performance.now()
        el.value = 'santa'
        el.dispatchEvent(new Event('input', { bubbles: true }))
        const dom = performance.now() - t0
        void document.body.offsetHeight // force the layout the filter caused
        return { dom, layout: performance.now() - t0 }
      })
      console.log(`estado ${uf}: one keystroke ${ms.dom.toFixed(1)} ms to the filter, ${ms.layout.toFixed(1)} ms with layout (${count} rows)`)
      expect(ms.layout).toBeLessThan(200)
      await input(page).fill('')
      await expect(box(page)).toHaveAttribute('data-filtered', 'off')
      await expect(page.locator('[data-map-area] nav a[data-cd]:visible')).toHaveCount(count)
    })

    test('typing before the island hydrates keeps text and filter through hydration', async ({ page }) => {
      let release!: () => void
      const gate = new Promise<void>((r) => (release = r))
      await page.route(/\/_astro\/CityMapMap\..*\.js/, async (route) => {
        await gate
        await route.continue()
      })
      await page.goto(`${base}${uf}/`, { waitUntil: 'domcontentloaded' })
      await waitReady(page)
      await input(page).fill('santa')
      const filtered = await box(page).getAttribute('data-filtered')
      expect(Number(filtered)).toBeGreaterThan(0)
      await page.locator('[data-slot="mapa-escala"]').first().tap()
      release()
      await page.waitForFunction(() => !document.querySelector('astro-island')?.hasAttribute('ssr'))
      await expect(input(page)).toHaveValue('santa')
      await expect(page.locator('[data-map-area] nav a[data-cd]:visible')).toHaveCount(Number(filtered))
    })
  })
}
