import { expect, test, type Page } from '@playwright/test'
import { activateSearch, base, waitReady } from './helpers'

/*
 * #88: nothing a fingertip has to hit is smaller than 44 CSS px, on the Home, in the metrics notice, in the footer lines and on
 * the state map. Structural probe at 390x844: every visible interactive element is scrolled to the middle of the screen and its
 * REAL hit area is measured with `document.elementFromPoint` (so a padded anchor, an enlarged hit layer or a pseudo-element
 * counts exactly as a finger would find it), going out from the element's centre until the element stops being what is hit.
 */
const MIN = 44

interface Target {
  what: string
  hitW: number
  hitH: number
}

async function hitAreas(page: Page): Promise<Target[]> {
  return page.evaluate((min) => {
    const sel = 'a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=combobox], [role=link]'
    const out: { what: string; hitW: number; hitH: number }[] = []
    for (const el of document.querySelectorAll<HTMLElement>(sel)) {
      if (el.closest('.sr-only, [hidden], [aria-hidden="true"], svg, noscript')) continue
      const cs = getComputedStyle(el)
      if (cs.display === 'none' || cs.visibility === 'hidden' || el.closest('[inert]')) continue
      const r0 = el.getBoundingClientRect()
      if (r0.width <= 1 || r0.height <= 1) continue
      el.scrollIntoView({ block: 'center', inline: 'center' })
      // An inline link that wraps has one box per line: every line box is a place a finger lands.
      for (const r of [...el.getClientRects()].filter((b) => b.width > 1 && b.height > 1)) {
        const [cx, cy] = [r.left + r.width / 2, r.top + r.height / 2]
        const hits = (x: number, y: number) => {
          const t = document.elementFromPoint(x, y)
          return !!t && (t === el || el.contains(t) || t.closest('a, button') === el)
        }
        if (!hits(cx, cy)) continue // covered (a fixed bar): not a finger target at this scroll
        const scan = (dx: number, dy: number) => {
          let n = 0
          while (n < min * 2 && hits(cx + dx * (n + 1), cy + dy * (n + 1))) n++
          return n
        }
        const [up, down, left, right] = [scan(0, -1), scan(0, 1), scan(-1, 0), scan(1, 0)]
        out.push({ what: `${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 36)}"`, hitW: left + right + 1, hitH: up + down + 1 })
      }
    }
    return out
  }, MIN)
}

/** Interactive elements whose hit area is under 44 in height (every kind) or in width (blocks: a word of text is always wide enough). */
const small = (rows: Target[]) => rows.filter((r) => r.hitH < MIN).map((r) => `${r.what}: ${r.hitW}x${r.hitH}`)

test.describe('tap targets (390x844)', () => {
  test('Home with the notice open: every link and button has a 44 px hit height', async ({ page }) => {
    await page.goto(base)
    await waitReady(page)
    await expect(page.locator('#consent-banner')).toBeVisible()
    expect(small(await hitAreas(page))).toEqual([])
  })

  test('Home with the notice acknowledged, search results open: footer lines included', async ({ page }) => {
    await page.goto(base)
    await page.locator('[data-consent-continue]').click()
    await activateSearch(page)
    await page.getByRole('combobox', { name: 'Busque sua cidade' }).fill('exemplo')
    await expect(page.locator('a[data-position]').first()).toBeVisible()
    expect(small(await hitAreas(page))).toEqual([])
  })

  test('the two footer lines are 44 px tall, and the links on one line keep a gap between their hit areas', async ({ page }) => {
    await page.goto(base)
    await page.locator('[data-consent-continue]').click()
    const lines = await page.evaluate(() => {
      const box = (el: Element) => el.getBoundingClientRect()
      const edition = document.querySelector('[data-edition-link]')!
      const privacy = document.querySelector('[data-component="consent-footer"] a[href*="sobre-os-dados"]')!
      const about = document.querySelector('footer[data-component="source-footer"] a')!
      return {
        editionH: box(edition).height,
        privacyH: box(privacy).height,
        aboutH: box(about).height,
        gap: box(privacy).left - box(edition).right,
        consentFooterH: box(document.querySelector('[data-component="consent-footer"]')!).height,
      }
    })
    expect(lines.editionH).toBeGreaterThanOrEqual(MIN)
    expect(lines.privacyH).toBeGreaterThanOrEqual(MIN)
    expect(lines.aboutH).toBeGreaterThanOrEqual(MIN)
    expect(lines.gap).toBeGreaterThanOrEqual(8)
    expect(lines.consentFooterH).toBeLessThan(MIN + 24) // the page did not grow by a whole line
  })

  test('the notice: "Detalhes em Sobre os dados" has a 44 px hit area and does not touch the Prosseguir button', async ({ page }) => {
    await page.goto(base)
    const banner = page.locator('#consent-banner')
    await expect(banner).toBeVisible()
    const [link, button, bar] = await Promise.all([
      banner.getByRole('link', { name: 'Detalhes em Sobre os dados' }).boundingBox(),
      banner.locator('[data-consent-continue]').boundingBox(),
      banner.boundingBox(),
    ])
    expect(link!.height).toBeGreaterThanOrEqual(MIN)
    expect(link!.y + link!.height).toBeLessThanOrEqual(button!.y)
    expect(bar!.height).toBeLessThan(230) // the notice stayed a quiet bar
  })

  for (const [name, path] of [['Mapa, mosaico', 'mapa/'], ['Mapa, vista mapa', 'mapa/?vista=mapa'], ['Mapa virada, vista mapa', 'mapa/virada/?vista=mapa']] as const) {
    test(`${name}: every link and button has a 44 px hit height`, async ({ page }) => {
      await page.goto(`${base}${path}`)
      await page.locator('[data-consent-continue]').click()
      if (path.includes('vista=mapa')) await expect(page.getByRole('img', { name: /^Mapa do Brasil por estado/ })).toBeVisible()
      expect(small(await hitAreas(page))).toEqual([])
    })
  }
})
