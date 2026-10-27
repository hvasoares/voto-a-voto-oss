import jsQR from 'jsqr'
import sharp from 'sharp'
import { beforeAll, describe, expect, it } from 'vitest'
import { colors } from '@/shared/tokens'
import { buildPlaceCard, type PlaceCard } from './meu-brasil'
import { meuBrasilContent } from './meu-brasil-content'
import { svgTexts } from './card-keys'
import { loadCityShard } from './shard-files'
import { STICKER_QR_SIDE, STICKER_SIZE, stickerSvg } from './sticker-card'
import { stickerContent } from './sticker-content'

let cards: PlaceCard[]
beforeAll(async () => {
  const mk = async (role: 'mora' | 'vota' | 'nasceu', uf: string, slug: string) => buildPlaceCard({ role, uf, slug }, (await loadCityShard(uf, slug))!)
  cards = [await mk('mora', 'rj', 'cidade-exemplo'), await mk('vota', 'sp', 'cidade-exemplo-paulista'), await mk('nasceu', 'mt', 'boa-esperanca-do-norte')]
})
const opts = { origin: 'https://votoavoto.exemplo.br', base: '/', fixture: true, edition: '2026-10-26' }

/** Rasterises the sticker at its own pixel size and decodes the QR in it. */
async function decode(svg: string, width: number = STICKER_SIZE.width) {
  const { data, info } = await sharp(Buffer.from(svg), { density: 72 }).resize({ width }).flatten({ background: '#ffffff' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return jsQR(new Uint8ClampedArray(data), info.width, info.height)
}
/** WCAG relative luminance contrast of two #rrggbb colours. */
const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!
}
const contrast = (a: string, b: string) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05)

describe('the Meu Brasil sticker', () => {
  for (const n of [1, 2, 3])
    it(`${n} place(s): the QR decodes to the card's address, with the places in it, at the story size`, async () => {
      const s = stickerContent(cards.slice(0, n), opts)
      const code = await decode(s.svg)
      expect(code?.data).toBe(s.url)
      expect(s.url).toMatch(/^https:\/\/votoavoto\.exemplo\.br\/meu-brasil\/\?mora=rj\/cidade-exemplo/)
    })

  it('stays readable at half the story size and when the whole picture is shrunk to a phone thumbnail', async () => {
    const s = stickerContent(cards, opts)
    expect((await decode(s.svg, 540))?.data).toBe(s.url)
    expect((await decode(s.svg, 360))?.data).toBe(s.url)
  })

  it('is a 1080x1920 picture with a transparent background: nothing is drawn outside the rounded card', async () => {
    const s = stickerContent(cards, opts)
    expect(s.svg).toContain(`viewBox="0 0 ${STICKER_SIZE.width} ${STICKER_SIZE.height}"`)
    const { data, info } = await sharp(Buffer.from(s.svg)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    expect([info.width, info.height]).toEqual([1080, 1920])
    expect(data[3]).toBe(0) // the top-left corner pixel
    expect(data[(info.width * info.height - 1) * 4 + 3]).toBe(0)
    expect(data[(Math.floor(info.height / 2) * info.width + Math.floor(info.width / 2)) * 4 + 3]).toBe(255)
  })

  it('prints the headline of the card, the same sentence, as its text and in its text alternative', () => {
    const headline = meuBrasilContent(cards, opts).variants.standard.alt
    const s = stickerContent(cards, opts)
    expect(s.headline).toBe(headline)
    expect(svgTexts(s.svg).join(' ').replace(/\s+/g, ' ')).toContain(headline.split(' ').slice(0, 8).join(' '))
    expect(s.alt).toBe(`Adesivo Meu Brasil: ${headline} O QR leva ao cartão em votoavoto.exemplo.br/meu-brasil.`)
    expect(s.svg).toContain(`<title>${s.alt}</title>`)
    expect(svgTexts(s.svg)).toContain('votoavoto.exemplo.br/meu-brasil')
    expect(svgTexts(s.svg)).toContain('MEU BRASIL')
    expect(svgTexts(s.svg)).toContain('Aponte a câmera para abrir o cartão.')
  })

  it('keeps high contrast: every word is ink on paper, the QR ink on white', () => {
    expect(contrast(colors.ink, colors.paper)).toBeGreaterThan(15)
    expect(contrast(colors.ink, '#ffffff')).toBeGreaterThan(15)
    expect(contrast(colors['accent-fg'], colors.accent)).toBeGreaterThan(7)
    const svg = stickerContent(cards, opts).svg
    // no text is drawn in the muted grey: the sticker is meant to be read small
    for (const m of svg.matchAll(/<text[^>]* fill="(#[0-9a-f]{6})"/g)) expect(contrast(m[1]!, m[1] === colors['accent-fg'] ? colors.accent : colors.paper), m[1]).toBeGreaterThan(7)
    expect(svg).not.toContain(colors.muted)
  })

  it('the QR is big enough: at least 8 px per module at the story size', () => {
    const s = stickerContent(cards, opts)
    expect(STICKER_QR_SIDE).toBe(600)
    expect(s.svg).toMatch(/scale\((\d+(\.\d+)?)\)/)
    const scale = Number(/scale\((\d+(\.\d+)?)\)/.exec(s.svg)![1])
    expect(scale).toBeGreaterThanOrEqual(8)
  })

  it('a long headline and a fixture tag still fit the card', () => {
    const svg = stickerSvg({ headline: 'palavra '.repeat(70).trim(), url: 'https://votoavoto.exemplo.br/meu-brasil/?mora=rj/a', address: 'votoavoto.exemplo.br/meu-brasil', alt: 'x', fixture: true })
    expect(svgTexts(svg).length).toBeGreaterThan(5)
    expect(svg).toMatch(/…/)
  })
})

describe('the layout of the sticker', () => {
  it('keeps every line inside the card (y between the top and the bottom edge) whatever the headline', () => {
    for (const headline of ['Curta.', 'palavra '.repeat(12).trim(), 'palavra '.repeat(60).trim()]) {
      const svg = stickerSvg({ headline, url: 'https://votoavoto.exemplo.br/meu-brasil/?mora=rj/cidade-exemplo&vota=sp/cidade-exemplo-paulista&nasceu=mt/boa-esperanca-do-norte', address: 'votoavoto.exemplo.br/meu-brasil', alt: 'x', fixture: true })
      const shift = Number(/translate\(0 (\d+)\)/.exec(svg)![1])
      const ys = [...svg.matchAll(/<text x="[\d.]+" y="([\d.]+)"/g)].map((m) => Number(m[1]) + shift)
      expect(Math.max(...ys)).toBeLessThan(1820 - 8 - 6)
      expect(Math.min(...ys)).toBeGreaterThan(100)
      const qr = /<rect x="[\d.]+" y="([\d.]+)" width="600" height="600"/.exec(svg)!
      expect(Number(qr[1]) + shift + 600).toBeLessThan(1820)
    }
  })
})
