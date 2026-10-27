import sharp from 'sharp'
import { beforeAll, describe, expect, it } from 'vitest'
import { textDigest } from './card-keys'
import { MAX_CARD_BYTES, reopenFile, type ReopenContext } from './card-reopen'
import { cityShardResult } from './city-shard'
import { embedPngKeys } from './png-keys'
import { shareContent } from './share-model'
import { loadCityShard } from './shard-files'
import { statContent } from './stat-content'

const enc = (s: string) => new TextEncoder().encode(s)
const EDITION = '2026-10-26'
let ctx: ReopenContext
let city: Awaited<ReturnType<typeof loadCityShard>> & {}
beforeAll(async () => {
  city = (await loadCityShard('rj', 'cidade-exemplo'))!
  ctx = { edition: EDITION, origin: 'https://votoavoto.exemplo.br', base: '/', fixture: true, loadShard: loadCityShard }
})

const opts = () => ({ origin: ctx.origin, base: ctx.base, fixture: true, edition: EDITION })
const cityCard = () => shareContent(cityShardResult(city, 2026, 2)!, city.city, opts())
const statCard = (measure: 'nonVoters' | 'margin' = 'margin', size: 'square' | 'story' = 'square', register?: 'plain') => statContent(city, { measure, size, view: { ano: 2026, turno: 2 }, register, ...opts() })

describe('reopening a dropped SVG', () => {
  it('a city card reopens its own view, recomputed from the data, and says it matches', async () => {
    const out = await reopenFile(enc(cityCard().svg), ctx)
    expect(out).toMatchObject({ status: 'ok', from: 'svg', keys: { view: 'city:2026-2', places: ['rj/cidade-exemplo'] }, card: { href: '/rj/cidade-exemplo/?ciclo=2026&turno=2' } })
    expect((out as { card: { svg: string } }).card.svg).toBe(cityCard().svg)
  })
  it('a stat card reopens in the generator with its measure and size, in either register', async () => {
    for (const register of [undefined, 'plain'] as const) {
      const out = await reopenFile(enc(statCard('margin', 'story', register).svg!), ctx)
      expect(out).toMatchObject({ status: 'ok', card: { href: '/gerador/?cidade=rj/cidade-exemplo&medida=margem&tamanho=story' } })
    }
  })
  it('an altered file (a number or a word changed) is recognised, and the recomputed card is what is shown', async () => {
    const svg = statCard('nonVoters').svg!
    const number = /<text[^>]*>([^<]*%)<\/text>/.exec(svg)![1]!
    const out = await reopenFile(enc(svg.replace(`>${number}<`, '>99%<')), ctx)
    expect(out.status).toBe('altered')
    expect((out as { card: { svg: string } }).card.svg).toContain(`>${number}<`)
    expect((out as { card: { svg: string } }).card.svg).not.toContain('>99%<')
  })
  it('never carries the dropped file into what it returns', async () => {
    const evil = cityCard().svg.replace('</svg>', '<text x="1" y="1">EVIL-MARKER</text></svg>').replace('<title id="card-title">', '<title id="card-title">EVIL-MARKER ')
    const out = await reopenFile(enc(evil), ctx)
    expect(out.status).toBe('altered')
    expect(JSON.stringify(out)).not.toContain('EVIL-MARKER')
  })
  it('a script in the file is refused, not reopened', async () => {
    expect(await reopenFile(enc(cityCard().svg.replace('</svg>', '<script>alert(1)</script></svg>')), ctx)).toEqual({ status: 'unreadable', reason: 'script' })
  })
  it('keys that point at nothing the site has say the keys do not match', async () => {
    const svg = cityCard().svg
    expect(await reopenFile(enc(svg.replace(/rj\/cidade-exemplo/g, 'rj/nao-existe')), ctx)).toMatchObject({ status: 'mismatch', reason: 'unknown-place-or-view' })
    expect(await reopenFile(enc(svg.replace(/city:2026-2/g, 'city:2030-2')), ctx)).toMatchObject({ status: 'mismatch' })
    // a view that exists but whose numbers are not the ones printed is not a mismatch of keys: the words differ, so it is "altered"
    expect(await reopenFile(enc(svg.replace(/city:2026-2/g, 'city:2018-1')), ctx)).toMatchObject({ status: 'altered', card: { href: '/rj/cidade-exemplo/?ciclo=2018&turno=1' } })
    expect(await reopenFile(enc(svg.replace('lang="pt-BR"/>', 'lang="xx"/>')), ctx)).toMatchObject({ status: 'mismatch', reason: 'bad-lang' })
  })
  it('a file from another edition reopens with the current data and says so', async () => {
    const old = cityCard().svg.replace(new RegExp(EDITION, 'g'), '2026-10-20')
    expect(await reopenFile(enc(old), ctx)).toMatchObject({ status: 'other-edition', keys: { edition: '2026-10-20' } })
  })
  it('an SVG that is not ours has no keys; garbage, empty and huge files are unreadable', async () => {
    expect(await reopenFile(enc('<svg xmlns="http://www.w3.org/2000/svg"><text>hi</text></svg>'), ctx)).toEqual({ status: 'no-keys', reason: 'svg' })
    expect(await reopenFile(enc('hello'), ctx)).toEqual({ status: 'unreadable', reason: 'not-svg' })
    expect(await reopenFile(new Uint8Array(), ctx)).toEqual({ status: 'unreadable', reason: 'empty' })
    expect(await reopenFile(new Uint8Array(MAX_CARD_BYTES + 1), ctx)).toEqual({ status: 'unreadable', reason: 'too-big' })
  })
  it('a kind of card that cannot be recomputed here says so', async () => {
    const svg = cityCard().svg.replace(/city:2026-2/g, 'recap').replace(/places="rj\/cidade-exemplo"/g, 'places="rj"')
    expect(await reopenFile(enc(svg), ctx)).toMatchObject({ status: 'unsupported', reason: 'recap', href: '/rj/resumo/' })
  })
})

describe('reopening a dropped PNG', () => {
  const png = async (svg: string, check?: string) => {
    const bytes = new Uint8Array(await sharp({ create: { width: 20, height: 20, channels: 3, background: '#fff' } }).png().toBuffer())
    const keys = /data-view="([^"]*)"/.exec(svg)![1]!
    return embedPngKeys(bytes, { view: keys, places: ['rj/cidade-exemplo'], edition: EDITION, lang: 'pt-BR', check: check ?? (await textDigest(svg)) })
  }
  it('a PNG with the keys reopens the view like the SVG', async () => {
    const svg = statCard('nonVoters').svg!
    expect(await reopenFile(await png(svg), ctx)).toMatchObject({ status: 'ok', from: 'png', card: { href: '/gerador/?cidade=rj/cidade-exemplo' } })
  })
  it('a PNG whose digest no longer matches the data is flagged as altered or out of date', async () => {
    const svg = statCard('nonVoters').svg!
    expect(await reopenFile(await png(svg, '0000000000000000'), ctx)).toMatchObject({ status: 'altered', from: 'png' })
  })
  it('a PNG a chat app re-encoded has no keys: the printed address is the way back', async () => {
    const bare = new Uint8Array(await sharp({ create: { width: 20, height: 20, channels: 3, background: '#fff' } }).png().toBuffer())
    expect(await reopenFile(bare, ctx)).toEqual({ status: 'no-keys', reason: 'png' })
  })
})
