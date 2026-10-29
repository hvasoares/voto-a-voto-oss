import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ANCHORS, GROUPS, groupOfRule, inGroup, styleRules, type Group } from './groups'

const read = (file: string) => readFileSync(join('src/styles', file), 'utf8')

/** Every source file that renders markup (not a test, not a stylesheet). */
function sources(dir = 'src'): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === 'styles' ? [] : sources(path)
    return /\.(astro|ts|tsx)$/.test(name) && !/\.test\./.test(name) ? [path] : []
  })
}

describe('screen groups (#119): a group sheet holds its group, the shared sheet holds the rest', () => {
  it.each(GROUPS)('%s.css exists and every selector in it starts with its own prefix', (group) => {
    expect(existsSync(join('src/styles', `${group}.css`)), `src/styles/${group}.css`).toBe(true)
    const selectors = styleRules(read(`${group}.css`)).flat()
    expect(selectors.length).toBeGreaterThan(0)
    expect(selectors.filter((s) => !inGroup(s, group))).toEqual([])
  })

  it('screens.css holds no rule that belongs to a group (a list that names two groups is shared, and stays)', () => {
    expect(styleRules(read('screens.css')).filter((selectors) => groupOfRule(selectors)).map((selectors) => selectors.join(', '))).toEqual([])
  })

  it.each(GROUPS)('every file that renders the %s page imports its sheet', (group: Group) => {
    const anchor = new RegExp(`(?<![\\w-])${ANCHORS[group]}(?![\\w-])`)
    const renderers = sources().filter((f) => anchor.test(readFileSync(f, 'utf8')))
    expect(renderers.length, `a file renders .${ANCHORS[group]}`).toBeGreaterThan(0)
    const missing = renderers.filter((f) => !new RegExp(`import ['"][^'"]*styles/${group}\\.css['"]`).test(readFileSync(f, 'utf8')))
    expect(missing).toEqual([])
  })

  // Astro links a component's sheet BEFORE the layout's global.css unless the component imports global.css itself first
  // (seen on the city card); the group rules rely on coming later than the shared ones when they tie on specificity.
  it.each(GROUPS)('the %s sheet is imported right after global.css, which pins its place after the shared sheet', (group: Group) => {
    const anchor = new RegExp(`(?<![\\w-])${ANCHORS[group]}(?![\\w-])`)
    const pinned = new RegExp(`import ['"][^'"]*styles/global\\.css['"]\\n\\s*import ['"][^'"]*styles/${group}\\.css['"]`)
    const unpinned = sources().filter((f) => anchor.test(readFileSync(f, 'utf8')) && !pinned.test(readFileSync(f, 'utf8')))
    expect(unpinned).toEqual([])
  })

  it('global.css still imports the shared sheet after the scale, and no group sheet', () => {
    const global = read('global.css')
    expect(global).toMatch(/@import "\.\/scale\.css";\s*@import "\.\/screens\.css";/)
    for (const group of GROUPS) expect(global).not.toContain(`${group}.css`)
  })
})
