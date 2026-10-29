/**
 * The demo pages rule (ticket #137): the two stand-in screens `/qr/` and `/compartilhar/` stay noindex and unlinked.
 *
 *  1. both emit `<meta name="robots" content="noindex…">`;
 *  2. no other built page links to either (their hrefs are scanned; the two demos may link each other: that is the demo flow);
 *  3. neither is listed in a sitemap, if the build generates one.
 *
 * Pure over the built files (`relative path -> text`), so the test can seed a violation in a fixture and watch it go red, then run
 * the same function over the real build. The messages name the page and the rule.
 */

/** The demo pages, by built path. */
export const DEMO_PAGES = ['qr/index.html', 'compartilhar/index.html'] as const

const HREF = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/g
const ROBOTS_NOINDEX = /<meta\s+name="robots"\s+content="noindex/

/** The demo a link points at ('qr/' or 'compartilhar/'), or undefined: only the exact demo route behind the base counts, never a city's. */
function demoTarget(href: string, base: string): string | undefined {
  const path = href.replace(/[?#].*$/, '').replace(/index\.html$/, '')
  return DEMO_PAGES.map((p) => p.replace('index.html', '')).find((demo) => path === `${base}${demo}` || path === `${base}${demo}`.replace(/\/$/, ''))
}

/**
 * Every problem of the built pages (`pages`: html files by path relative to the build root) and sitemaps (`sitemaps`: xml files by path).
 * `base` is the build's base path ('/' or '/voto-a-voto-oss/').
 */
export function demoPageProblems(pages: Record<string, string>, base: string, sitemaps: Record<string, string> = {}): string[] {
  const problems: string[] = []
  for (const demo of DEMO_PAGES) {
    const html = pages[demo]
    if (html === undefined) problems.push(`${demo}: the demo page is not built`)
    else if (!ROBOTS_NOINDEX.test(html)) problems.push(`${demo}: the demo page must emit <meta name="robots" content="noindex"> (draw it with the noindex prop of Base)`)
  }
  for (const [path, html] of Object.entries(pages)) {
    if ((DEMO_PAGES as readonly string[]).includes(path)) continue
    for (const m of html.matchAll(HREF)) {
      const target = demoTarget(m[1] ?? m[2] ?? '', base)
      if (target) problems.push(`${path}: links to the demo page ${base}${target} (href="${m[1] ?? m[2]}"); the demos are linked from nowhere but each other`)
    }
  }
  for (const [path, xml] of Object.entries(sitemaps))
    for (const m of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) {
      const target = demoTarget(m[1]!.replace(/^[a-z]+:\/\/[^/]+/i, ''), base)
      if (target) problems.push(`${path}: lists the demo page ${base}${target}; the demos stay out of the sitemap`)
    }
  return problems
}
