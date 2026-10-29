import { test } from '@playwright/test'
import { capture } from './capture'
import { base } from './helpers'

/*
 * Screenshot source for the review of the reports screens (tickets #12 and #13): 390x844, fullPage
 * and the open viewport. Output: web/.captures/reports/ (not committed, no baselines); review
 * follows site/docs/screenshot-review-protocol.md against site/reference/06-relatorios.png and
 * 07-cidades-que-viraram.png. The real-data state is captured by reports-real-data.spec.ts.
 */
const SHOTS = [
  { slot: 'reports-hub', route: 'relatorios/', reference: 'site/reference/06-relatorios.png' },
  { slot: 'cidades-que-viraram', route: 'relatorios/cidades-que-viraram/', reference: 'site/reference/07-cidades-que-viraram.png' },
  { slot: 'maiores-viradas', route: 'relatorios/maiores-viradas/', reference: 'site/reference/07-cidades-que-viraram.png' },
  { slot: 'votos-ganhos-e-perdidos', route: 'relatorios/votos-ganhos-e-perdidos/', reference: 'site/reference/07-cidades-que-viraram.png' },
  { slot: 'disputas-mais-apertadas', route: 'relatorios/disputas-mais-apertadas/', reference: 'site/reference/07-cidades-que-viraram.png' },
  { slot: 'comparecimento', route: 'relatorios/comparecimento/', reference: 'site/reference/07-cidades-que-viraram.png' },
]

for (const { slot, route, reference } of SHOTS) {
  test(`capture reports / ${slot} / phone full page`, async ({ page }) => {
    await page.goto(base + route)
    await page.evaluate(() => window.scrollTo(0, 0))
    await capture(page, {
      dir: 'reports/fixture',
      name: `${slot}-phone-full`,
      route: base + route,
      scrollY: 'page',
      fullPage: true,
      omit: ['capture'],
      extra: { slot, state: 'fixture', reference },
    })
  })

  test(`capture reports / ${slot} / phone open viewport`, async ({ page }) => {
    await page.goto(base + route)
    await page.evaluate(() => window.scrollTo(0, 0))
    await capture(page, {
      dir: 'reports/fixture',
      name: `${slot}-phone-844`,
      route: base + route,
      scrollY: 'page',
      fullPage: false,
      omit: ['capture'],
      extra: { slot, state: 'fixture', reference },
    })
  })
}
