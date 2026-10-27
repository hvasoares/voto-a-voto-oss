/**
 * The address of a city page, as a recipient taps it. Build-time setting `SITE_ORIGIN` (scheme and host, no path),
 * default `https://votoavoto.exemplo.br` (the address drawn in the Sketch frame, fine for fixtures). The real origin is
 * set when building for production: `SITE_ORIGIN=https://votoavoto.org.br SITE_BASE=/ npm run build`. The build bakes
 * the value into the pages and islands so client-side renders agree with the pre-rendered ones. The base path
 * (`SITE_BASE`) is added after the origin.
 */
export const DEFAULT_SITE_ORIGIN = 'https://votoavoto.exemplo.br'

export function siteOrigin(): string {
  const raw = process.env.SITE_ORIGIN
  const value = (raw ?? '').trim().replace(/\/+$/, '')
  if (!value) return DEFAULT_SITE_ORIGIN
  if (!/^https?:\/\/[^/\s?#]+$/i.test(value)) throw new Error(`SITE_ORIGIN must be a scheme and host such as https://votoavoto.org.br (got "${raw}")`)
  return value
}

/** `https://votoavoto.exemplo.br/voto-a-voto/rj/cidade-exemplo/` */
export function cityUrl(origin: string, base: string, uf: string, slug: string): string {
  const b = base.endsWith('/') ? base : `${base}/`
  return `${origin}${b.startsWith('/') ? b : `/${b}`}${uf}/${slug}/`
}