import { describe, expect, it } from 'vitest'
import { stayHomeContent, stayHomeUrl } from './stay-home-content'
import { stayHomeCardSvg } from './stay-home-card'
import { stayHomeModel } from './stay-home-view'
import { svgTexts } from './card-keys'
import type { StayHomeRow, StayHomeView } from './stay-home'

const rows: StayHomeRow[] = [
  { uf: 'rj', aptos: 1000, naoVotaram: 250, share: 25 },
  { uf: 'sp', aptos: 3000, naoVotaram: 633, share: 21.1 },
  { uf: 'mt', aptos: 500, naoVotaram: 100, share: 20 },
]
const view: StayHomeView = { ano: 2026, turno: 1 }
const views: StayHomeView[] = [view, { ano: 2022, turno: 2 }]
const model = stayHomeModel({ view, views, rows, claim: { cities: 10, greater: 5, tenths: 500 } })
const o = { origin: 'https://exemplo.test', base: '/', fixture: false }

describe('the picture of "Ficaram em casa"', () => {
  const { svg, height } = stayHomeCardSvg(model, { address: 'exemplo.test/mapa/ficaram-em-casa', fixture: false })

  it('is 1080 wide and carries the title, the cycle and round, and the percentage of every state', () => {
    expect(svg).toMatch(/^<svg [^>]*width="1080"/)
    expect(height).toBeGreaterThan(1000)
    const texts = svgTexts(svg)
    expect(texts).toContain('Ficaram em casa')
    expect(texts.join(' ')).toContain('1º turno de 2026')
    for (const pct of ['25,0%', '21,1%', '20,0%']) expect(texts).toContain(pct)
    for (const uf of ['RJ', 'SP', 'MT']) expect(texts).toContain(uf)
  })

  it('prints the six legend edges so colour is never the only cue', () => {
    const texts = svgTexts(svg)
    for (const edge of ['17', '20', '23', '26', '29', '32']) expect(texts).toContain(edge)
  })

  it('names no candidate, no cause and no claim about cities (the claim stays on the page)', () => {
    expect(svg).not.toMatch(/Lula|Flavio|Candidato|cidades|decid/)
  })

  it('has the text alternative as its title, the address, the source and the example banner only for fixtures', () => {
    expect(svg).toContain(`<title>${model.alt}</title>`)
    expect(svgTexts(svg)).toContain('exemplo.test/mapa/ficaram-em-casa')
    expect(svgTexts(svg).join(' ')).toContain('Fonte: TSE')
    expect(svgTexts(svg)).not.toContain('EXEMPLO')
    expect(svgTexts(stayHomeCardSvg(model, { address: 'x', fixture: true }).svg)).toContain('EXEMPLO')
  })
})

describe('the content of the share', () => {
  const c = stayHomeContent(model, rows, { ...o, defaultView: view })
  it('the page address of the plain route for the default view and of the cycle for the others', () => {
    expect(stayHomeUrl('https://exemplo.test', '/', view, view)).toBe('https://exemplo.test/mapa/ficaram-em-casa/')
    expect(stayHomeUrl('https://exemplo.test', '/sub/', { ano: 2022, turno: 2 }, view)).toBe('https://exemplo.test/sub/mapa/ficaram-em-casa/2022-2/')
  })
  it('the share text is the sentence of the view and the link, in both registers', () => {
    expect(c.variants.standard.text).toBe('Parcela dos eleitores que não votou em ninguém (abstenção, brancos e nulos), por estado, 1º turno de 2026. https://exemplo.test/mapa/ficaram-em-casa/')
    expect(c.variants.plain.text).toContain('Parte dos eleitores que não votou em ninguém')
    expect(c.variants.standard.alt).toBe(model.alt)
  })
  it('names the file by cycle and round and never carries a claim about a city', () => {
    expect(c.filename).toBe('voto-a-voto-ficaram-em-casa-2026-1.png')
    expect(c.variants.standard.text).not.toMatch(/cidades|irregular|suspeit/)
  })
})
