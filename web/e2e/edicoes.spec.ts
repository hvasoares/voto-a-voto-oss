import { expect, test } from '@playwright/test'
import { base, collectRequests } from './helpers'

/*
 * Editions (ticket #59). The fixture build has two editions: 2026-10-20 (older) and 2026-10-26, the dataset being
 * built, so the pages show the second. Every address honours SITE_BASE.
 */
test.describe('editions', () => {
  test('every page footer names the edition it shows and links to its address', async ({ page }) => {
    for (const path of ['', 'sobre-os-dados/', 'brasil/', 'rj/', 'rj/cidade-exemplo/', 'edicoes/']) {
      await page.goto(base + path)
      const link = page.locator('[data-component="consent-footer"] [data-edition-link]')
      await expect(link, path).toHaveText('Edição 26/10/2026')
      await expect(link, path).toHaveAttribute('href', base + 'edicoes/2026-10-26/')
    }
  })

  test('the linked edition page opens, describes itself and says how to cite it', async ({ page }) => {
    await page.goto(base + 'rj/cidade-exemplo/')
    await page.locator('[data-edition-link]').click()
    await expect(page).toHaveURL(base + 'edicoes/2026-10-26/')
    await expect(page.locator('h1')).toHaveText('Edição de 26/10/2026')
    await expect(page.locator('[data-edition-id]')).toHaveText('2026-10-26')
    await expect(page.locator('[data-component="edition-counts"]')).toContainText('8 municípios e 1 postos de votação no exterior')
    await expect(page.locator('[data-component="edition-files"] [data-file]')).toHaveCount(6)
    await expect(page.locator('[data-component="citation"]')).toContainText('edição de 26/10/2026 (2026-10-26)')
    await expect(page.locator('[data-component="citation"]')).toContainText(base + 'edicoes/2026-10-26/')
  })

  test('an older edition keeps its own address and says the site shows another', async ({ page }) => {
    await page.goto(base + 'edicoes/2026-10-20/')
    await expect(page.locator('h1')).toHaveText('Edição de 20/10/2026')
    await expect(page.locator('#main')).toContainText('mostram hoje outra edição')
    await expect(page.locator('[data-publication]')).toHaveAttribute('data-publication', 'automatic')
    await expect(page.locator('[data-component="edition-checks"] li')).toHaveCount(4)
    await expect(page.locator('[data-component="edition-checks"]')).toContainText('Passou: Totais nacionais iguais aos do TSE')
  })

  test('the list shows the newest edition first and links the feed', async ({ page }) => {
    await page.goto(base + 'edicoes/')
    await expect(page.locator('[data-component="edition-list"] [data-edition]')).toHaveText([/26\/10\/2026.*a que o site mostra/, /20\/10\/2026/])
    await expect(page.locator('[data-feed-link]')).toHaveAttribute('href', base + 'edicoes/feed.atom')
  })

  test('edition.json is served unchanged and the feed is Atom listing every edition', async ({ request }) => {
    const json = await (await request.get(base + 'edicoes/2026-10-26/edition.json')).json()
    expect(json.id).toBe('2026-10-26')
    const feed = await request.get(base + 'edicoes/feed.atom')
    expect(feed.status()).toBe(200)
    expect(feed.headers()['content-type']).toContain('application/atom+xml')
    const xml = await feed.text()
    expect(xml.indexOf('2026-10-26')).toBeLessThan(xml.indexOf('2026-10-20'))
    expect(xml).not.toMatch(/<script|google/i)
    expect(xml).toContain('passou: Totais nacionais iguais aos do TSE')  // the automatic publication records its checks
  })

  test('the data page explains what an edition is and how to cite one', async ({ page }) => {
    await page.goto(base + 'sobre-os-dados/')
    const section = page.locator('[data-component="editions"]')
    await expect(section.locator('h2')).toHaveText('Edições dos dados')
    await expect(section).toContainText('nunca muda depois de publicado')
    await expect(section.locator('[data-current-edition]')).toHaveAttribute('href', base + 'edicoes/2026-10-26/')
    await expect(section.locator('[data-component="citation"]')).toContainText('edição de 26/10/2026')
  })

  test('the data page states the Final, não ao vivo rule in plain words', async ({ page }) => {
    await page.goto(base + 'sobre-os-dados/')
    const rule = page.locator('[data-component="final-rule"]')
    await expect(page.locator('#final-nao-ao-vivo')).toHaveText('Final, não ao vivo')
    await expect(rule).toContainText('não apuração ao vivo')
    await expect(rule).toContainText('Dados parciais nunca são publicados')
    await expect(rule).toContainText('nada é publicado')
  })

  test('opening an edition makes no request beyond the site', async ({ page }) => {
    const seen = collectRequests(page)
    await page.goto(base + 'edicoes/2026-10-26/')
    await page.waitForLoadState('networkidle')
    expect(seen.every((r) => new URL(r.url).origin === new URL(page.url()).origin)).toBe(true)
  })
})
