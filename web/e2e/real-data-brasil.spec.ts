import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { allowedOrigins, base, collectRequests, violations } from './helpers'
import { dataGuard } from './presets'

/*
 * /brasil/ on the REAL dataset (run with `npm run test:real`; DATA_DIR=../data, relative to web/).
 * The expected figures are derived here from the dataset files themselves — data/turnout.csv,
 * data/votes.csv and data/cities.csv of 2026 round 2, aggregated by the region of each uf (the
 * overseas uf "zz" is national-only) — using the same largest-remainder rounding rule the page
 * documents. The national totals are, on top, compared against TSE's published totals already
 * committed in data/manifest.json ("national_reference"), so no number below is typed by hand.
 * Skipped when ../data is missing.
 */
test.skip(...dataGuard())

/** Rows of `file` as arrays of columns (the dataset CSVs contain no quoted commas). */
function csv(file: string): string[][] {
  return readFileSync(resolve('../data', file), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => l.split(','))
}

/** Largest-remainder split of 100 (unit: 10^-decimals of a percent) among the parts' shares of their sum. */
function lrScaled(parts: number[], decimals: number): number[] {
  const sum = parts.reduce((a, b) => a + b, 0)
  const total = 100 * 10 ** decimals
  const exact = parts.map((p) => (p / sum) * total)
  const out = exact.map((q) => Math.floor(q + 1e-9))
  let left = total - out.reduce((a, b) => a + b, 0)
  for (const o of exact
    .map((q, i) => ({ i, rem: q - out[i]! }))
    .sort((x, y) => (Math.abs(y.rem - x.rem) > 1e-9 ? y.rem - x.rem : x.i - y.i))) {
    if (left <= 0) break
    out[o.i]!++
    left--
  }
  return out
}

const ptNumber = new Intl.NumberFormat('pt-BR')

/** The 2026 round-2 aggregates derived from the dataset, the rule lib/brasil.ts must reproduce. */
function aggregate() {
  interface Region {
    aptos: number
    comparecimento: number
    brancos: number
    nulos: number
    validos: number
    votes: Map<string, number>
  }
  const nat = {
    validos: 0,
    aptos: 0,
    comparecimento: 0,
    brancos: 0,
    nulos: 0,
    votes: new Map<string, number>(),
  }
  const regions = new Map<string, Region>()
  const isCycleRow = (r: string[]) => r[0] === '2026' && r[1] === '2'
  const regionOf = (uf: string) => ufRegion.get(uf) ?? 'exterior'
  const ufRegion = new Map(csv('cities.csv').slice(1).map((r) => [r[0]!, r[5]!]))
  const target = (uf: string): Region | null => {
    const regiao = regionOf(uf)
    return regiao === 'exterior' ? null : (regions.get(regiao) ?? regions.set(regiao, { aptos: 0, comparecimento: 0, brancos: 0, nulos: 0, validos: 0, votes: new Map() }).get(regiao)!)
  }
  for (const r of csv('turnout.csv').slice(1).filter(isCycleRow)) {
    nat.validos += Number(r[10]!)
    nat.aptos += Number(r[4]!)
    nat.comparecimento += Number(r[5]!)
    nat.brancos += Number(r[7]!)
    nat.nulos += Number(r[8]!)
    const region = target(r[2]!)
    if (region) {
      region.validos += Number(r[10]!)
      region.aptos += Number(r[4]!)
      region.comparecimento += Number(r[5]!)
      region.brancos += Number(r[7]!)
      region.nulos += Number(r[8]!)
    }
  }
  for (const r of csv('votes.csv').slice(1).filter(isCycleRow)) {
    nat.votes.set(r[4]!, (nat.votes.get(r[4]!) ?? 0) + Number(r[5]!))
    const region = target(r[2]!)
    if (region) region.votes.set(r[4]!, (region.votes.get(r[4]!) ?? 0) + Number(r[5]!))
  }
  return { nat, regions }
}

/** The page's own share text of one part among `parts`. */
function partShare(part: number, parts: number[], decimals = 1): string {
  // scaled text derived explicitly here (not from lib/brasil) so the page's numbers are checked twice
  const scaled = lrScaled(parts, decimals)[parts.indexOf(part)]!
  const digits = String(scaled).padStart(decimals + 1, '0')
  const cut = digits.length - decimals
  return `${digits.slice(0, cut)}${decimals > 0 ? ',' + digits.slice(cut) : ''}`
}

