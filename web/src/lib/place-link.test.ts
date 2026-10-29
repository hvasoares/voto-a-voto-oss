import { describe, expect, it } from 'vitest'
import { html } from '@/shared/html'
import { placeLabel, placeLabelTemplate, placeLinkHtml, placePath, splitPlaces } from './place-link'
import { messageHtml } from './sentences/markup'
import './sentences/catalog-twin'

/* The one link helper of states and regions (#184): where a mention goes, what its link is called, how a text is cut into mentions, and the sentence with markup in its slots. */

describe('where a mention goes and what the link is called', () => {
  it('a state goes to its page and a region to its page, under the site base', () => {
    expect(placePath({ kind: 'uf', uf: 'RJ' })).toBe('/rj/')
    expect(placePath({ kind: 'regiao', regiao: 'centro-oeste' })).toBe('/brasil/centro-oeste/')
  })

  it('the accessible name says where it goes and keeps the visible code in it', () => {
    expect(placeLabel({ kind: 'uf', uf: 'rj' })).toBe('Página do estado RJ · Rio de Janeiro')
    expect(placeLabel({ kind: 'regiao', regiao: 'sudeste' })).toBe('Página da região Sudeste')
    expect(placeLabelTemplate('uf')).toBe('Página do estado {name}')
  })
})

describe('splitPlaces cuts a text into plain stretches and mentions', () => {
  it('finds an abbreviation, a state name and a region, in order, and keeps every character of the rest', () => {
    const parts = splitPlaces('RJ e Minas Gerais, na região Sul.')
    expect(parts.map((p) => p.text).join('')).toBe('RJ e Minas Gerais, na região Sul.')
    expect(parts.filter((p) => p.place).map((p) => [p.text, p.place])).toEqual([
      ['RJ', { kind: 'uf', uf: 'rj' }],
      ['Minas Gerais', { kind: 'uf', uf: 'mg' }],
      ['Sul', { kind: 'regiao', regiao: 'sul' }],
    ])
  })

  it('reads whole words and the right case: a word of the language or of a longer name is no mention', () => {
    expect(splitPlaces('se ao sul, Sulista, PRÓ, Pará').filter((p) => p.place).map((p) => p.text)).toEqual(['Pará'])
    expect(splitPlaces('Rio Grande do Sul').filter((p) => p.place).map((p) => p.text)).toEqual(['Rio Grande do Sul'])
  })

  it('leaves a stretch of the exceptions plain: a city called "Santa Cruz do Sul" is not the region', () => {
    expect(splitPlaces('Santa Cruz do Sul/RS', ['Santa Cruz do Sul']).filter((p) => p.place).map((p) => p.text)).toEqual(['RS'])
  })
})

describe('the link as markup', () => {
  it('is an anchor with the page, the accessible name and the text of the mention; plain draws the text only', () => {
    const link = placeLinkHtml({ kind: 'uf', uf: 'sp' }).toString()
    expect(link).toMatch(/^<a class="[^"]*after:-inset-y-4[^"]*" data-place="uf" href="\/sp\/" aria-label="Página do estado SP · São Paulo">SP<\/a>$/)
    expect(placeLinkHtml({ kind: 'regiao', regiao: 'sul' }, { plain: true }).toString()).toBe('<span data-place="regiao">Sul</span>')
  })
})

describe('a catalog sentence with markup in its slots', () => {
  const voice = { locale: 'pt-BR', register: 'plain' } as const
  it('keeps a Raw slot as markup and escapes everything else, the words of the sentence included', () => {
    const out = messageHtml(voice, 'twin.label', { name: html`<a href="/x/">Vila & Co</a>`, uf: '<b>SP</b>' }).toString()
    expect(out).toBe('Cidade parecida: <a href="/x/">Vila & Co</a> · &lt;b&gt;SP&lt;/b&gt;')
  })

  it('leaves a slot nobody filled as it is, visible', () => {
    expect(messageHtml(voice, 'twin.label', { name: 'A' }).toString()).toBe('Cidade parecida: A · {uf}')
  })
})
