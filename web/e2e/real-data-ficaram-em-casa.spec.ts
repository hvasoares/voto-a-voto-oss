import { expect, test } from '@playwright/test'
import { base } from './helpers'
import { dataGuard } from './presets'
import { catalogText, dec1, latestRound, nonVoterPct, nonVotersBeyondMarginPct, rounds } from './real-data-oracle'

/*
 * "Ficaram em casa" (#32) on the REAL dataset (run with `npm run test:real`). The claim of each cycle and round is the share of the cities (no overseas)
 * where the people who voted for nobody outnumber the votes between the two first candidates, and each tile is a state's share of non-voters: both are
 * counted by the oracle from the data directory's turnout.csv and votes.csv; the sentences are the catalog's (docs/nonvoters-vs-margin.md explains the claim).
 */
test.skip(...dataGuard())

const PATH = `${base}mapa/ficaram-em-casa/`
/** The default page shows the first round of the newest cycle; the others live under `<ano>-<turno>/`. */
const slugOf = (r: { ano: number; turno: number }) => (r.ano === latestRound().ano && r.turno === 1 ? '' : `${r.ano}-${r.turno}/`)
const CLAIMS = rounds()

test.describe('Ficaram em casa on the real dataset', () => {
  test('27 states, no overseas, a percentage on each tile, SP first with the note figures', async ({ page }) => {
    await page.goto(PATH)
    const ufs = await page.locator('[data-slot="state-map"] nav a[data-uf]').evaluateAll((els) => els.map((e) => e.getAttribute('data-uf')!))
    expect(ufs).toHaveLength(27)
    expect(ufs).not.toContain('zz')
    const round = { ano: latestRound().ano, turno: 1 }
    for (const uf of ['sp', 'ac', 'df']) await expect(page.locator(`a[data-uf="${uf}"]`, { hasText: uf.toUpperCase() })).toContainText(`${dec1(nonVoterPct(round, { uf }))}%`)
    await expect(page.locator('[data-slot="mapa-selecionado"]')).toContainText(catalogText('stayhome.selected', { uf: 'SP' }))
  })

  for (const round of CLAIMS) {
    const { ano, turno } = round
    test(`${ano}, ${turno}º turno: the claim is the share of the cities, with its limits`, async ({ page }) => {
      const claim = catalogText('stayhome.claim', { pct: dec1(nonVotersBeyondMarginPct(round)), turno: catalogText(`stayhome.turno.${turno as 1 | 2}`), ano })
      await page.goto(`${PATH}${slugOf(round)}`)
      await expect(page.locator('[data-slot="stayhome-claim"]')).toContainText(claim)
      await expect(page.locator('[data-slot="stayhome-claim"]')).toContainText(catalogText('stayhome.claim.limits'))
      await expect(page.locator('main')).not.toContainText(/em todo o país|na maioria das cidades/)
    })
  }
})
