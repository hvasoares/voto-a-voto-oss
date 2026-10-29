/**
 * The screen groups of the stylesheets (ticket #119). `screens.css` is the SHARED sheet of the screens (the page frame, the bars,
 * the legend, the tabs, the footer, the seal: what several groups reuse); a group's own rules live in the file named after its
 * class prefix, and the component that renders the group's markup imports that file (the way `fact.css` is imported by the fact
 * page), so Astro links it only on the pages that use it. No page-to-sheet table exists anywhere.
 *
 * The rule, and the test that keeps it (`groups.test.ts`): every selector of `<name>.css` starts with `.<name>`, and `screens.css`
 * holds no RULE whose selectors all start with one group's prefix (a list that names two groups stays). A selector may be scoped by a leading `.screen ` (the frame class of the
 * screens); the scope does not count. New rules for a group land in its file; a rule two groups share (a selector list that names
 * both, a class two groups render) stays in `screens.css`.
 *
 * WHAT MAKES A GROUP: a sheet Astro LINKS. Astro inlines a stylesheet under 4 KB (built size) as a `<style>` in the page head,
 * and the inline `<style>` comes BEFORE the shared `<link>`; a group rule that ties a shared rule on specificity would then lose
 * where it used to win (one file, later line). So a group is a prefix whose rules are big enough to be linked, and a component
 * imports `global.css` right before the group sheet to pin the order (without it Astro linked the city sheet first). The state
 * (2.7 KB) and three-cycles (3.4 KB) rules, measured in #119, are below the line and stay in `screens.css`; `e2e/css-groups.spec.ts`
 * fails a group whose sheet is not linked after the shared one.
 */

/** A group is a class prefix: `city` owns `.city-*`. (`cycle` would own `.cycle` and `.cycles-*`, `state` would own `.state-*`.) */
export const GROUPS = ['city'] as const
export type Group = (typeof GROUPS)[number]

/** The class on the root element of a group's page: a file that renders it must import the group's sheet. */
export const ANCHORS: Record<Group, string> = { city: 'city-page' }

const stripComments = (css: string): string => css.replace(/\/\*[\s\S]*?\*\//g, '')

/** Every style rule, at any depth (inside @media, @layer), as its list of selectors (comma lists split, comments removed). */
export function styleRules(css: string): string[][] {
  const out: string[][] = []
  const text = stripComments(css)
  let start = 0
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '{') {
      const prelude = text.slice(start, i).trim()
      if (!prelude.startsWith('@')) out.push(prelude.split(',').map((s) => s.trim()))
      start = i + 1
    } else if (c === '}' || c === ';') start = i + 1
  }
  return out
}

/** The selector without the screens' frame scope. */
export const unscoped = (selector: string): string => selector.replace(/^\.screen\s+/, '')

/** Whether a selector starts with the group's prefix. */
export const inGroup = (selector: string, group: Group): boolean => unscoped(selector).startsWith(`.${group}`)

/** The group a rule belongs to: every selector of its list starts with that group's prefix (a list that names two groups has none). */
export const groupOfRule = (selectors: string[]): Group | undefined => GROUPS.find((g) => selectors.every((s) => inGroup(s, g)))
