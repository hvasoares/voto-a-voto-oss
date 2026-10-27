import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from '@playwright/test'
import { base } from './helpers'

/*
 * Screenshot source for the review of /relatorios/como-cada-grupo-votou/ (ticket #15): phone 390x844
 * fullPage (the reference frame is site/reference/12-como-cada-grupo-votou.png) and desktop. Output:
 * web/.captures/cohorts/ (not committed). Default build = fixture data; the no-JS state re-shot with
 * JavaScript off (the page is static, so no-JS renders identically) and the EXEMPLO banner visible.
 */
test('capture cohorts / phone full page', async ({ page }) => {
  await page.goto(base + 'relatorios/como-cada-grupo-votou/')
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(() => window.scrollTo(0, 0))
  const dir = resolve('.captures', 'cohorts')
  mkdirSync(dir, { recursive: true })
  const file = resolve(dir, 'phone-full.png')
  await page.screenshot({ path: file, animations: 'disabled', fullPage: true })
  writeFileSync(
    resolve(dir, 'phone-full.json'),
    JSON.stringify({ slot: 'cohorts', state: 'default', route: base + 'relatorios/como-cada-grupo-votou/', viewport: page.viewportSize(), scrollY: await page.evaluate(() => window.scrollY), fullPage: true, reference: 'site/reference/12-como-cada-grupo-votou.png', capture: file }, null, 2) + '\n',
  )
})

test.describe('cohorts without JavaScript', () => {
  test.use({ javaScriptEnabled: false })
  test('capture cohorts / without JavaScript', async ({ page }) => {
    await page.goto(base + 'relatorios/como-cada-grupo-votou/')
    await page.evaluate(() => document.fonts.ready)
    const dir = resolve('.captures', 'cohorts')
    mkdirSync(dir, { recursive: true })
    const file = resolve(dir, 'phone-nojs.png')
    await page.screenshot({ path: file, animations: 'disabled', fullPage: true })
    writeFileSync(
      resolve(dir, 'phone-nojs.json'),
      JSON.stringify({ slot: 'cohorts', state: 'no-js', route: base + 'relatorios/como-cada-grupo-votou/', viewport: page.viewportSize(), fullPage: true, reference: 'site/reference/12-como-cada-grupo-votou.png', capture: file }, null, 2) + '\n',
    )
  })
})