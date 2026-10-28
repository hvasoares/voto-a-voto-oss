import { expect, test, type Page } from '@playwright/test'
import { activateSearch, base, waitReady } from './helpers'
import { segmentText } from '../src/shared/components'

/*
 * #86: a real type scale. Four sizes (13, 16, 20, 26 px; ratio about 1.25, floor 13) and two weights (400, 700) are tokens
 * (`--fs-*`, `--fw-*` in src/shared/tokens.ts); this structural probe walks every text-bearing element of the City card and
 * of the Home at 390x844 and checks the computed values. The later wave (#87) extends SCREENS to the other pages.
 */
const SCALE = [13, 16, 20, 26]
const WEIGHTS = [400, 700]
const SCREENS = [
  { name: 'City card', path: 'rj/cidade-exemplo/?turno=1' },
  { name: 'City card, round 2', path: 'rj/cidade-exemplo/?turno=2' },
  { name: 'Home', path: '' },
]

async function textStyles(page: Page) {
  return page.evaluate(() => {
    const rows: { size: number; weight: number; tag: string; text: string }[] = []
    for (const el of document.querySelectorAll('body *')) {
      const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent?.trim()).map((n) => n.textContent!.trim()).join(' ')
      if (!own) continue
      if (el.closest('script, style, noscript, svg, [hidden], [aria-hidden="true"], .sr-only')) continue
      const box = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      if (cs.display === 'none' || cs.visibility === 'hidden' || box.width <= 1 || box.height <= 1) continue
      rows.push({ size: parseFloat(cs.fontSize), weight: Number(cs.fontWeight), tag: `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]}`, text: own.slice(0, 40) })
    }
    return rows
  })
}

for (const { name, path } of SCREENS) {
  test.describe(`type scale: ${name}`, () => {
    test('every text sits on the four steps, nothing under 13px, only weights 400 and 700', async ({ page }) => {
      await page.goto(`${base}${path}`)
      await waitReady(page)
      const rows = await textStyles(page)
      const sizes = [...new Set(rows.map((r) => r.size))].sort((a, b) => a - b)
      const off = rows.filter((r) => !SCALE.includes(r.size) || !WEIGHTS.includes(r.weight)).map((r) => `${r.size}px/${r.weight} ${r.tag} "${r.text}"`)
      expect(off, `off-scale text on ${name}`).toEqual([])
      expect(sizes.length).toBeLessThanOrEqual(5)
      expect(Math.min(...sizes)).toBeGreaterThanOrEqual(13)
    })

    test('nothing is clipped or wider than the phone', async ({ page }) => {
      await page.goto(`${base}${path}`)
      await waitReady(page)
      const iw = await page.evaluate(() => window.innerWidth)
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(iw)
      const clipped = await page.evaluate(() =>
        [...document.querySelectorAll('body *')]
          .filter((el) => el.getBoundingClientRect().width > 1 && !el.closest('.sr-only, [hidden], .source-footer__about') && el.textContent?.trim() && el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== 'visible')
          .map((el) => `${el.tagName}.${el.className} "${el.textContent!.trim().slice(0, 30)}"`),
      )
      expect(clipped).toEqual([])
    })
  })
}

/* Home's other states: the search results, and the "Sua cidade" shortcut that appears once a city was chosen (and its "esquecer meus dados"). */
test.describe('type scale: Home states', () => {
  test('search results and the saved-city shortcut stay on the scale', async ({ page }) => {
    await page.goto(base)
    const box = await activateSearch(page)
    await box.fill('cidade')
    await page.locator('a[data-position="1"]').waitFor()
    const typed = await textStyles(page)
    await page.locator('a[data-position="1"]').click()
    await page.waitForURL(/cidade-exemplo/)
    await page.goto(base)
    await page.locator('[data-place-shortcut]:not([hidden])').waitFor()
    const saved = await textStyles(page)
    const off = [...typed, ...saved].filter((r) => !SCALE.includes(r.size) || !WEIGHTS.includes(r.weight)).map((r) => `${r.size}px/${r.weight} ${r.tag} "${r.text}"`)
    expect(off).toEqual([])
    expect(saved.some((r) => r.text === 'esquecer meus dados')).toBe(true)
    const forget = await page.locator('[data-place-forget]').boundingBox()
    expect(forget!.height).toBeGreaterThanOrEqual(44)
  })
})

/*
 * The card's bar text is chosen by a model (`candidateText`/`segmentText`: how many characters a segment holds). Here the model meets the
 * real font: for the real widest names and every share from 4 to 96, each line the model prints must be narrower than its segment of the
 * 318 px bar (to within half a pixel: the model is a character count, the margin is thin where a capital-heavy name just fits) (the 13 px bold of step 1), so nothing is ever clipped by the segment's overflow.
 */
const NAMES = ['Lula', 'Flávio Bolsonaro', 'Jair Bolsonaro', 'Fernando Haddad', 'Veterinário Wilson Grassi', 'Constituinte Eymael', 'Luiz Felipe d’Avila', 'Soraya Thronicke', 'Candidato A']
const BAR = 318

test('the bar text the model prints always fits its segment, in the real 13px bold font', async ({ page }) => {
  await page.goto(`${base}rj/cidade-exemplo/?turno=1`)
  await waitReady(page)
  const lines: { text: string; room: number; what: string }[] = []
  for (let pct = 4; pct <= 96; pct++) {
    const room = (pct / 100) * BAR
    for (const name of NAMES) for (const kind of ['a', 'b'] as const) for (const line of segmentText(kind, pct, name).split('\n')) if (line) lines.push({ text: line, room, what: `${name} ${pct}%` })
    for (const kind of ['abstencao', 'brancos', 'nulos', 'outros'] as const) for (const line of segmentText(kind, pct).split('\n')) if (line) lines.push({ text: line, room, what: `${kind} ${pct}%` })
  }
  const tooWide = await page.evaluate((all) => {
    const seg = document.querySelector('.city-card .bar__seg')!
    const cs = getComputedStyle(seg)
    const ctx = document.createElement('canvas').getContext('2d')!
    ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
    return all.filter((l) => ctx.measureText(l.text).width > l.room - 0.5).map((l) => `${l.what}: "${l.text}" ${ctx.measureText(l.text).width.toFixed(1)} > ${l.room.toFixed(1)}`)
  }, lines)
  expect(tooWide).toEqual([])
})
