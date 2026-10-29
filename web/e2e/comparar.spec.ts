import { expect, test } from '@playwright/test'
import { allowedOrigins, base, collectRequests, violations } from './helpers'
import { PHONE, noJs } from './presets'

/*
 * /comparar/2022/ and /comparar/2018/ on the fixture build (screens 11 and 11b).
 * The REAL numbers of the frames are pinned in e2e/comparar-real-data.spec.ts and in the unit
 * tests; here the fixture build pins only structure and framing: tabs cross-link, six-row cap,
 * both candidates per state with pct + compared cycle pct + signed vote volume, footer, and the
 * page works with JavaScript off (it is static HTML, there is no island).
 */
const ciclo = (route: string) => (route.endsWith('2018/') ? '2018' : '2022')
// `base` already ends with a slash ("/"): the routes below must not add a second one.
const url = (route: string) => `${base}${route.slice(1)}`

test.describe('compare pages (fixture build)', () => {
  for (const route of ['/comparar/2018/', '/comparar/2022/']) {
    test(`frames "${route}": title, intro with the compared year and six-row cap`, async ({ page }) => {
      await page.goto(url(route))
      const c = ciclo(route)
      await expect(page.getByRole('heading', { level: 1, name: `Comparar com ${c}` })).toBeVisible()
      const intro = page.locator('[data-component="intro"]')
      await expect(intro).toContainText(`comparada com a de ${c} (2º turno), nos mesmos municípios.`)
      await expect(intro).toContainText(`votos = 2026 menos ${c}.`)
      await expect(intro).toContainText('Os 6 estados com mais votos válidos.')
      if (c === '2018') {
        await expect(intro).toContainText('Candidatos de 2018: Fernando Haddad (13) e Jair Bolsonaro (17).')
      } else {
        await expect(intro).not.toContainText('Candidatos de 2018')
      }
      // the fixture build has only 2 comparable states; the build never shows more than the frame's 6
      const n = await page.locator('[data-component="compare-rows"] > li').count()
      expect(n, `${route} nunca passa de 6 linhas`).toBeLessThanOrEqual(6)
      expect(n, `${route} tem as linhas do próprio dataset`).toBeGreaterThanOrEqual(1)
    })

    test(`frames "${route}": tabs cross-link the two cycles`, async ({ page }) => {
      await page.goto(url(route))
      const c = ciclo(route)
      const current = page.locator('[data-tab][aria-current="page"]')
      await expect(current).toHaveText(c)
      const link = page.locator('[data-component="cycle-tabs"] a[data-tab]')
      const other = c === '2018' ? '2022' : '2018'
      await expect(link).toHaveText(other)
      await expect(link).toHaveAttribute('href', `${base}comparar/${other}/`)
      await link.click()
      await expect(page).toHaveURL(`${base}comparar/${other}/`)
      await expect(page.getByRole('heading', { level: 1, name: `Comparar com ${other}` })).toBeVisible()
    })

    test(`frames "${route}": each state row shows both candidates with rate, cycle rate and signed vote volume`, async ({ page }) => {
      await page.goto(url(route))
      const c = ciclo(route)
      const rowsList = page.locator('[data-component="compare-rows"] > li')
      const count = await rowsList.count()
      expect(count).toBeGreaterThan(0)
      const ufs: string[] = []
      for (let i = 0; i < count; i += 1) {
        const row = rowsList.nth(i)
        const uf = await row.getAttribute('data-uf')
        if (!uf) throw new Error(`row without data-uf at ${route} index ${i}`)
        ufs.push(uf)
        await expect(row.getByText(/votos válidos/)).toBeVisible()
        const sides = row.locator('[data-side]')
        await expect(sides).toHaveCount(2)
        for (const side of [sides.nth(0), sides.nth(1)]) {
          const text = (await side.textContent()) ?? ''
          expect(text.trim(), `${route} linha ${i}`).toMatch(/^[A-Za-z]+ \d+,\d% · \d{4}: \d+,\d% · [+-][\d.]+ votos( \(\d+ em 2026; \d+ em \d{4}\))?$/)
        }
      }
      expect(new Set(ufs).size).toBe(ufs.length)
      // the footer names the source and points at the data page
      const footer = page.locator('[data-component="source-footer"]')
      await expect(footer).toContainText('Fonte: TSE, dados finais')
      await expect(footer.getByText('Sobre os dados ›')).toHaveAttribute('href', `${base}sobre-os-dados/`)
    })

    test(`frames "${route}": works with JavaScript off (static HTML, no island needed)`, async ({ browser }) => {
      const context = await browser.newContext({ ...noJs(), viewport: PHONE })
      const page = await context.newPage()
      await page.goto(url(route))
      await expect(page.locator('[data-component="compare-rows"] > li').first()).toBeVisible()
      const c = ciclo(route)
      await expect(page.getByRole('heading', { level: 1, name: `Comparar com ${c}` })).toBeVisible()
      await context.close()
    })

    test(`frames "${route}": the page makes no request beyond its own origin`, async ({ page, baseURL }) => {
      const seen = collectRequests(page)
      await page.goto(url(route))
      await page.waitForLoadState('networkidle')
      expect(violations(seen, await allowedOrigins(new URL(baseURL!).origin))).toEqual([])
    })
  }

  test('the UF of the first row links to the state route (path only: state pages are #50)', async ({ page }) => {
    await page.goto(url(`/comparar/2022/`))
    const first = page.locator('[data-component="compare-rows"] > li').first()
    const uf = await first.getAttribute('data-uf')
    await expect(first.getByRole('link', { name: uf!.toUpperCase() })).toHaveAttribute('href', new RegExp(`^${base}${uf}/$`))
  })
})