import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { base, expectNoHorizontalScroll, mode, waitReady } from './helpers'
import { PHONE } from './presets'

/*
 * #100: the state page links to the state story (/<uf>/historia/, the swipeable cards) from "Mais sobre o estado", next to
 * "Resumo do estado", for the states that have a story page and for no other. In the fixture RJ has a story and MT has none
 * (its cities lack a cycle). The link is one plain anchor: it is in the built html, so it works without scripts.
 */
const LINK = 'a[data-link="story"]'
const dist = join(process.cwd(), mode === 'production' ? 'dist-production' : 'dist')
const LINK_IN_HTML = /<a data-link="story" href="[^"]*\/historia\/"/

test.describe('state story entry (build)', () => {
  // Reads the built files, no browser: every built /<uf>/ page has the link exactly when /<uf>/historia/index.html was built.
  test('every built state page has the story link exactly when its story page was built', () => {
    const ufs = readdirSync(dist).filter((d) => /^[a-z]{2}$/.test(d) && existsSync(join(dist, d, 'index.html')) && existsSync(join(dist, d, 'resumo')))
    expect(ufs.length).toBeGreaterThanOrEqual(2)
    const withStory = ufs.filter((uf) => existsSync(join(dist, uf, 'historia', 'index.html')))
    expect(withStory.length).toBeGreaterThan(0)
    expect(withStory.length).toBeLessThan(ufs.length)
    for (const uf of ufs) {
      const html = readFileSync(join(dist, uf, 'index.html'), 'utf8')
      expect(LINK_IN_HTML.test(html), uf).toBe(withStory.includes(uf))
    }
  })
})

test.describe('state story entry (page)', () => {
  test('RJ: "Ver a história do estado ›" sits next to "Resumo do estado ›" and opens the story', async ({ page }) => {
    await page.goto(`${base}rj/`)
    await waitReady(page)
    const labels = await page.locator('.state-links a').allTextContents()
    expect(labels.indexOf('Ver a história do estado ›')).toBe(labels.indexOf('Resumo do estado ›') - 1)
    const link = page.locator(LINK)
    await expect(link).toHaveAttribute('href', `${base}rj/historia/`)
    await link.click()
    await expect(page).toHaveURL(`${base}rj/historia/`)
    await expect(page.locator('h1')).toHaveText('Rio de Janeiro')
  })

  test('MT has no story page and no link', async ({ page }) => {
    await page.goto(`${base}mt/`)
    await waitReady(page)
    await expect(page.locator('.state-links')).toBeVisible()
    await expect(page.locator(LINK)).toHaveCount(0)
    expect((await page.request.get(`${base}mt/historia/`)).status()).toBe(404)
  })

  test('the keyboard reaches the link and it shows a focus ring', async ({ page }) => {
    await page.goto(`${base}rj/`)
    await waitReady(page)
    const link = page.locator(LINK)
    await link.focus()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    await expect(link).toBeFocused()
    expect(await link.evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe('none')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(`${base}rj/historia/`)
  })

  test('at 390 px the group has no horizontal scroll, the link is 44 px tall and axe is clean', async ({ page }) => {
    await page.setViewportSize(PHONE)
    await page.goto(`${base}rj/`)
    await waitReady(page)
    await expectNoHorizontalScroll(page)
    for (const a of await page.locator('.state-links a').all()) expect((await a.boundingBox())!.height, await a.innerText()).toBeGreaterThanOrEqual(44)
    const results = await new AxeBuilder({ page }).include('.state-links').analyze()
    expect(results.violations).toEqual([])
  })
})
