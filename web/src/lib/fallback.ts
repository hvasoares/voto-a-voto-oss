import { matchPattern, paramNames, specificity } from '@site/routes'

/** Every route of the site (site/README.md "Routes"). Pages are ported to Astro one ticket at a time (#50). */
export const KNOWN_ROUTES = [
  '/',
  '/:uf/',
  '/:uf/:slug/',
  '/:uf/:slug/compartilhar/',
  '/:uf/:slug/qr/',
  '/:uf/:slug/tres-ciclos/',
  '/brasil/',
  '/brasil/:regiao/',
  '/mapa/',
  '/mapa/virada/',
  '/comparar/2022/',
  '/comparar/2018/',
  '/relatorios/',
  '/relatorios/cidades-que-viraram/',
  '/relatorios/como-cada-grupo-votou/',
  '/relatorios/:report/',
  '/tres-ciclos/:uf/',
  '/sobre-os-dados/',
] as const

export interface FallbackData {
  states: string[]
  cities: { uf: string; slug: string }[]
}

export type Classified = { kind: 'valid'; route: string } | { kind: 'not-found' }

/** Is this path a valid route (params exist in the data) even though no file was pre-rendered for it? */
export function classifyPath(path: string, data: FallbackData): Classified {
  const ordered = [...KNOWN_ROUTES].sort((a, b) => specificity(b) - specificity(a))
  for (const route of ordered) {
    const params = matchPattern(route, path)
    if (!params) continue
    const names = paramNames(route)
    const ok =
      names.length === 0 ||
      (names.length === 1 && names[0] === 'uf' && data.states.includes(params.uf!)) ||
      (names.length === 2 && names[0] === 'uf' && names[1] === 'slug' && data.cities.some((c) => c.uf === params.uf && c.slug === params.slug))
    // :report and :regiao routes are valid only when their page declares the values (ported in #50 and later).
    return ok ? { kind: 'valid', route } : { kind: 'not-found' }
  }
  return { kind: 'not-found' }
}
