import { describe, expect, it } from 'vitest'
import { loadCityResult } from './shard-files'
import { pictureSvg, shareContent } from './share-model'

const city = { uf: 'rj', slug: 'cidade-exemplo', nome: 'Cidade Exemplo' }
const options = { origin: 'https://x.br', base: '/', fixture: true }

describe('share content per register', async () => {
  const result = (await loadCityResult('rj', 'cidade-exemplo', 2026, 1))!
  const content = shareContent(result, city, options)

  it('the standard text and alt are the headline; the picture carries the alt as its title', () => {
    expect(content.variants.standard.alt).toBe('Em Cidade Exemplo, no 1º turno de 2026, 30% do eleitorado não votou, quase tanto quanto o Candidato B recebeu (33,6%).')
    expect(content.variants.standard.text).toBe(`${content.variants.standard.alt} https://x.br/rj/cidade-exemplo/`)
    expect(content.text).toBe(content.variants.standard.text)
    expect(content.svg).toContain(`<title>${content.variants.standard.alt}</title>`)
  })
  it('the plain text and alt follow the chosen register, the picture is the same drawing', () => {
    expect(content.variants.plain.alt).toBe('Em Cidade Exemplo, no 1º turno de 2026, 30% das pessoas que podiam votar não votaram. Isso é quase igual ao que o Candidato B recebeu: 33,6%.')
    expect(content.variants.plain.text).toBe(`${content.variants.plain.alt} https://x.br/rj/cidade-exemplo/`)
    const plain = pictureSvg(content, 'plain')
    expect(plain).toContain(`<title>${content.variants.plain.alt}</title>`)
    expect(plain.replace(/<title>.*?<\/title>/, '')).toBe(content.svg.replace(/<title>.*?<\/title>/, ''))
    expect(pictureSvg(content, 'standard')).toBe(content.svg)
  })
})
