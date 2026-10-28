import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { base } from './helpers'

/*
 * Ticket #36: the donation link ("Apoie o projeto") on the footer of every page and on the data page, in a new
 * tab, drawn only when PUBLIC_DONATION_URL is configured at build time. The build of this run has the address
 * (CI's second pass and `npm run test:e2e:donation`) or has not; each case asserts what its build must show.
 * The page files are read from the build, so every page is covered, not a sample.
 */
const DIST = resolve(process.env.OUT_DIR ?? 'dist')
const ADDRESS = (process.env.PUBLIC_DONATION_URL ?? '').trim()
const pages = (dir = DIST): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    // `fragmentos`: the desktop fragment documents (iframes, no footer of their own: G10); `tela`: the OBS overlay (#68), a bare document that fills a browser source; `embed`: the city widgets (#29), which live
    // inside other people's sites and carry no footer, no script and no donation link of ours
    if (statSync(path).isDirectory()) return name === '_astro' || name === 'data' || name === 'geo' || name === 'preview' || name === 'fragmentos' || name === 'embed' || name === 'tela' ? [] : pages(path)
    return name.endsWith('.html') ? [path] : []
  })

test('the build has pages to check', () => {
  expect(pages().length).toBeGreaterThan(20)
})

test.describe('no address configured', () => {
  test.skip(!!ADDRESS, 'this build has a donation address')

  test('no page of the build links a donation page', () => {
    for (const file of pages()) expect(readFileSync(file, 'utf8'), file).not.toContain('data-donation-link')
  })

  test('the data page still says there are no ads and that donations and analytics are separate, with no donate button', async ({ page }) => {
    await page.goto(`${base}sobre-os-dados/`)
    await expect(page.locator('[data-support-text]')).toHaveText('Doações e análise de uso são separadas. Não há anúncios em nenhuma página.')
    await expect(page.getByRole('heading', { name: 'Anúncios e apoio' })).toBeVisible()
    await expect(page.locator('[data-donation-link]')).toHaveCount(0)
  })
})

test.describe('address configured', () => {
  test.skip(!ADDRESS, 'set PUBLIC_DONATION_URL (https) for this build to run these')

  test('every page of the build carries the link in its footer, to the configured address, in a new tab', () => {
    for (const file of pages()) {
      const html = readFileSync(file, 'utf8')
      expect(html, file).toContain('data-donation-link')
      expect(html, file).toMatch(new RegExp(`<a [^>]*?href="${ADDRESS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^"]*" target="_blank" rel="noopener noreferrer" data-donation-link`))
    }
  })

  test('home: the footer link opens the donation page in a new tab and the page stays', async ({ page, context }) => {
    await page.goto(base)
    const link = page.locator('[data-component="consent-footer"]').getByRole('link', { name: /Apoie o projeto/ })
    await expect(link).toHaveAttribute('href', ADDRESS)
    await expect(link).toHaveAttribute('target', '_blank')
    await expect(link).toHaveAttribute('rel', /noopener/)
    await expect(link).toContainText('abre em nova aba')
    const opened = context.waitForEvent('page')
    await context.route(ADDRESS + '**', (route) => route.fulfill({ body: 'donation page', contentType: 'text/plain' }))
    await link.click()
    expect(new URL((await opened).url()).origin).toBe(new URL(ADDRESS).origin)
    await expect(page).toHaveURL(base)
  })

  test('data page: the section "Apoie o projeto" has the statement and the button', async ({ page }) => {
    // the fixed metrics notice would cover the bottom of the page on a first visit
    await page.addInitScript(() => localStorage.setItem('voto-a-voto:notice', 'acknowledged'))
    await page.goto(`${base}sobre-os-dados/`)
    const section = page.locator('[data-component="support"]')
    await expect(section.getByRole('heading', { name: 'Apoie o projeto' })).toBeVisible()
    await expect(section).toContainText('Doações e análise de uso são separadas. Não há anúncios em nenhuma página.')
    const button = section.getByRole('link', { name: /Apoie o projeto/ })
    await expect(button).toHaveAttribute('href', ADDRESS)
    await expect(button).toHaveAttribute('target', '_blank')
    // The button is drawn 30 px high (the Sketch frame); its tap area is 44 px (the 44 px rule of #19): a tap 6 px above and below still hits it.
    await button.scrollIntoViewIfNeeded()
    const box = (await button.boundingBox())!
    for (const y of [box.y - 6, box.y + box.height + 6]) {
      expect(await page.evaluate(([px, py]) => !!document.elementFromPoint(px!, py!)?.closest('[data-donation-link]'), [box.x + box.width / 2, y])).toBe(true)
    }
  })
})

test.describe('the rule that holds either way: no ad network', () => {
  test('no page of the build loads a script or frame from another origin than the configured ones', () => {
    const files = pages()
    for (const file of files) {
      const html = readFileSync(file, 'utf8')
      const origins = [...html.matchAll(/<(?:script|iframe|img)\b[^>]*\bsrc="(https?:\/\/[^"]+)"/g)].map((m) => new URL(m[1]!).origin)
      expect(origins, file).toEqual([])
    }
    expect(existsSync(DIST)).toBe(true)
  })
})
