import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { base } from './helpers'

/*
 * Real-data checks of the city-page head (ticket #8). Run with `npm run test:real` (builds with DATA_DIR=../data,
 * relative to web/). Skipped when ../data is missing. The spot-check covers ten routes, every case that could
 * break a path: the biggest city, the capital with an accent, one name in three UFs (the tags of each must be
 * its own), accented names of several types, and an overseas post whose latest cycle is 2018 (an older default
 * view than the rest). Every og:image must resolve on this build to an existing PNG of this city's own slug.
 */
test.skip(!existsSync(resolve('../data/cities.csv')), 'no ../data')

const CITIES: Array<{ uf: string; slug: string; nome: string; label: string; uf_: string; ano: string }> = [
  { uf: 'sp', slug: 'sao-paulo', nome: 'SÃO PAULO', label: 'São Paulo', uf_: 'SP', ano: '2026' },
  { uf: 'df', slug: 'brasilia', nome: 'BRASÍLIA', label: 'Brasília', uf_: 'DF', ano: '2026' },
  { uf: 'al', slug: 'belem', nome: 'BELÉM', label: 'Belém', uf_: 'AL', ano: '2026' },
  { uf: 'pa', slug: 'belem', nome: 'BELÉM', label: 'Belém', uf_: 'PA', ano: '2026' },
  { uf: 'pb', slug: 'belem', nome: 'BELÉM', label: 'Belém', uf_: 'PB', ano: '2026' },
  { uf: 'go', slug: 'abadiania', nome: 'ABADIÂNIA', label: 'Abadiânia', uf_: 'GO', ano: '2026' },
  { uf: 'ce', slug: 'acarau', nome: 'ACARAÚ', label: 'Acaraú', uf_: 'CE', ano: '2026' },
  { uf: 'zz', slug: 'abidja', nome: 'ABIDJÃ', label: 'Abidjã', uf_: 'Exterior', ano: '2026' },
  { uf: 'zz', slug: 'freetown', nome: 'FREETOWN', label: 'Freetown', uf_: 'Exterior', ano: '2018' },
  { uf: 'zz', slug: 'lethem', nome: 'LETHEM', label: 'Lethem', uf_: 'Exterior', ano: '2018' },
]

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
      expect(description, route).toContain(`Resultado de ${c.label} (${c.uf_})`)
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