import { describe, expect, it } from 'vitest'
import { buildCityResult } from '@/shared/city-model'
import { annotateSvg, keysProblem, readSvgKeys, svgTexts, svgTitle, textDigest, type CardKeys } from './card-keys'
import { shareContent } from './share-model'
import { shareCardSvg } from './share-card'

const keys: CardKeys = { view: 'city:2026-2', places: ['rj/cidade-exemplo'], edition: '2026-10-26', lang: 'pt-BR' }
const r = buildCityResult({
  turnout: { ano: 2026, turno: 2, uf: 'rj', cdMunicipio: '1', aptos: 1000, comparecimento: 800, abstencoes: 200, brancos: 0, nulos: 0, anuladosApuSep: 0, validos: 800 },
  votes: [{ ano: 2026, turno: 2, uf: 'rj', cdMunicipio: '1', candidatoNumero: 1, votos: 450 }, { ano: 2026, turno: 2, uf: 'rj', cdMunicipio: '1', candidatoNumero: 2, votos: 350 }],
  candidates: [1, 2].map((n) => ({ ano: 2026, turno: 2 as const, candidatoNumero: n, nomeUrna: `C${n}`, partido: 'P' })),
})
const plain = shareCardSvg(r, { cityName: 'Cidade Exemplo', ufLabel: 'RJ', alt: 'Em Cidade Exemplo, 20% não votou.', address: 'votoavoto.exemplo.br/rj/cidade-exemplo' })
const live = annotateSvg(plain, keys, { address: 'votoavoto.exemplo.br/rj/cidade-exemplo' })

