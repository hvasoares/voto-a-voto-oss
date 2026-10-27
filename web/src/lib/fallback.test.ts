import { describe, expect, it } from 'vitest'
import { classifyPath, KNOWN_ROUTES } from './fallback'

const data = { states: ['rj', 'sp'], cities: [{ uf: 'rj', slug: 'cidade-exemplo' }] }

describe('client fallback for a path with no pre-rendered file', () => {
  it('recognises a valid route whose params exist in the data', () => {
    expect(classifyPath('/rj/', data)).toEqual({ kind: 'valid', route: '/:uf/' })
    expect(classifyPath('/rj/cidade-exemplo/', data)).toEqual({ kind: 'valid', route: '/:uf/:slug/' })
    expect(classifyPath('/rj/cidade-exemplo/tres-ciclos/', data)).toEqual({ kind: 'valid', route: '/:uf/:slug/tres-ciclos/' })
    expect(classifyPath('/brasil/', data)).toEqual({ kind: 'valid', route: '/brasil/' })
    expect(classifyPath('/tres-ciclos/sp/', data)).toEqual({ kind: 'valid', route: '/tres-ciclos/:uf/' })
    expect(classifyPath('/mapa/rj/', data)).toEqual({ kind: 'valid', route: '/mapa/:uf/' }) // #17
  })

  it('says not found for unknown params or unknown routes', () => {
    expect(classifyPath('/xx/', data)).toEqual({ kind: 'not-found' })
    expect(classifyPath('/rj/inexistente/', data)).toEqual({ kind: 'not-found' })
    expect(classifyPath('/zz/', data)).toEqual({ kind: 'not-found' })
    expect(classifyPath('/nada/aqui/', data)).toEqual({ kind: 'not-found' })
  })

  it('lists the routes of the site README', () => {
    expect(KNOWN_ROUTES).toContain('/mapa/virada/')
    expect(KNOWN_ROUTES).toContain('/relatorios/:report/')
  })
})