test.describe('brasil on the real dataset', () => {
  test('the national bar: the official overseas-inclusive counts and shares (TSE published totals)', async ({ page }) => {
    const { nat } = await aggregate()
    const reference = (
      JSON.parse(readFileSync(resolve('../data/manifest.json'), 'utf8')) as {
        national_reference: { '2026-2': { validos: number; candidates: Record<string, number> } }
      }
    ).national_reference['2026-2']!
    expect(nat.validos, 'derivation vs data/manifest.json national_reference').toBe(reference.validos)
    expect(nat.votes.get('13')).toBe(reference.candidates['13'])
    expect(nat.votes.get('22')).toBe(reference.candidates['22'])

    await page.goto(`${base}brasil/`)
    const bar = page.locator('[data-brasil-bar]')
    const both = [nat.votes.get('13')!, nat.votes.get('22')!]
    // #91: the bar carries each candidate's share (fitted to the segment); the counts are text under the bar and in each segment's title attribute.
    await expect(bar.locator('span').nth(0)).toHaveText(new RegExp(`^(Lula )?${partShare(both[0]!, both, 2)}%$`))
    await expect(bar.locator('span').nth(1)).toHaveText(new RegExp(`^(Flávio( Bolsonaro)? )?${partShare(both[1]!, both, 2)}%$`))
    await expect(page.locator('[data-brasil-votos]')).toHaveText(`Lula ${ptNumber.format(both[0]!)} votos · Flávio Bolsonaro ${ptNumber.format(both[1]!)} votos`)
    const titles = await bar.locator('span').evaluateAll((els) => els.map((e) => e.getAttribute('title')))
    expect(titles[0]).toContain(`${ptNumber.format(both[0]!)} votos (${partShare(both[0]!, both, 2)}%)`)
    expect(titles[1]).toContain(`(${partShare(both[1]!, both, 2)}%)`)
  })

  test('the five regions show share, candidates, turnout and brancos/nulos as derived from the dataset', async ({ page }) => {
    const { nat, regions } = await aggregate()
    const regionalValidos = [...regions.values()].reduce((a, r) => a + r.validos, 0)
    expect(regionalValidos).toBeLessThan(nat.validos) // the overseas posts stay national-only
    const regionValidos = [...regions.values()].map((r) => r.validos)

    await page.goto(`${base}brasil/`)
    expect(await page.locator('[data-regiao]').count()).toBe(5)
    for (const [regiao, r] of regions) {
      const el = page.locator(`[data-regiao="${regiao}"]`)
      await expect(el.getByText(`${partShare(r.validos, regionValidos)}% dos votos válidos do país`)).toBeVisible()
      const lula = r.votes.get('13')!
      const flavio = r.votes.get('22')!
      // ONE bar per region (#91); the text of a segment is its name (or the short form) and share, fitted to the segment, never cut
      await expect(el.locator('[data-regiao-bar]')).toHaveCount(1)
      const segs = el.locator('[data-regiao-bar] span')
      await expect(segs.nth(0)).toHaveText(new RegExp(`^(Lula )?${partShare(lula, [lula, flavio])}%$`))
      await expect(segs.nth(1)).toHaveText(new RegExp(`^(Flávio( Bolsonaro)? )?${partShare(flavio, [lula, flavio])}%$`))
      const turnoutParts = [r.comparecimento, r.aptos - r.comparecimento]
      await expect(el.locator('[data-participacao]')).toHaveText(`Compareceram ${partShare(r.comparecimento, turnoutParts)}% · Não compareceram ${partShare(r.aptos - r.comparecimento, turnoutParts)}%`)
      await expect(el.locator('[data-brancos-nulos]')).toContainText(
        `Brancos ${partShare(r.brancos, [r.brancos, r.comparecimento - r.brancos])}% · Nulos ${partShare(r.nulos, [r.nulos, r.comparecimento - r.nulos])}% do comparecimento.`,
      )
    }
  })

  test('no foreign requests, no horizontal scroll; the real-state capture is saved for the review', async ({ page, baseURL }) => {
    const seen = collectRequests(page)
    await page.goto(`${base}brasil/`)
    await page.evaluate(() => document.fonts.ready)
    const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
    expect(sw).toBeLessThanOrEqual(iw)
    expect(violations(seen, await allowedOrigins(new URL(baseURL!).origin))).toEqual([])
    const dir = resolve('.captures', 'brasil')
    mkdirSync(dir, { recursive: true })
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: resolve(dir, 'real.png'), animations: 'disabled' })
    writeFileSync(
      resolve(dir, 'real.json'),
      JSON.stringify({ slot: 'brasil (issue 10)', state: 'real', route: `${base}brasil/`, viewport: page.viewportSize(), reference: 'site/reference/08-brasil-e-regioes.png' }, null, 2) + '\n',
    )
  })
})