describe('the self-describing SVG', () => {
  it('keeps its text as real text, with a title and a description tied to the root', () => {
    expect(svgTexts(live)).toEqual(svgTexts(plain))
    expect(svgTexts(live).join(' ')).toContain('Cidade Exemplo')
    expect(live).not.toContain('<path')
    expect(svgTitle(live)).toBe('Em Cidade Exemplo, 20% não votou.')
    expect(live).toMatch(/<title id="card-title">[^<]*<\/title><desc id="card-desc">Imagem do Voto a Voto com números do TSE, edição 2026-10-26\. Endereço: votoavoto\.exemplo\.br\/rj\/cidade-exemplo\.<\/desc>/)
    expect(live).toMatch(/^<svg [^>]*role="img"[^>]*aria-labelledby="card-title card-desc"/)
  })
  it('has queryable data attributes and the language on the root', () => {
    const root = /^<svg [^>]*>/.exec(live)![0]
    expect(root).toContain('data-view="city:2026-2"')
    expect(root).toContain('data-places="rj/cidade-exemplo"')
    expect(root).toContain('data-edition="2026-10-26"')
    expect(root).toContain('data-lang="pt-BR"')
    expect(root).toContain('lang="pt-BR"')
  })
  it('has a metadata block with the four keys and nothing else: no script, no number, no link', () => {
    const meta = /<metadata>([\s\S]*?)<\/metadata>/.exec(live)![1]!
    expect(meta).toBe('<card xmlns="urn:voto-a-voto:card:1" view="city:2026-2" places="rj/cidade-exemplo" edition="2026-10-26" lang="pt-BR"/>')
    expect(live).not.toMatch(/<script|<a\s|href=|<foreignObject|<image/i)
  })
  it('annotating twice does not repeat anything', () => {
    const twice = annotateSvg(live, keys, { address: 'x' })
    expect(twice.match(/<metadata>/g)).toHaveLength(1)
    expect(/^<svg [^>]*>/.exec(twice)![0].match(/ lang="/g)).toHaveLength(1)
    expect(twice.match(/<desc /g)).toHaveLength(1)
  })
  it('a card made by the share model carries the keys of its view and its language', () => {
    const c = shareContent(r, { uf: 'rj', slug: 'cidade-exemplo', nome: 'Cidade Exemplo' }, { origin: 'https://votoavoto.exemplo.br', base: '/', fixture: false, edition: '2026-10-26' })
    expect(c.keys).toEqual(keys)
    expect(readSvgKeys(c.svg)).toEqual({ ok: true, keys })
  })
  it('exists per language: the words around the numbers follow the language, the keys say which', () => {
    const en = shareContent(r, { uf: 'rj', slug: 'cidade-exemplo', nome: 'Cidade Exemplo' }, { origin: 'https://votoavoto.exemplo.br', base: '/', fixture: false, edition: '2026-10-26', locale: 'en' })
    expect(svgTexts(en.svg)).toContain('President 2026')
    expect(svgTexts(en.svg)).toContain('Voted: 80% of the electorate')
    expect(en.svg).toContain('data-lang="en"')
    expect(en.svg).toMatch(/lang="en"/)
    expect(en.svg).toContain('Voto a Voto picture with TSE numbers, edition 2026-10-26')
    expect(svgTexts(en.svg)).not.toEqual(svgTexts(shareContent(r, { uf: 'rj', slug: 'cidade-exemplo', nome: 'Cidade Exemplo' }, { origin: 'https://votoavoto.exemplo.br', base: '/', fixture: false, edition: '2026-10-26' }).svg))
  })
  it('a title with markup characters stays escaped', () => {
    const svg = annotateSvg(shareCardSvg(r, { cityName: 'A <b>', ufLabel: 'RJ', alt: 'a "b" & <c>', address: 'x' }), keys, { address: 'x' })
    expect(svg).not.toContain('<b>')
    expect(svgTitle(svg)).toBe('a "b" & <c>')
  })
})

describe('reading the keys', () => {
  it('round-trips', () => {
    expect(readSvgKeys(live)).toEqual({ ok: true, keys })
    expect(readSvgKeys(annotateSvg(plain, { ...keys, view: 'stat:margem:2022-1:story', places: ['mora=rj/x', 'vota=sp/y'] }, { address: 'x' }))).toMatchObject({ ok: true, keys: { places: ['mora=rj/x', 'vota=sp/y'] } })
  })
  it('refuses what is not an SVG, an SVG with a script, and an SVG without keys', () => {
    expect(readSvgKeys('hello')).toEqual({ ok: false, reason: 'not-svg' })
    expect(readSvgKeys('<html><svg></svg></html>')).toEqual({ ok: false, reason: 'not-svg' })
    expect(readSvgKeys(live.replace('</svg>', '<script>alert(1)</script></svg>'))).toEqual({ ok: false, reason: 'script' })
    expect(readSvgKeys(live.replace('<rect', '<rect onload="x()"'))).toEqual({ ok: false, reason: 'script' })
    expect(readSvgKeys(plain)).toEqual({ ok: false, reason: 'no-keys' })
  })
  it('refuses keys that are not well formed', () => {
    const bad = (patch: Record<string, string>) => {
      let s = live
      for (const [k, v] of Object.entries(patch)) s = s.replace(new RegExp(`( ${k}=")[^"]*(" )`, 'g'), `$1${v}$2`).replace(new RegExp(`( ${k}=")[^"]*("/>)`), `$1${v}$2`)
      return readSvgKeys(s)
    }
    expect(bad({ view: 'city:../../x' })).toMatchObject({ ok: false, reason: 'bad-keys', problem: 'view' })
    expect(bad({ places: '../../etc/passwd' })).toMatchObject({ ok: false, problem: 'places' })
    expect(bad({ places: 'rj/a,rj/b,rj/c,rj/d' })).toMatchObject({ ok: false, problem: 'places' })
    expect(bad({ edition: 'ontem' })).toMatchObject({ ok: false, problem: 'edition' })
    expect(bad({ lang: 'klingon' })).toMatchObject({ ok: false, problem: 'lang' })
  })
  it('keysProblem names the first problem', () => {
    expect(keysProblem(keys)).toBeUndefined()
    expect(keysProblem(null)).toBe('view')
    expect(keysProblem({ ...keys, view: 'stat:margem:2026-2:huge' })).toBe('view')
    expect(keysProblem({ ...keys, places: ['RJ/x'] })).toBe('places')
  })
  it('a digest changes with a changed word and not with the keys', async () => {
    expect(await textDigest(live)).toBe(await textDigest(plain))
    expect(await textDigest(live)).not.toBe(await textDigest(live.replace('>Cidade Exemplo<', '>Outra Cidade<')))
    expect(await textDigest(live)).toMatch(/^[0-9a-f]{16}$/)
  })
})
