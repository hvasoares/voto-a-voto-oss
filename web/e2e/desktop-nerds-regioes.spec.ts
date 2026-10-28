import { expect, test } from '@playwright/test'
import { gzipSync } from 'node:zlib'
import { base } from './helpers'

/*
 * The region SVG of the dashboard (#71) at 1440 px: five linked shapes with a title and a text label, drawn from the same outlines as the UF map (a region is exactly the union
 * of its states' paths), complete with JavaScript off.
 */
const REGIONS = ['norte', 'nordeste', 'centro-oeste', 'sudeste', 'sul']
const url = `${base}dados-para-nerds/geometria/`

test.describe('Região outlines (1440 px)', () => {
  test.use({ javaScriptEnabled: false })

  test('draws the five regions as links with a title and a text label, with scripts off', async ({ page }) => {
    await page.goto(url)
    const links = page.locator('[data-region-map] a[data-region]')
    await expect(links).toHaveCount(5)
    expect(await links.evaluateAll((els) => els.map((e) => e.getAttribute('data-region')))).toEqual(REGIONS)
    for (const r of REGIONS) {
      const a = page.locator(`[data-region-map] a[data-region="${r}"]`)
      expect(await a.getAttribute('href')).toMatch(new RegExp(`dados-para-nerds/regiao/${r}/$`))
      expect(await a.locator('title').textContent()).toBeTruthy()
      expect(await a.locator('text').textContent()).toBeTruthy()
      expect((await a.locator('path').getAttribute('d'))!.length).toBeGreaterThan(50)
    }
  })

  test('a region is exactly the union of its states: the same path data as the UF drawing next to it', async ({ page }) => {
    await page.goto(url)
    const ufD = await page.locator('[data-uf-map] [data-map-uf]').evaluateAll((els) => Object.fromEntries(els.map((e) => [e.getAttribute('data-map-uf'), e.querySelector('path')!.getAttribute('d')])))
    expect(Object.keys(ufD)).toHaveLength(27)
    const regions = await page.locator('[data-region-map] a').evaluateAll((els) => els.map((e) => e.querySelector('path')!.getAttribute('d')!))
    let rest = regions.join('')
    for (const d of Object.values(ufD) as string[]) {
      expect(rest.split(d).length - 1, 'each UF path appears exactly once').toBe(1)
      rest = rest.replace(d, '')
    }
    expect(rest).toBe('')
  })

  test('the inline SVG costs a measured, small amount of HTML (recorded, not on any phone page)', async ({ page }) => {
    const html = await (await page.request.get(url)).text()
    const svg = html.match(/<svg class="nerds-region-map"[\s\S]*?<\/svg>/)![0]
    const gz = gzipSync(svg).length
    console.log(`region SVG: ${svg.length} bytes raw, ${gz} bytes gzip`)
    expect(gz).toBeLessThan(16_000)
  })
})
