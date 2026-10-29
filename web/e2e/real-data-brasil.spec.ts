import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'
import { allowedOrigins, base, collectRequests, violations } from './helpers'
import { dataGuard } from './presets'
import { candidateVotes, catalogText, int, nationalReference, regions, shareText, turnoutSum } from './real-data-oracle'

/*
 * /brasil/ on the REAL dataset (run with `npm run test:real`; DATA_DIR=../data, relative to web/).
 * The expected figures are derived by the oracle from the dataset files themselves (turnout.csv, votes.csv and cities.csv
 * of 2026 round 2, aggregated by the region of each uf; the overseas posts are national-only) with the largest-remainder
 * rounding rule the page documents. The national totals are, on top, compared against TSE's published totals committed in
 * data/manifest.json ("national_reference"), so no number below is typed by hand. The sentences are the catalog's.
 * Skipped when the data directory is missing.
 */
test.skip(...dataGuard())

const ROUND = { ano: 2026, turno: 2 }
const LULA = '13'
const FLAVIO = '22'

test.describe('brasil on the real dataset', () => {
  test('the national bar: the official overseas-inclusive counts and shares (TSE published totals)', async ({ page }) => {
    const reference = nationalReference(ROUND)
    expect(turnoutSum(ROUND).validos, 'derivation vs data/manifest.json national_reference').toBe(reference.validos)
    expect(candidateVotes(ROUND, LULA)).toBe(reference.candidates[LULA])
    expect(candidateVotes(ROUND, FLAVIO)).toBe(reference.candidates[FLAVIO])

    await page.goto(`${base}brasil/`)
    const bar = page.locator('[data-brasil-bar]')
    const both = [candidateVotes(ROUND, LULA), candidateVotes(ROUND, FLAVIO)]
    const share = (i: number) => shareText(both, i, 2)
    // #91: the bar carries each candidate's share (fitted to the segment); the counts are text under the bar and in each segment's title attribute.
    await expect(bar.locator('span').nth(0)).toHaveText(new RegExp(`^(Lula )?${share(0)}%$`))
    await expect(bar.locator('span').nth(1)).toHaveText(new RegExp(`^(Flávio( Bolsonaro)? )?${share(1)}%$`))
    const votes = (name: string, n: number) => catalogText('brasil.votes', { name, votos: int(n) })
    await expect(page.locator('[data-brasil-votos]')).toHaveText(`${votes('Lula', both[0]!)} · ${votes('Flávio Bolsonaro', both[1]!)}`)
    const titles = await bar.locator('span').evaluateAll((els) => els.map((e) => e.getAttribute('title')))
    expect(titles[0]).toContain(`${votes('', both[0]!).trim()} (${share(0)}%)`)
    expect(titles[1]).toContain(`(${share(1)}%)`)
  })

  test('the five regions show share, candidates, turnout and brancos/nulos as derived from the dataset', async ({ page }) => {
    const all = regions()
    const sums = new Map(all.map((regiao) => [regiao, turnoutSum(ROUND, { regiao })]))
    const regionValidos = all.map((regiao) => sums.get(regiao)!.validos)
    expect(regionValidos.reduce((a, b) => a + b, 0)).toBeLessThan(turnoutSum(ROUND).validos) // the overseas posts stay national-only

    await page.goto(`${base}brasil/`)
    expect(await page.locator('[data-regiao]').count()).toBe(all.length)
    for (const [i, regiao] of all.entries()) {
      const r = sums.get(regiao)!
      const el = page.locator(`[data-regiao="${regiao}"]`)
      await expect(el.getByText(catalogText('brasil.regionShare', { p: shareText(regionValidos, i) }))).toBeVisible()
      const lula = candidateVotes(ROUND, LULA, { regiao })
      const flavio = candidateVotes(ROUND, FLAVIO, { regiao })
      // ONE bar per region (#91); the text of a segment is its name (or the short form) and share, fitted to the segment, never cut
      await expect(el.locator('[data-regiao-bar]')).toHaveCount(1)
      const segs = el.locator('[data-regiao-bar] span')
      await expect(segs.nth(0)).toHaveText(new RegExp(`^(Lula )?${shareText([lula, flavio], 0)}%$`))
      await expect(segs.nth(1)).toHaveText(new RegExp(`^(Flávio( Bolsonaro)? )?${shareText([lula, flavio], 1)}%$`))
      const turnoutParts = [r.comparecimento, r.aptos - r.comparecimento]
      await expect(el.locator('[data-participacao]')).toHaveText(catalogText('brasil.turnout', { c: shareText(turnoutParts, 0), n: shareText(turnoutParts, 1) }))
      await expect(el.locator('[data-brancos-nulos]')).toContainText(
        catalogText('brasil.blanks', { b: shareText([r.brancos, r.comparecimento - r.brancos], 0), n: shareText([r.nulos, r.comparecimento - r.nulos], 0) }),
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