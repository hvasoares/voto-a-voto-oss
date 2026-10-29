import { expect, test, type Page } from '@playwright/test'
import { base } from './helpers'

/*
 * The screen-group sheets (#119). A page that renders a group loads that group's sheet AFTER the shared one, because a group rule that
 * ties a shared rule on specificity must keep winning by coming later (the same order it had in the one stylesheet); a page that does
 * not render the group does not load its rules at all (that is the point of the split). `src/styles/groups.test.ts` keeps the files
 * and the imports; this spec keeps what the browser does with them.
 */

/** Index, in `document.styleSheets`, of the first sheet that has a rule with this exact selector (-1 when none). */
async function sheetOf(page: Page, selector: string): Promise<number> {
  return page.evaluate((sel) => {
    const has = (rules: CSSRuleList): boolean =>
      [...rules].some((r) => (r instanceof CSSStyleRule ? r.selectorText.split(',').some((s) => s.trim() === sel) : 'cssRules' in r && has((r as CSSGroupingRule).cssRules)))
    return [...document.styleSheets].findIndex((s) => has(s.cssRules))
  }, selector)
}

// [path, a rule only the group owns, a rule only the shared sheet owns]
const PAGES: [string, string, string][] = [
  ['rj/cidade-exemplo/', '.city-share', '.page__title'],
]

for (const [path, groupRule, sharedRule] of PAGES) {
  test(`the group sheet comes after the shared one: ${path}`, async ({ page }) => {
    await page.goto(`${base}${path}`)
    const group = await sheetOf(page, groupRule)
    const shared = await sheetOf(page, sharedRule)
    expect(group, `${groupRule} is in a sheet of the page`).toBeGreaterThanOrEqual(0)
    expect(shared, `${sharedRule} is in a sheet of the page`).toBeGreaterThanOrEqual(0)
    expect(group, `${groupRule} comes after ${sharedRule}`).toBeGreaterThan(shared)
  })
}

test('a page that renders no group does not load the group rules', async ({ page }) => {
  for (const path of ['', 'mapa/', 'relatorios/cidades-que-viraram/', 'rj/', 'rj/cidade-exemplo/tres-ciclos/']) {
    await page.goto(`${base}${path}`)
    for (const [, groupRule] of PAGES) expect(await sheetOf(page, groupRule), `${groupRule} on /${path}`).toBe(-1)
  }
})
