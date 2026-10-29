/**
 * Base-path helpers. The site may be served at "/" (custom domain, local) or at
 * "/voto-a-voto/" (GitHub Pages project site). Every internal link and every
 * data fetch goes through these helpers so the base is set in ONE place
 * (env SITE_BASE at build time).
 */

export function normalizeBase(base: string | undefined): string {
  let b = (base ?? '/').trim() || '/'
  if (!b.startsWith('/')) b = '/' + b
  if (!b.endsWith('/')) b += '/'
  return b
}

/** `withBase('/', '/rj/')` -> '/rj/'; `withBase('/voto-a-voto/', '/rj/')` -> '/voto-a-voto/rj/' */
export function withBase(base: string, path: string): string {
  const p = path.startsWith('/') ? path.slice(1) : path
  return normalizeBase(base) + p
}

/**
 * The base-path link helper of ticket #113 (pure; the base is injected). Everything `withBase` does for plain
 * paths, plus the link semantics a page needs:
 *  - hash-only hrefs ('#topo'), absolute URLs, protocol-relative ('//cdn/x') and scheme hrefs (mailto:, tel:)
 *    pass through untouched;
 *  - an href already carrying the base ('/voto-a-voto-oss/x' with base '/voto-a-voto-oss/') is returned as is
 *    (idempotent — never double-prefixed);
 *  - a leading slash is optional on input; a query/hash tail ('?x=1#y') stays attached after the prefix;
 *  - an empty string means the site root: it returns the normalized base.
 * `withBase(base, path)` above is the legacy argument order the pre-#113 pages call; #114/#115/#116 migrate
 * those callers here, then the contract step removes it.
 */
const ABSOLUTE_OR_SCHEME = /^([a-zA-Z][a-zA-Z0-9+.-]*:|\/\/)/

export function linkHref(href: string, base: string): string {
  const b = normalizeBase(base)
  if (href === '') return b
  if (href.startsWith('#') || ABSOLUTE_OR_SCHEME.test(href)) return href
  const m = /^([^?#]*)([?#][\s\S]*)?$/.exec(href)!
  const path = m[1]!
  const tail = m[2] ?? ''
  if (b !== '/' && (path === b.slice(0, -1) || path.startsWith(b))) return href
  const rel = path.startsWith('/') ? path.slice(1) : path
  return b + rel + tail
}

/**
 * `linkHref` with the site base injected: the ONLY reader of `import.meta.env.BASE_URL` going forward (#113).
 * New code links with `siteHref('relatorios/')`; the per-page `const base = normalizeBase(...)` closures are
 * the pre-#113 pattern the migrate tickets replace one page at a time.
 */
export function siteHref(href: string): string {
  return linkHref(href, normalizeBase(import.meta.env.BASE_URL))
}

/** Inverse of withBase for a location pathname. Always returns a path with a leading and trailing slash. */
export function stripBase(base: string, pathname: string): string {
  const b = normalizeBase(base)
  let p = pathname
  if (b !== '/' && (p === b.slice(0, -1) || p.startsWith(b))) p = '/' + p.slice(b.length)
  p = p.replace(/\/index\.html$/, '/')
  if (!p.startsWith('/')) p = '/' + p
  if (!p.endsWith('/') && !/\.[a-z0-9]+$/i.test(p)) p += '/'
  return p
}
