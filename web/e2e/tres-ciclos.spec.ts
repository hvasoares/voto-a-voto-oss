import { expect, test } from '@playwright/test'
import { base } from './helpers'

/*
 * /tres-ciclos/:uf/ (screen 13) on the fixture build. The REAL figures of the frame are pinned in
 * e2e/tres-ciclos-real-data.spec.ts and in the unit tests; here the fixture build pins structure:
 * three cycle blocks with change-versus-previous cycles, the color legend, the method note, the
 * chip selector, "Outros estados", and the "sem dados" state of a state that only exists in 2026.
 */
const url = (route: string) => `${base}${route.slice(1)}` // base already ends with a slash

test.describe('tres-ciclos (fixture build)', () => {
  test('sp: h1, intro, three data blocks with change lines and the legend', async ({ page }) => {
    await page.goto(url('/tres-ciclos/sp/'))
    await expect(page.getByRole('heading', { level: 1, name: 'Três ciclos por estado' })).toBeVisible()
    await expect(page.locator('[data-component="intro"]')).toContainText('Presidente 2026 (2º turno) comparado com 2022 e 2018, no mesmo estado.')
    const cycles = page.locator('[data-component="cycles"]')
    for (const ano of ['2018', '2022', '2026']) {
      await expect(cycles.getByRole('heading', { name: `SP · ${ano}` })).toBeVisible()
      const block = cycles.locator(`[data-cycle="${ano}"]`)
      if (ano !== '2018') await expect(block).toContainText(new RegExp(`pp vs ${ano === '2022' ? '2018' : '2022'}`))
    }
    await expect(cycles.getByText('Ponto de partida da série')).toBeVisible()
    // each bar is an image with both rates in its accessible name
    const bar = cycles.locator('[data-cycle="2018"] [role="img"]')
    await expect(bar).toBeVisible()
    await expect(page.locator('[data-component="legend"]')).toContainText('Vermelho = ')
    await expect(page.locator('[data-component="legend"]')).toContainText('Azul = ')
    await expect(page.getByText('As barras mostram só os votos válidos do 2º turno')).toBeVisible()
    // never the outdated Sketch sentence: the data IS collected
    await expect(page.getByText('ainda não coletados')).toHaveCount(0)
  })

  test('sp: chip selector, state link and city-cycles link', async ({ page }) => {
    await page.goto(url('/tres-ciclos/sp/'))
    const chips = page.locator('[data-component="uf-chips"]')
    await expect(chips.locator('[aria-current="page"]')).toHaveText('SP')
    const chipLinks = chips.locator('a')
    const n = await chipLinks.count()
    expect(n).toBeGreaterThan(0)
    for (let i = 0; i < n; i += 1) {
      const t = await chipLinks.nth(i).textContent()
      await expect(chipLinks.nth(i)).toHaveAttribute('href', `${base}tres-ciclos/${t!.toLowerCase()}/`)
    }
    // every chip links to its own page (this one exists: the pages are generated for every state in the dataset)
    await chipLinks.first().click()
    await expect(page).toHaveURL(/tres-ciclos\/[a-z]{2}\/$/)
    await expect(page.getByRole('link', { name: 'Ver o estado ›' })).toHaveAttribute('href', `${base}${spUf(page)}/`)
  })

  function spUf(page: import('@playwright/test').Page) {
    return page.url().match(/tres-ciclos\/([a-z]{2})\//)![1]!
  }

  test('sp: "Outros estados" with three mini bars and links', async ({ page }) => {
    await page.goto(url('/tres-ciclos/sp/'))
    const outros = page.locator('[data-component="outros-estados"] > ul > li')
    const n = await outros.count()
    expect(n).toBeGreaterThan(0)
    for (let i = 0; i < n; i += 1) {
      const li = outros.nth(i)
      // three mini rows (one per cycle, in the frame order); a 2026-only state shows "sem dados" instead of a bar
      for (const ano of ['2018', '2022', '2026']) await expect(li.locator(`[data-mini-bars] [data-cycle="${ano}"]`)).toBeVisible()
      const uf = await li.getAttribute('data-uf')
      await expect(li.getByRole('link', { name: uf!.toUpperCase() })).toHaveAttribute('href', `${base}tres-ciclos/${uf}/`)
    }
  })

  test('mt (2026 only): two "sem dados" cycles, never zeros, then the 2026 block', async ({ page }) => {
    await page.goto(url('/tres-ciclos/mt/'))
    const cycles = page.locator('[data-component="cycles"]')
    await expect(cycles.getByText('sem dados')).toHaveCount(2)
    await expect(cycles.getByRole('heading', { name: 'MT · 2026' })).toBeVisible()
    // no zero anywhere in the cycles section: sem dados is not a 0%
    await expect(cycles).not.toContainText('0,0%')
    await expect(page.getByRole('link', { name: 'Ver o estado ›' })).toHaveAttribute('href', `${base}mt/`)
  })

  test('works with JavaScript off (static HTML)', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } })
    const page = await context.newPage()
    await page.goto(url('/tres-ciclos/mt/'))
    await expect(page.getByRole('heading', { level: 1, name: 'Três ciclos por estado' })).toBeVisible()
    await expect(page.locator('[data-component="cycles"]').getByText('sem dados')).toHaveCount(2)
    await context.close()
  })
})