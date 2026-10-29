/**
 * The table-driven contract of the base-path link helper (ticket #113): every row runs for both supported
 * bases, SITE_BASE '/' and the GitHub Pages '/voto-a-voto-oss/'. The table text is the one the ticket pins;
 * change a row only with a new owner decision there.
 */
import { describe, expect, it } from 'vitest'
import { linkHref, normalizeBase, siteBase, siteHref, stripBase } from './paths'

const ROOT = '/'
const OSS = '/voto-a-voto-oss/'

describe('linkHref (the #113 table, both bases)', () => {
  it.each([
    // input, base `/`, base `/voto-a-voto-oss/`
    ['/relatorios/', '/relatorios/', '/voto-a-voto-oss/relatorios/'],
    ['relatorios/', '/relatorios/', '/voto-a-voto-oss/relatorios/'],
    ['/', '/', '/voto-a-voto-oss/'],
    ['/sobre#dados', '/sobre#dados', '/voto-a-voto-oss/sobre#dados'],
    ['/sobre/?x=1#y', '/sobre/?x=1#y', '/voto-a-voto-oss/sobre/?x=1#y'],
    ['#topo', '#topo', '#topo'],
    ['https://example.org/x', 'https://example.org/x', 'https://example.org/x'],
    ['//cdn/x', '//cdn/x', '//cdn/x'],
    ['mailto:a@b', 'mailto:a@b', 'mailto:a@b'],
    ['tel:1', 'tel:1', 'tel:1'],
    // already prefixed: idempotent, never double-prefixed
    ['/voto-a-voto-oss/x', '/voto-a-voto-oss/x', '/voto-a-voto-oss/x'],
    // trailing slash present or absent: preserved exactly as given
    ['/sobre', '/sobre', '/voto-a-voto-oss/sobre'],
    ['/sobre/', '/sobre/', '/voto-a-voto-oss/sobre/'],
  ])('%s', (input, atRoot, atOss) => {
    expect(linkHref(input, ROOT)).toBe(atRoot)
    expect(linkHref(input, OSS)).toBe(atOss)
  })

  it('a base without a trailing slash is normalised, same result', () => {
    expect(linkHref('/relatorios/', '/voto-a-voto-oss')).toBe('/voto-a-voto-oss/relatorios/')
    expect(linkHref('/', 'voto-a-voto-oss')).toBe('/voto-a-voto-oss/')
  })

  it('an empty string means the site root (the normalized base) — decided in #113', () => {
    expect(linkHref('', ROOT)).toBe('/')
    expect(linkHref('', OSS)).toBe('/voto-a-voto-oss/')
    expect(linkHref('', 'voto-a-voto-oss')).toBe('/voto-a-voto-oss/')
  })

  it.each([
    ['/', '/', '/voto-a-voto-oss/'],
    ['/rj/', '/rj/', '/voto-a-voto-oss/rj/'],
    ['relatorios/', '/relatorios/', '/voto-a-voto-oss/relatorios/'],
    ['/sobre-os-dados/#privacidade', '/sobre-os-dados/#privacidade', '/voto-a-voto-oss/sobre-os-dados/#privacidade'],
    ['/#comparar', '/#comparar', '/voto-a-voto-oss/#comparar'],
    ['data/v1/city/rj/x.json', '/data/v1/city/rj/x.json', '/voto-a-voto-oss/data/v1/city/rj/x.json'],
  ])('the plain paths the pre-#113 withBase built (removed in #117) still resolve: %s', (p, atRoot, atOss) => {
    expect(linkHref(p, ROOT)).toBe(atRoot)
    expect(linkHref(p, OSS)).toBe(atOss)
  })

  it('a bare path equal to the base (no trailing slash) is idempotent too', () => {
    expect(linkHref('/voto-a-voto-oss', OSS)).toBe('/voto-a-voto-oss')
  })
})

describe('siteHref (the thin wrapper)', () => {
  it('injects the ambient build base (vitest builds at "/")', () => {
    expect(import.meta.env.BASE_URL).toBe('/')
    expect(siteHref('/relatorios/')).toBe(linkHref('/relatorios/', '/'))
    expect(siteHref('#topo')).toBe('#topo')
  })

  it('siteBase is the normalized ambient base, the one reader of BASE_URL', () => {
    expect(siteBase()).toBe('/')
  })
})

describe('normalizeBase / stripBase (pre-#113 helpers, unchanged)', () => {
  it('normalizeBase pins the slash rules linkHref relies on', () => {
    expect(normalizeBase(undefined)).toBe('/')
    expect(normalizeBase('')).toBe('/')
    expect(normalizeBase('voto-a-voto-oss')).toBe('/voto-a-voto-oss/')
  })

  it('stripBase stays the inverse for a pathname', () => {
    expect(stripBase('/voto-a-voto-oss/', '/voto-a-voto-oss/rj/')).toBe('/rj/')
  })
})
