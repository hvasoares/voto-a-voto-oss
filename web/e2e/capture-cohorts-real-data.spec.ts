import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from '@playwright/test'
import { base } from './helpers'
import { dataGuard } from './presets'

/*
 * Real-data screenshot of the cohort report (ticket #15), taken by `npm run test:real`
 * (DATA_DIR=../data builds and serves the real dataset). Skipped anywhere else.
 */
test.skip(...dataGuard('cities.csv', process.env.DATA_DIR === '../data' ? '../data' : null))

test('capture cohorts on the real dataset / phone full page', async ({ page }) => {
  await page.goto(base + 'relatorios/como-cada-grupo-votou/')
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(() => window.scrollTo(0, 0))
  const dir = resolve('.captures', 'cohorts')
  mkdirSync(dir, { recursive: true })
  const file = resolve(dir, 'phone-real-data.png')
  await page.screenshot({ path: file, animations: 'disabled', fullPage: true })
  writeFileSync(
    resolve(dir, 'phone-real-data.json'),
    JSON.stringify({ slot: 'cohorts', state: 'real-data', route: base + 'relatorios/como-cada-grupo-votou/', viewport: page.viewportSize(), scrollY: await page.evaluate(() => window.scrollY), fullPage: true, reference: 'site/reference/12-como-cada-grupo-votou.png', capture: file }, null, 2) + '\n',
  )
})