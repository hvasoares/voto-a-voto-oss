import { matchPattern, paramNames, specificity } from '@/routes'

/*
 * Every route of the site, complete by construction (#110): one entry per page template of src/pages, plus
 * the two declared-but-unported patterns of KNOWN_ROUTES_EXTRA (web/e2e/routes-inventory.ts, the single
 * owner of the examples and exclusions). The guard (web/integrations/routes-inventory.test.ts) derives the
 * templates from the page files and fails naming any template missing here or any entry with no page
 * behind it. Static, because the 404 classifier ships to the browser and cannot walk the filesystem.
 * `/comparar/:ciclo/` stands for the two ported cycles: both are pre-rendered, so the classifier only ever
 * meets an unknown ciclo, which it keeps rejecting (#50: a param page is valid only when its page declares
 * the values).
 */
export const KNOWN_ROUTES = [
  '/',
  '/:uf/',
  '/:uf/:slug/',
  '/:uf/:slug/compartilhar/',
  '/:uf/:slug/qr/',
  '/:uf/:slug/tres-ciclos/',
  '/:uf/historia/',
  '/:uf/resumo/',
  '/abrir-cartao/',
  '/adivinhe/',
  '/api/',
  '/brasil/',
  '/brasil/:regiao/',
  '/brasil/compartilhar/',
  '/brasil/qr/',
  '/cara-a-cara/',
  '/comparar/:ciclo/',
  '/compartilhar/',
  '/dados-para-nerds/',
  '/dados-para-nerds/estado/:uf/',
  '/dados-para-nerds/geometria/',
  '/dados-para-nerds/regiao/:regiao/',
  '/edicoes/',
  '/edicoes/:id/',
  '/embed/:uf/:slug/',
  '/fale-sem-errar/',
  '/fato/:path*/',
  '/fragmentos/mapa-por-estado/ficaram-em-casa/:ciclo/',
  '/fragmentos/mapa-por-estado/margem/',
  '/fragmentos/mapa-por-estado/virada/',
  '/fragmentos/mapa-uf/',
  '/gerador/',
  '/imprensa/',
  '/imprensa/cartaz/:uf/',
  '/imprensa/folha/',
  '/mapa/',
  '/mapa/:uf/',
  '/mapa/ficaram-em-casa/',
  '/mapa/ficaram-em-casa/:ciclo/',
  '/mapa/virada/',
  '/meu-brasil/',
  '/meu-brasil/adesivo/',
  '/meu-brasil/historia/',
  '/overlay/',
  '/overlay/tela/',
  '/qr/',
  '/relatorios/',
  '/relatorios/:report/',
  '/relatorios/cidades-fora-da-curva/',
  '/relatorios/cidades-fora-da-curva/:uf/:min/',
  '/relatorios/cidades-que-viraram/',
  '/relatorios/como-cada-grupo-votou/',
  '/relatorios/comparecimento/',
  '/relatorios/disputas-mais-apertadas/',
  '/relatorios/maiores-viradas/',
  '/relatorios/votos-ganhos-e-perdidos/',
  '/sobre-os-dados/',
  '/tres-ciclos/:uf/',
  '/widget/',
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
