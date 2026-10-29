import { test } from '@playwright/test'
import { capture } from './capture'
import { base } from './helpers'
import { useNoJs } from './presets'

/*
 * Screenshot source for the review of /relatorios/como-cada-grupo-votou/ (ticket #15): phone 390x844
 * fullPage (the reference frame is site/reference/12-como-cada-grupo-votou.png) and desktop. Output:
 * web/.captures/cohorts/ (not committed). Default build = fixture data; the no-JS state re-shot with
 * JavaScript off (the page is static, so no-JS renders identically) and the EXEMPLO banner visible.
 */
test('capture cohorts / phone full page', async ({ page }) => {
  await page.goto(base + 'relatorios/como-cada-grupo-votou/')
  await page.evaluate(() => window.scrollTo(0, 0))
  await capture(page, {
    dir: 'cohorts',
    name: 'phone-full',
    route: base + 'relatorios/como-cada-grupo-votou/',
    scrollY: 'page',
    fullPage: true,
    extra: { slot: 'cohorts', state: 'default', reference: 'site/reference/12-como-cada-grupo-votou.png' },
  })
})

test.describe('cohorts without JavaScript', () => {
  useNoJs()
  test('capture cohorts / without JavaScript', async ({ page }) => {
    await page.goto(base + 'relatorios/como-cada-grupo-votou/')
    await capture(page, {
      dir: 'cohorts',
      name: 'phone-nojs',
      route: base + 'relatorios/como-cada-grupo-votou/',
      fullPage: true,
      extra: { slot: 'cohorts', state: 'no-js', reference: 'site/reference/12-como-cada-grupo-votou.png' },
    })
  })
})
