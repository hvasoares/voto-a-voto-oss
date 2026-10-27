/**
 * Route patterns: '/:uf/:slug/compartilhar/'. Real paths, trailing slash, no hash routes.
 * `:uf` only matches a two-letter code, so it never swallows '/brasil/' or '/mapa/'.
 */
export type Params = Record<string, string>

const PARAM_RULES: Record<string, RegExp> = { uf: /^[a-z]{2}$/ }

const segments = (p: string) => p.split('/').filter(Boolean)

export function matchPattern(pattern: string, path: string): Params | null {
  const pat = segments(pattern)
  const got = segments(path)
  if (pat.length !== got.length) return null
  const params: Params = {}
  for (const [i, seg] of pat.entries()) {
    const value = got[i]!
    if (seg.startsWith(':')) {
      const name = seg.slice(1)
      const rule = PARAM_RULES[name]
      if (rule && !rule.test(value)) return null
      params[name] = decodeURIComponent(value)
    } else if (seg !== value) return null
  }
  return params
}

/** More static segments first, so '/relatorios/cidades-que-viraram/' wins over '/relatorios/:report/'. */
export function specificity(pattern: string): number {
  return segments(pattern).filter((s) => !s.startsWith(':')).length
}

export function fillPattern(pattern: string, params: Params): string {
  const out = segments(pattern).map((s) => {
    if (!s.startsWith(':')) return s
    const v = params[s.slice(1)]
    if (v === undefined) throw new Error(`missing param ${s} for ${pattern}`)
    return encodeURIComponent(v)
  })
  return '/' + out.join('/') + (out.length ? '/' : '')
}

export function paramNames(pattern: string): string[] {
  return segments(pattern).filter((s) => s.startsWith(':')).map((s) => s.slice(1))
}
