// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { cityQrRecord, drawQrScreen, qrScreenHtml, qrSvgOf } from './qr-screen'
import { packModules, unpackModules } from './qr-glyph'
import { qrGlyph } from './qr-code'
import { cityUrl, DEFAULT_SITE_ORIGIN } from './share-url'

const URL = cityUrl(DEFAULT_SITE_ORIGIN, '/', 'rj', 'cidade-exemplo')
const glyph = qrGlyph(URL)
const record = cityQrRecord({ uf: 'rj', slug: 'cidade-exemplo', cityName: 'Cidade <Exemplo>', fixture: true, glyph }, '/')

describe('the packed QR matrix', () => {
  it('round-trips the matrix of a real glyph', () => {
    expect(unpackModules(glyph.size, packModules(glyph.modules))).toEqual(glyph.modules)
  })
  it('refuses a text of the wrong length or characters', () => {
    expect(() => unpackModules(33, 'ff')).toThrow(/qr matrix/)
    expect(() => unpackModules(2, 'g')).toThrow(/qr matrix/)
  })
})

describe('the screen drawn from the data file', () => {
  it('draws the same QR as the build-time drawing and the words of the record, escaped', () => {
    document.body.innerHTML = '<main><h1>Mostrar QR · x</h1><div data-stub-area><div id="host"></div></div><a data-stub-back href="#">Voltar</a></main><header data-app-header></header>'
    drawQrScreen(record, document.getElementById('host')!)
    const drawn = (sel: string) => { const svg = document.querySelector(`${sel} svg`)!; return [svg.getAttribute('viewBox'), svg.getAttribute('aria-label'), svg.querySelector('path')!.getAttribute('d')] }
    const built = new DOMParser().parseFromString(qrSvgOf(glyph), 'image/svg+xml').documentElement
    expect(drawn('[data-qr]')).toEqual([built.getAttribute('viewBox'), built.getAttribute('aria-label'), built.querySelector('path')!.getAttribute('d')])
    expect(document.querySelector('[data-qr]')!.getAttribute('data-url')).toBe(URL)
    expect(document.querySelector('[data-subtitle]')!.textContent).toBe('Presidente 2026 · Cidade <Exemplo>')
    expect(drawn('[data-poster-qr]')).toEqual(drawn('[data-qr]'))
  })

  it('hides the stub title and link back (the screen has its own) and keeps the app header out of the print', () => {
    document.body.innerHTML = '<main><h1>Mostrar QR · x</h1><div data-stub-area><div id="host"></div></div><a data-stub-back href="#">Voltar</a></main><header data-app-header></header>'
    drawQrScreen(record, document.getElementById('host')!)
    expect(document.querySelector('main > h1')!.hasAttribute('hidden')).toBe(true)
    expect(document.querySelector('[data-stub-back]')!.hasAttribute('hidden')).toBe(true)
    expect(document.querySelector('[data-app-header]')!.classList.contains('print:hidden')).toBe(true)
  })
})

describe('the one template', () => {
  const view = { ...record, qr: qrSvgOf(glyph), brand: true }
  it('draws the brand band only where the page has no app header', () => {
    expect(qrScreenHtml(view)).toContain('data-header')
    expect(qrScreenHtml({ ...view, brand: false })).not.toContain('data-header')
  })
  it('draws the fixture banner only on a fixture build', () => {
    expect(qrScreenHtml(view)).toContain('data-banner')
    expect(qrScreenHtml({ ...view, fixture: false })).not.toContain('data-banner')
  })
})
