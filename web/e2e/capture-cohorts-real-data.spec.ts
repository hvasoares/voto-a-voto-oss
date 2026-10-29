import { test } from '@playwright/test'
import { capture } from './capture'
import { base } from './helpers'
import { dataGuard } from './presets'

/*
 * Real-data screenshot of the cohort report (ticket #15), taken by `npm run test:real`
 * (DATA_DIR=../data builds and serves the real dataset). Skipped anywhere else.
 */
test.skip(...dataGuard('cities.csv', process.env.DATA_DIR === '../data' ? '../data' : null))

test('capture cohorts on the real dataset / phone full page', async ({ page }) => {
  await page.goto(base + 'relatorios/como-cada-grupo-votou/')
  await page.evaluate(() => window.scrollTo(0, 0))
  await capture(page, {
    dir: 'cohorts',
    name: 'phone-real-data',
    route: base + 'relatorios/como-cada-grupo-votou/',
    scrollY: 'page',
    fullPage: true,
    extra: { slot: 'cohorts', state: 'real-data', reference: 'site/reference/12-como-cada-grupo-votou.png' },
  })
})
