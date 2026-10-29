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

/**
 * The base-path link helper of ticket #113 (pure; the base is injected). The link semantics a page needs:
 *  - hash-only hrefs ('#topo'), absolute URLs, protocol-relative ('//cdn/x') and scheme hrefs (mailto:, tel:)
 *    pass through untouched;
 *  - an href already carrying the base ('/voto-a-voto-oss/x' with base '/voto-a-voto-oss/') is returned as is
 *    (idempotent — never double-prefixed);
 *  - a leading slash is optional on input; a query/hash tail ('?x=1#y') stays attached after the prefix;
 *  - an empty string means the site root: it returns the normalized base.
 * Pages call `siteHref`; islands that receive the base as a prop call `linkHref(href, base)` (the legacy
 * `withBase(base, path)` was removed by the contract step, #117).
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
 * The site base ('/' or '/voto-a-voto-oss/'): the ONLY reader of `import.meta.env.BASE_URL` (#113, enforced by
 * the guard of #117). A page that hands the base to an island or a `data-base` attribute reads it here:
 * `const base = siteBase()`.
 */
export function siteBase(): string {
  return normalizeBase(import.meta.env.BASE_URL)
}

/** `linkHref` with the site base injected: pages link with `siteHref('relatorios/')`. */
export function siteHref(href: string): string {
  return linkHref(href, siteBase())
}

/** Inverse of linkHref for a location pathname. Always returns a path with a leading and trailing slash. */
export function stripBase(base: string, pathname: string): string {
  const b = normalizeBase(base)
  let p = pathname
  if (b !== '/' && (p === b.slice(0, -1) || p.startsWith(b))) p = '/' + p.slice(b.length)
  p = p.replace(/\/index\.html$/, '/')
  if (!p.startsWith('/')) p = '/' + p
  if (!p.endsWith('/') && !/\.[a-z0-9]+$/i.test(p)) p += '/'
  return p
}
