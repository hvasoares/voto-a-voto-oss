import { describe, expect, it } from 'vitest'
import { attrString, shareFrameHead, shareFrameLinks, shareSheetAttrs } from './share-frame'

/** The frame of a share sheet as strings (private#210): the demo, Brasil and the city stub write these once. */
describe('the share sheet frame', () => {
  it('writes the sheet attributes in one order, leaving out what a route does not have', () => {
    expect(attrString(shareSheetAttrs({ uf: 'rj', slug: 'cidade-exemplo', view: '2026-1', filename: 'a.png' }))).toBe('data-share-sheet id="main" data-uf="rj" data-slug="cidade-exemplo" data-view="2026-1" data-filename="a.png"')
    expect(attrString(shareSheetAttrs({ view: 'brasil' }))).toBe('data-share-sheet id="main" data-view="brasil"')
  })

  it('has the title row with "Fechar" and its cross only where asked', () => {
    expect(shareFrameHead({ closeHref: '/rj/', closeClass: 'c', closeCross: true })).toContain('data-close>Fechar<span class="hidden md:inline" aria-hidden="true"> ×</span></a>')
    expect(shareFrameHead({ closeHref: '/', closeClass: 'c', closeCross: false })).toContain('data-close>Fechar</a>')
  })

  it('always links to Mostrar QR and links to the generator only when a city can be prefilled', () => {
    expect(shareFrameLinks({ qrHref: '/qr/' })).toContain('href="/qr/" data-qr-link')
    expect(shareFrameLinks({ qrHref: '/qr/' })).not.toContain('data-generator-link')
    expect(shareFrameLinks({ qrHref: '/qr/', generatorHref: '/gerador/?cidade=rj/x' })).toContain('href="/gerador/?cidade=rj/x" data-generator-link')
  })
})
