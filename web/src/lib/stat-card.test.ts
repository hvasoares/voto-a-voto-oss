import { describe, expect, it } from 'vitest'
import { buildCityResult } from '@/shared/city-model'
import { statCard } from './sentences/stat'
import { STAT_SIZES, STAT_SIZE_IDS, statCardSvg, type StatSize } from './stat-card'
import { textWidth } from './share-card'

const r = buildCityResult({
  turnout: { ano: 2026, turno: 1, uf: 'rj', cdMunicipio: '1', aptos: 1000, comparecimento: 700, abstencoes: 300, brancos: 0, nulos: 0, anuladosApuSep: 0, validos: 700 },
  votes: [{ ano: 2026, turno: 1, uf: 'rj', cdMunicipio: '1', candidatoNumero: 1, votos: 400 }, { ano: 2026, turno: 1, uf: 'rj', cdMunicipio: '1', candidatoNumero: 2, votos: 300 }],
  candidates: [1, 2].map((n) => ({ ano: 2026, turno: 1 as const, candidatoNumero: n, nomeUrna: `C${n}`, partido: 'P' })),
})
const address = 'votoavoto.exemplo.br/rj/cidade-exemplo'
const texts = (svg: string) => [...svg.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)].map((m) => m[1]!)
const stat = statCard(r, 'nonVoters', { cityName: 'Cidade Exemplo' })

describe('statCardSvg at each size', () => {
  it.each(STAT_SIZE_IDS)('%s: the right canvas, the title is the text alternative, the number, the line and the address are text', (size) => {
    const svg = statCardSvg(stat, { size, address })
    const { width, height } = STAT_SIZES[size]
    expect(svg).toContain(`viewBox="0 0 ${width} ${height}"`)
    expect(svg).toContain(`width="${width}" height="${height}"`)
    expect(svg).toContain(`<title>${stat.alt}</title>`)
    const t = texts(svg).join(' ')
    expect(t).toContain('30%')
    expect(t.replace(/\s+/g, ' ')).toContain('do eleitorado de Cidade Exemplo')
    expect(t).toContain(address)
    expect(t).toContain('Voto a Voto · Fonte: TSE')
  })

  it('the sizes are the three of the ticket: square, Story (9:16) and the link-preview ratio', () => {
    expect(STAT_SIZES.square).toEqual({ width: 1080, height: 1080 })
    expect(STAT_SIZES.story.height / STAT_SIZES.story.width).toBeCloseTo(16 / 9, 2)
    expect(STAT_SIZES.preview).toEqual({ width: 1200, height: 630 })
  })

  it('draws the fixture tag and the fictitious-data source only for fictitious data', () => {
    expect(texts(statCardSvg(stat, { size: 'square', address, fixture: true })).join(' ')).toContain('EXEMPLO')
    expect(texts(statCardSvg(stat, { size: 'square', address, fixture: true })).join(' ')).toContain('Dados fictícios')
    expect(texts(statCardSvg(stat, { size: 'square', address })).join(' ')).not.toContain('EXEMPLO')
  })

  it('draws every line within the card: left edge 98 and right edge 982 (1022 for the preview), whatever the number or city name', () => {
    const long = statCard(r, 'margin', { cityName: 'Santa Rita do Passa Quatro de Todos os Santos do Norte' })
    for (const size of STAT_SIZE_IDS)
      for (const s of [stat, long, statCard(r, 'turnout', { cityName: 'X' })]) {
        const svg = statCardSvg(s, { size, address })
        const right = STAT_SIZES[size].width - 98
        expect([...svg.matchAll(/<text x=/g)].length).toBeGreaterThanOrEqual(4)
        for (const m of svg.matchAll(/<text x="([\d.]+)" y="[\d.]+" font-family="[^"]*" font-size="(\d+)"[^>]*?(?: text-anchor="(\w+)")?>([^<]*)<\/text>/g)) {
          const x = Number(m[1]), size_ = Number(m[2]), w = textWidth(m[4]!.replace(/&amp;/g, '&'), size_)
          const [from, to] = m[3] === 'middle' ? [x - w / 2, x + w / 2] : [x, x + w]
          expect(Number.isFinite(from), m[4]).toBe(true)
          expect(from, m[4]).toBeGreaterThanOrEqual(98 - 1)
          expect(to, m[4]).toBeLessThanOrEqual(right + 1)
        }
      }
  })

  it('a measure that does not exist draws the unavailable line with no number', () => {
    const none = statCard(undefined, 'margin', { cityName: 'X', ano: 2026, turno: 1 })
    const t = texts(statCardSvg(none, { size: 'story', address })).join(' ')
    expect(t).toContain('Esta medida não se aplica')
    expect(t).not.toMatch(/\d+%/)
  })

  it('escapes what it prints', () => {
    const svg = statCardSvg({ ...stat, line: 'a <b> & "c"' }, { size: 'square', address })
    expect(svg).toContain('a &lt;b&gt; &amp; &quot;c&quot;')
    expect(svg).not.toContain('<b>')
  })

  it('the picture can be built in Node for every size (a pre-rendered page could use the preview)', () => {
    for (const size of STAT_SIZE_IDS as StatSize[]) expect(statCardSvg(stat, { size, address })).toMatch(/^<svg [\s\S]*<\/svg>$/)
  })
})
