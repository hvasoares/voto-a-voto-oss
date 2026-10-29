import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { base } from './helpers'
import { dataGuard } from './presets'
import { catalogText, cityBySlug, dataset } from './real-data-oracle'

/*
 * Real-data checks of the city-page head (ticket #8). Run with `npm run test:real` (builds with DATA_DIR=../data,
 * relative to web/). Skipped when ../data is missing. The spot-check covers ten routes, every case that could
 * break a path: the biggest city, the capital with an accent, one name in three UFs (the tags of each must be
 * its own), accented names of several types, and an overseas post whose latest cycle is 2018 (an older default
 * view than the rest). Every og:image must resolve on this build to an existing PNG of this city's own slug.
 */
test.skip(...dataGuard())

/** The ten routes: the path of each city and its display name; the rest (the TSE name, the newest cycle with data, the state tag) is read from cities.csv. */
const SPOTS: Array<{ uf: string; slug: string; label: string }> = [
  { uf: 'sp', slug: 'sao-paulo', label: 'São Paulo' },
  { uf: 'df', slug: 'brasilia', label: 'Brasília' },
  { uf: 'al', slug: 'belem', label: 'Belém' },
  { uf: 'pa', slug: 'belem', label: 'Belém' },
  { uf: 'pb', slug: 'belem', label: 'Belém' },
  { uf: 'go', slug: 'abadiania', label: 'Abadiânia' },
  { uf: 'ce', slug: 'acarau', label: 'Acaraú' },
  { uf: 'zz', slug: 'abidja', label: 'Abidjã' },
  { uf: 'zz', slug: 'freetown', label: 'Freetown' },
  { uf: 'zz', slug: 'lethem', label: 'Lethem' },
]
/** What the data says about a spot: the TSE name, the state tag the page prints and the newest cycle the city has results for. */
const CITIES = (dataset().cities.length === 0 ? [] : SPOTS).map((spot) => {
  const row = cityBySlug(spot.uf, spot.slug)
  return { ...spot, nome: row.nome, uf_: spot.uf === 'zz' ? 'Exterior' : spot.uf.toUpperCase(), ano: row.ciclos.at(-1)! }
})

/** The routes of the spot-check open the right page and tag it (10 slugs incl. accents and duplicate names). */
test.describe('city head spot-check on the real dataset', () => {
  for (const c of CITIES) {
    test(`${c.nome} (${c.uf.toUpperCase()})`, async ({ page }) => {
      const route = `${base}${c.uf}/${c.slug}/`
      const res = await page.goto(route)
      expect(res?.ok(), route).toBe(true)
      // the right page: its own h1 (the card), its own head
      await expect(page.locator('h1').first()).toHaveText(c.label)
      await expect(page).toHaveTitle(new RegExp(`${c.label} \\(${c.uf_}\\): resultado das eleições de ${c.ano} · Voto a Voto$`))
      const description = await page.locator('meta[name=description]').getAttribute('content')
      expect(description, route).toContain(catalogText('preview.intro', { place: `${c.label} (${c.uf_})` }))
      // the og:image is THIS city's file, referenced by tags that resolve on this build
      const promised = await page.locator('meta[property="og:image"]').getAttribute('content')
      expect(promised, route).toBe(`https://votoavoto.exemplo.br/preview/${c.uf}/${c.slug}.png`)
      const response = await page.request.get(`/preview/${c.uf}/${c.slug}.png`)
      expect(response.ok(), route).toBe(true)
      expect(response.headers()['content-type'], route).toBe('image/png')
      expect((await response.body()).length, route).toBeGreaterThan(5_000)
    })
  }
})

/** The published files the real build carries: every og:image above exists in dist, the right image per page. */
test.describe('the preview files of the real build', () => {
  test('every spot-check image exists in dist and is a real PNG', () => {
    for (const c of CITIES) {
      const file = resolve('dist', 'preview', c.uf, `${c.slug}.png`)
      expect(existsSync(file), file).toBe(true)
      const png = readFileSync(file)
      expect(png.length, file).toBeGreaterThan(5_000)
      // the PNG signature
      expect(png.subarray(0, 4)).toEqual(Uint8Array.from([0x89, 0x50, 0x4e, 0x47]))
    }
  })
})