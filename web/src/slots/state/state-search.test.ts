import { describe, expect, it } from 'vitest'
import type { Analytics } from '../../analytics'
import { createStateSearch, resultsMarkup } from './state-search'

const ROWS = [
  { slug: 'abreu-e-lima', nome: 'Abreu e Lima' },
  { slug: 'aguas-claras', nome: 'Águas Claras' },
  { slug: 'araruama', nome: 'Araruama' },
  { slug: 'sao-goncalo', nome: 'São Gonçalo' },
  { slug: 'sao-joao-da-barra', nome: 'São João da Barra' },
]

function setup() {
  const events: [string, Record<string, string | number | boolean> | undefined][] = []
  const analytics: Analytics = { pageView() {}, event: (n, p) => void events.push([n, p]) }
  return { events, search: createStateSearch(ROWS, 'rj', analytics) }
}

describe('state search (same matching as the home search, scoped to the rows of one state)', () => {
  it('ignores accents and case', () => {
    const { search } = setup()
    expect(search.search('SAO GONCALO').hits.map((h) => h.slug)).toEqual(['sao-goncalo'])
    expect(search.search('águas').hits.map((h) => h.slug)).toEqual(['aguas-claras'])
  })

  it('returns every match, not a capped page', () => {
    const many = Array.from({ length: 60 }, (_, i) => ({ slug: `cidade-${i}`, nome: `Cidade ${i}` }))
    const view = createStateSearch(many, 'sp', { pageView() {}, event() {} }).search('cidade')
    expect(view.hits).toHaveLength(60)
  })

  it('ranks like home: name prefix before word prefix', () => {
    const { search } = setup()
    expect(search.search('sao').hits.map((h) => h.slug)).toEqual(['sao-goncalo', 'sao-joao-da-barra'])
  })

  it('does not search for fewer than two characters', () => {
    const { search, events } = setup()
    expect(search.search('a').state).toBe('short')
    expect(events).toEqual([])
  })

  it('says so when nothing matches', () => {
    expect(setup().search.search('qqqqq').state).toBe('empty')
  })
})

describe('state search analytics', () => {
  it('reports counts and length with the state, never the typed text', () => {
    const { search, events } = setup()
    search.search('sao gonçalo')
    expect(events).toEqual([['search', { scope: 'state', uf: 'rj', results: 1, query_length: 11 }]])
    expect(JSON.stringify(events)).not.toMatch(/sao|gon/i)
  })

  it('reports taps on results, list rows and the two links with simple values', () => {
    const { search, events } = setup()
    search.resultTap(2)
    search.listTap(5)
    search.linkTap('map')
    search.linkTap('cycles')
    expect(events).toEqual([
      ['search_result_tap', { scope: 'state', uf: 'rj', position: 2 }],
      ['city_list_tap', { uf: 'rj', position: 5 }],
      ['state_link_tap', { uf: 'rj', link: 'map' }],
      ['state_link_tap', { uf: 'rj', link: 'cycles' }],
    ])
  })
})

describe('resultsMarkup', () => {
  const href = (slug: string) => `/rj/${slug}/`
  it('lists hits as links to the city page with the same row look, in rank order', () => {
    const { search } = setup()
    const markup = resultsMarkup(search.search('sao'), 'RJ', 'Município · RJ', href)
    expect([...markup.matchAll(/href="([^"]+)"/g)].map((m) => m[1])).toEqual(['/rj/sao-goncalo/', '/rj/sao-joao-da-barra/'])
    expect(markup).toContain('class="state-row"')
    expect(markup).toContain('2 municípios encontrados')
  })

  it('explains an empty result and names the state', () => {
    const { search } = setup()
    expect(resultsMarkup(search.search('qqqqq'), 'RJ', '', href)).toContain('Nenhuma cidade encontrada em RJ.')
  })

  it('draws nothing for a short query', () => {
    const { search } = setup()
    expect(resultsMarkup(search.search('a'), 'RJ', '', href)).toBe('')
  })

  it('escapes names', () => {
    const view = { state: 'results' as const, total: 1, hits: [{ uf: 'rj', slug: 'x', nome: '<b>x</b>', ufLabel: 'RJ' }] }
    expect(resultsMarkup(view, 'RJ', 's', href)).not.toContain('<b>')
  })
})
