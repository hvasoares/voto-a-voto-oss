import { expect, test, type Page } from '@playwright/test'
import { base, waitReady } from './helpers'
import { segmentText } from '../src/shared/components'
import { notVotedText } from '../src/slots/city-cycles/cycles-model'

/*
 * #89: the City card's labels say what the visitor wants to do. The register pair names both options, the comparison link names both
 * cycles it offers, every calculation link reads "De onde vem este número?" (same address), and a bar segment too narrow for its word
 * prints nothing (never "Br", "Nu"): the legend row (card) or the caption under the bar (three cycles) carries the label and the share.
 */
const city = `${base}rj/cidade-exemplo/`
const cycles = `${city}tres-ciclos/`
const INITIALS = /^(Ab|Br|Nu|Ou)$/

const segments = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.bar__seg:not([hidden])')]
      .filter((el) => el.getBoundingClientRect().width > 0 && !el.closest('[hidden]'))
      .map((el) => {
        // the widest line of the text against the segment's inner width
        const range = document.createRange()
        range.selectNodeContents(el)
        const cs = getComputedStyle(el)
        const inner = el.getBoundingClientRect().width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
        return { text: (el as HTMLElement).innerText.trim(), clipped: range.getBoundingClientRect().width > inner + 0.5 }
      }),
  )

test.describe('labels in the visitor\'s words (phone)', () => {
  test('the register pair says "Texto integral" and "Linguagem simples"; the stored value is unchanged', async ({ page }) => {
    await page.goto(`${city}?turno=1`)
    await waitReady(page)
    const standard = page.locator('[data-register-choice="standard"]:visible')
    const plain = page.locator('[data-register-choice="plain"]:visible')
    await expect(standard).toHaveText('Texto integral')
    await expect(plain).toHaveText('Linguagem simples')
    await plain.click()
    expect(await page.evaluate(() => localStorage.getItem('voto-a-voto:register'))).toBe('plain')
    await expect(plain).toHaveAttribute('aria-pressed', 'true')
  })

  test('the comparison link names 2022 and 2018 and opens the page that offers both', async ({ page }) => {
    await page.goto(`${city}?turno=1`)
    const link = page.locator('.city-links a', { hasText: 'Comparar com 2022 e 2018' })
    await expect(link).toHaveAttribute('href', `${base}comparar/2022/`)
    await link.click()
    await expect(page.locator('[data-component="cycle-tabs"] [data-tab]')).toHaveText(['2018', '2022'])
    await expect(page.locator('a[data-tab="2018"]')).toHaveAttribute('href', `${base}comparar/2018/`)
  })

  test('the card has the one calculation entry, named "De onde vem este número?" in both registers, with the address of the view shown (#155)', async ({ page }) => {
    await page.goto(`${city}?turno=1`)
    await waitReady(page)
    const calc = page.locator('.city-page a.calc')
    await expect(calc).toHaveCount(1)
    await expect(calc).toHaveAttribute('aria-label', 'De onde vem este número?')
    await expect(calc).toHaveAttribute('href', `${base}fato/rj/cidade-exemplo/2026-1/#votaram`)
    await page.locator('[data-register-choice="plain"]:visible').click()
    await expect(page.getByRole('link', { name: 'De onde vem este número?' })).toHaveCount(1)
    await page.getByRole('link', { name: '2º turno' }).click()
    await expect(calc).toHaveAttribute('href', `${base}fato/rj/cidade-exemplo/2026-2/#votaram`)
  })

  for (const turno of [1, 2]) {
    test(`card, round ${turno}: no segment label is clipped or reduced to initials; the legend carries every share`, async ({ page }) => {
      await page.goto(`${city}?turno=${turno}`)
      await waitReady(page)
      for (const s of await segments(page)) {
        expect(s.clipped, s.text).toBe(false)
        expect(s.text).not.toMatch(INITIALS)
      }
      // a "De onde vem este número?" that wraps below its title must not squeeze the bar beside it
      for (const w of await page.locator('.city-card .city-panel:visible .bar').evaluateAll((bars) => bars.map((b) => b.getBoundingClientRect().width))) expect(w).toBeGreaterThan(300)
      const rows = await page.locator('.city-card .city-panel:visible .legend__row').allInnerTexts()
      for (const word of ['Abstenção', 'Brancos', 'Nulos']) expect(rows.some((r) => r.includes(word) && /\d+%/.test(r))).toBe(true)
    })
  }

  test('three cycles: no segment label is clipped or reduced to initials; a bare segment is named in the caption under its bar', async ({ page }) => {
    await page.goto(`${cycles}?turno=1`)
    await waitReady(page)
    for (const s of await segments(page)) {
      expect(s.clipped, s.text).toBe(false)
      expect(s.text).not.toMatch(INITIALS)
    }
    const empty = await page.locator('.cycles__round:not([hidden]) .cycle').evaluateAll((blocks) =>
      blocks.map((b) => ({ bare: [...b.querySelectorAll('.bar__seg--brancos, .bar__seg--nulos')].filter((s) => !(s as HTMLElement).innerText.trim()).length, caption: b.querySelector('[data-bar-caption]')?.textContent ?? '' })),
    )
    for (const b of empty) if (b.bare) expect(b.caption).toMatch(/(Brancos|Nulos) \d+%/)
  })
})

test.describe('the model, for real-world tiny shares of Brancos and Nulos', () => {
  for (const pct of [0.5, 1, 1.2, 2, 3, 6, 9, 12, 16]) {
    test(`${pct}%: the segment prints a whole word or nothing`, () => {
      for (const kind of ['brancos', 'nulos'] as const) {
        expect(segmentText(kind, pct)).not.toMatch(INITIALS)
        expect(notVotedText(kind, pct)).not.toMatch(INITIALS)
      }
    })
  }
})
