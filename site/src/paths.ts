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
