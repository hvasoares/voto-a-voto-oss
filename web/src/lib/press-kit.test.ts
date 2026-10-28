import { describe, expect, it } from 'vitest'
import { kitCaptions, sealLine, sealSvg, SEAL_BAND } from './press-kit'

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="600" viewBox="0 0 1080 600" role="img"><title>t</title><rect width="1080" height="600" fill="#fff"/></svg>'
const o = { edition: '2026-10-27', fixture: false }

describe('the source seal', () => {
  const sealed = sealSvg(SVG, o)
  it('is printed in a band at the top, in the middle and in a band at the foot', () => {
    const texts = [...sealed.matchAll(/<text data-seal[^>]* y="([\d.]+)"/g)].map((m) => Number(m[1]))
    expect(texts).toHaveLength(3)
    const total = 600 + 2 * SEAL_BAND
    expect(texts[0]!).toBeLessThan(total / 3)
    expect(texts[1]!).toBeGreaterThan(total / 3)
    expect(texts[1]!).toBeLessThan((2 * total) / 3)
    expect(texts[2]!).toBeGreaterThan((2 * total) / 3)
  })
  it('survives any crop of one half of the picture, which still holds a seal', () => {
    const total = 600 + 2 * SEAL_BAND
    const ys = [...sealed.matchAll(/<text data-seal[^>]* y="([\d.]+)"/g)].map((m) => Number(m[1]))
    expect(ys.filter((y) => y < total / 2).length).toBeGreaterThan(0)
    expect(ys.filter((y) => y > total / 2).length).toBeGreaterThan(0)
  })
  it('grows the picture by a band above and below, and keeps the original inside', () => {
    expect(sealed).toContain(`viewBox="0 0 1080 ${600 + 2 * SEAL_BAND}"`)
    expect(sealed).toContain(`height="${600 + 2 * SEAL_BAND}"`)
    expect(sealed).toContain(`<g transform="translate(0 ${SEAL_BAND})"><title>t</title>`)
    expect(sealed.endsWith('</svg>')).toBe(true)
  })
  it('names the source and the edition; the fixture says it is fictitious', () => {
    expect(sealLine(o)).toBe('Voto a Voto · Fonte: TSE, dados finais · edição 2026-10-27')
    expect(sealLine({ ...o, fixture: true })).toContain('dados fictícios')
  })
  it('is deterministic: the same picture and edition give the same bytes', () => {
    expect(sealSvg(SVG, o)).toBe(sealSvg(SVG, o))
  })
  it('refuses a picture it cannot measure', () => {
    expect(() => sealSvg('<svg></svg>', o)).toThrow(/viewBox/i)
  })
})

describe('the captions file', () => {
  const input = { stateName: 'Rio de Janeiro', uf: 'rj', caption: 'Frase padrão.', captionPlain: 'Frase simples.', file: 'resumo-do-estado.svg', edition: { id: '2026-10-27', date: '2026-10-27' }, editionUrl: 'https://voto-a-voto.com/edicoes/2026-10-27/', pageUrl: 'https://voto-a-voto.com/rj/resumo/', hasData: true }
  const txt = kitCaptions(input)
  it('has the caption, the alt text in both registers, the credit, the licence and the citation', () => {
    expect(txt).toContain('Kit de imprensa: Rio de Janeiro')
    expect(txt).toContain('Legenda:\nFrase padrão.')
    expect(txt).toContain('Texto alternativo:\nFrase padrão.')
    expect(txt).toContain('Legenda em linguagem simples:\nFrase simples.')
    expect(txt).toContain('Crédito: Voto a Voto, a partir de dados do TSE')
    expect(txt).toContain('CC BY 4.0')
    expect(txt).toContain('Como citar: Voto a Voto. Resultados da eleição presidencial por município, edição de')
    expect(txt).toContain('não mostram')
  })
  it('is the same every time and says what is missing for a state with no data', () => {
    expect(kitCaptions(input)).toBe(txt)
    expect(kitCaptions({ ...input, hasData: false })).toContain('Rio de Janeiro não tem dados de 2º turno')
  })
  it('gives no cause and no winner label', () => {
    expect(txt).not.toMatch(/porque|vence|venceu|lidera|derrota|culpa/i)
  })
})
