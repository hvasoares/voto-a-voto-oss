import { describe, expect, it } from 'vitest'
import type { Analytics } from '../../analytics'
import type { City } from '../../data'
import { createSearchController, resultsMarkup } from './search-ui'

const city = (uf: string, nome: string, slug: string): City => ({ uf, cdMunicipio: uf + slug, cdIbge: '', nome, slug, regiao: 'x', ciclos: [2026] })
const CITIES = [city('rj', 'Cidade Exemplo', 'cidade-exemplo'), city('sp', 'Cidade Exemplo Paulista', 'cidade-exemplo-paulista'), city('zz', 'EXTERIOR POSTO', 'exterior-posto')]

function setup() {
  const events: [string, Record<string, string | number | boolean> | undefined][] = []
  const analytics: Analytics = { pageView() {}, event: (n, p) => void events.push([n, p]) }
  return { events, controller: createSearchController(CITIES, analytics) }
}

describe('search controller analytics', () => {
  it('reports result count and query length, never the typed text', () => {
    const { controller, events } = setup()
    controller.search('cidade exemplo')
    expect(events).toEqual([['search', { results: 2, query_length: 14 }]])
    expect(JSON.stringify(events)).not.toMatch(/cidade|exemplo/i)
  })

  it('does not emit for queries too short to be searched', () => {
    const { controller, events } = setup()
    expect(controller.search('c').state).toBe('short')
    expect(events).toEqual([])
  })

  it('reports a search with no results as zero', () => {
    const { controller, events } = setup()
    expect(controller.search('qqqqq').state).toBe('empty')
    expect(events).toEqual([['search', { results: 0, query_length: 5 }]])
  })

  it('emits result and state tile taps with position/uf only', () => {
    const { controller, events } = setup()
    controller.resultTap(2, 'sp')
    controller.stateTap('rj')
    expect(events).toEqual([
      ['search_result_tap', { position: 2, uf: 'sp' }],
      ['state_tile_tap', { uf: 'rj' }],
    ])
  })
})

describe('resultsMarkup', () => {
  it('links each hit by real path and shows name plus UF', () => {
    const { controller } = setup()
    const vm = controller.search('cidade exemplo')
    const markup = resultsMarkup(vm, (uf, slug) => `/${uf}/${slug}/`)
    expect(markup).toContain('href="/rj/cidade-exemplo/"')
    expect(markup).toContain('Cidade Exemplo')
    expect(markup).toMatch(/home-result__uf[^>]*>RJ</)
    expect(markup).toContain('data-position="2"')
  })

  it('labels overseas posts Exterior', () => {
    const { controller } = setup()
    expect(resultsMarkup(controller.search('exterior'), (u, s) => `/${u}/${s}/`)).toMatch(/>Exterior</)
  })

  it('escapes names and says when nothing was found or more exist', () => {
    const { controller } = setup()
    expect(resultsMarkup(controller.search('qqqqq'), () => '#')).toContain('Nenhuma cidade encontrada')
    expect(resultsMarkup(controller.search('c'), () => '#')).toBe('')
  })

  it('tells the visitor when the list is cut', () => {
    const many = Array.from({ length: 30 }, (_, i) => city('mg', `Santa Luzia ${i}`, `s${i}`))
    const c = createSearchController(many, { pageView() {}, event() {} })
    expect(resultsMarkup(c.search('santa luzia'), () => '#')).toContain('Mostrando 20 de 30')
  })
})
