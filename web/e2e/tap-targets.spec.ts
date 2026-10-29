import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { activateSearch, base, waitReady } from './helpers'
import { measureMap } from './map-touch'
import { DESKTOP } from './presets'
import { footerLinkPagesOnDisk } from './routes-inventory'

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

async function hitAreas(page: Page, scope = 'body'): Promise<Target[]> {
  return page.evaluate(({ min, scope }) => {
    const sel = 'a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=combobox], [role=link]'
    const out: { what: string; hitW: number; hitH: number }[] = []
    for (const el of document.querySelectorAll<HTMLElement>(sel)) {
      if (!el.closest(scope)) continue
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
  }, { min: MIN, scope })
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
    expect(lines.consentFooterH).toBeLessThan(2 * MIN + 24) // two lines since #103 (edition and privacy; Relatórios and Mapa por estado), not three
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

  test('Estado (#83): the search box, the Lista | Mapa toggle, every city row and the links have a 44 px hit height', async ({ page }) => {
    await page.goto(`${base}rj/`)
    await waitReady(page)
    await page.locator('[data-consent-continue]').click()
    // this ticket's own area: the search box and the island (toggle + rows); the page's header, "De onde vem este número?" and footer lines belong to other tickets
    const scope = '[data-state-search], [data-map-area], .state-links'
    const found = await hitAreas(page, scope)
    expect(found.filter((t) => /Lista|Mapa|Cidade Exemplo|Busque/.test(t.what)).length).toBeGreaterThanOrEqual(8)
    expect(small(found)).toEqual([])
    // and after typing: the filtered row and the search box keep it
    await page.getByRole('searchbox').fill('exemplo b')
    await expect(page.locator('[data-state-search]')).toHaveAttribute('data-filtered', '1')
    expect(small(await hitAreas(page, scope))).toEqual([])
  })

  test('Sobre os dados (#98): the back link, the edition links, the widget link, the footer lines have a 44 px hit height; only links inside running text are exempt', async ({ page }) => {
    await page.goto(`${base}sobre-os-dados/`)
    await page.locator('[data-consent-continue]').click()
    const found = await hitAreas(page)
    // Anchors that sit inside a sentence (a finger can still use the browser's text zoom): the manifest and repository links, the licence link, the manifest rows' text.
    const running = (t: Target) => /manifesto do repositório|data\/manifest\.json|github\.com\/hvasoares|Creative Commons|Detalhes em Sobre os dados/.test(t.what)
    expect(found.length).toBeGreaterThan(8)
    expect(small(found.filter((t) => !running(t)))).toEqual([])
    // "Usar os dados" (#102): the widget link and the six links of the list are hit areas of their own
    const uses = await page.locator('[data-component="use-data"] [data-use]').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))
    expect(uses).toHaveLength(7)
    for (const h of uses) expect(h).toBeGreaterThanOrEqual(44)
  })

  test('axe, target-size included: no violations on the Home with the notice open and on the hydrated map view', async ({ page }) => {
    for (const path of ['', 'mapa/?vista=mapa']) {
      await page.goto(`${base}${path}`)
      if (path) await expect(page.getByRole('img', { name: /^Mapa do Brasil por estado/ })).toBeVisible()
      else await expect(page.locator('#consent-banner')).toBeVisible()
      // The map view's two older findings (full aria-labels on the state links, links inside the role=img drawing) were there before #88 and are
      // outside it; this test pins that the hit paths and the bigger callout rows add nothing to them.
      const known = path ? ['label-content-name-mismatch', 'nested-interactive'] : []
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).disableRules(known).analyze()
      expect(violations.map((v) => `${v.id} [${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(', ')}]`), path || 'home').toEqual([])
    }
  })

  test.describe('state map shapes (vista=mapa, fixture: RJ, SP, MT)', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${base}mapa/?vista=mapa`)
      await page.locator('[data-consent-continue]').click()
      await expect(page.getByRole('img', { name: /^Mapa do Brasil por estado/ })).toBeVisible()
    })

    test('every shape has a 44 px hit area (an invisible hit path where the drawing is smaller), the callout row is 44 px tall', async ({ page }) => {
      const shapes = await measureMap(page)
      expect(shapes.map((s) => s.uf).sort()).toEqual(['mt', 'rj', 'sp'])
      for (const s of shapes) {
        expect(s.hit.w, `${s.uf} hit width`).toBeGreaterThanOrEqual(MIN)
        expect(s.hit.h, `${s.uf} hit height`).toBeGreaterThanOrEqual(MIN)
      }
      const rj = shapes.find((s) => s.uf === 'rj')!
      expect(rj.shape.h).toBeLessThan(MIN) // RJ is drawn smaller than a fingertip: that is why it has a hit path
      expect(rj.hit.invisible).toBe(true)
      expect(rj.callout!.h).toBeGreaterThanOrEqual(MIN)
      expect(rj.callout!.w).toBeGreaterThanOrEqual(MIN)
      expect(rj.ownSquare.callout).toBeGreaterThanOrEqual(MIN)
    })

    test('a tap on the centre of each state reaches that state; no tap on a visible shape is stolen by a neighbour hit path', async ({ page }) => {
      for (const s of await measureMap(page)) {
        expect(s.centre.reaches, `${s.uf} centre`).toBe(s.uf)
        expect(s.stolen, `${s.uf} visible area taken by another state`).toBe(0)
      }
    })

    test('a tap on the big states opens the big state, a tap on the hit-path margin of RJ opens RJ, the callout row too', async ({ page }) => {
      const panel = page.locator('[data-slot="mapa-selecionado"]')
      const shapes = await measureMap(page)
      for (const uf of ['mt', 'sp', 'rj'] as const) {
        const c = shapes.find((s) => s.uf === uf)!.centre
        await page.touchscreen.tap(c.x, c.y)
        await expect(panel).toContainText(`${uf.toUpperCase()} · selecionado`)
      }
      // The callout's whole 44 px row, not only its drawn box, selects RJ.
      await page.touchscreen.tap(...(await rowEdge(page)))
      await expect(panel).toContainText('RJ · selecionado')
    })

    test('keyboard: every state is one focusable link (shape and callout) and the hit paths are not', async ({ page }) => {
      expect(await page.locator('svg[role="img"] a[data-uf]').count()).toBe(4) // rj twice (shape and callout), sp, mt
      expect(await page.locator('svg[role="img"] path[data-hit]').evaluateAll((els) => els.filter((e) => e.closest('a') || e.hasAttribute('tabindex') || e.hasAttribute('href')).length)).toBe(0)
      expect(await page.locator('svg[role="img"] path[data-hit]').evaluateAll((els) => els.every((e) => e.getAttribute('aria-hidden') === 'true'))).toBe(true)
    })
  })
})

/** A point on the callout row of RJ that lies outside the drawn box but inside the 44 px hit rectangle. */
async function rowEdge(page: Page): Promise<[number, number]> {
  return page.evaluate(() => {
    const row = document.querySelector('rect[data-hit="rj"]')!.getBoundingClientRect()
    const drawn = document.querySelector('a[data-uf="rj"] rect:not([data-hit])')!.getBoundingClientRect()
    return [row.left + row.width / 2, (row.top + drawn.top) / 2 + 0.5] as [number, number]
  })
}

/* #87: the "Sobre os dados ›" link of EVERY page footer is a 44 px target (one shared rule in screens.css, not 30 edits). The list is
   derived (#110): every page template minus the reasoned FOOTER_EXCLUSIONS of e2e/routes-inventory.ts (the pages whose footer link is
   the keyboard-only `.source-footer__about` — City card, its three-cycle page, the fact pages — the share sheets whose page behind is
   inert, and the embeds/fragments/posters with no shared footer at all), each at its fixture URL. The route-inventory guard fails when
   a page grows that no exclusion accounts for. */
const FOOTER_PAGES = footerLinkPagesOnDisk(fileURLToPath(new URL('..', import.meta.url)))
test.describe('tap targets: the footer link on every page (390x844)', () => {
  for (const path of FOOTER_PAGES) {
    test(`${path}: "Sobre os dados" in the footer is 44 px high`, async ({ page }) => {
      await page.goto(`${base}${path}`)
      const link = page.locator('footer a[href$="sobre-os-dados/"]:not(.source-footer__about)').first()
      await expect(link).toBeAttached()
      const box = await link.boundingBox()
      expect(box!.height).toBeGreaterThanOrEqual(MIN)
    })
  }
})

/* #154: the way home is the "Voto a Voto" wordmark, a 44 px target in the app header on a phone (390x844) and in the top bar at desktop width; no page draws an "Início" link. */
const HEADER_PAGES = ['rj/', 'rj/cidade-exemplo/', 'rj/cidade-exemplo/tres-ciclos/', 'brasil/', 'gerador/', 'cara-a-cara/', 'meu-brasil/', 'widget/', 'imprensa/', 'relatorios/', 'sobre-os-dados/', 'mapa/']
for (const [label, wordmark, viewport] of [
  ['390x844', 'header[data-app-header] a:has-text("Voto a Voto")', undefined],
  ['1440x900', '[data-component="top-bar"] [data-wordmark]', DESKTOP],
] as const) {
  test.describe(`the wordmark is the way home, a 44 px target (${label})`, () => {
    if (viewport) test.use({ viewport })
    for (const path of HEADER_PAGES) {
      test(`${path}: the wordmark links Home, is 44 px high, and no "Início" link is drawn`, async ({ page }) => {
        await page.goto(`${base}${path}`)
        const mark = page.locator(wordmark).first()
        await expect(mark).toHaveAttribute('href', base)
        expect((await mark.boundingBox())!.height).toBeGreaterThanOrEqual(MIN)
        await expect(page.getByRole('link', { name: /Início/ })).toHaveCount(0)
      })
    }
  })
}
