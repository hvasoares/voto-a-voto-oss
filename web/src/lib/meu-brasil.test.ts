import { beforeAll, describe, expect, it } from 'vitest'
import { svgTexts, readSvgKeys } from './card-keys'
import { commonCycle, buildPlaceCard, parsePlaces, placeCodes, placesFromCodes, placesQuery, type PlaceCard } from './meu-brasil'
import { meuBrasilCardSvg } from './meu-brasil-card'
import { meuBrasilContent } from './meu-brasil-content'
import { meuBrasilHeadline } from './sentences/meu-brasil'
import { loadCityShard } from './shard-files'
import { reopenFile } from './card-reopen'

let cards: Record<string, PlaceCard>
beforeAll(async () => {
  const mk = async (role: 'mora' | 'vota' | 'nasceu', uf: string, slug: string) => buildPlaceCard({ role, uf, slug }, (await loadCityShard(uf, slug))!)
  cards = { rj: await mk('mora', 'rj', 'cidade-exemplo'), sp: await mk('vota', 'sp', 'cidade-exemplo-paulista'), mt: await mk('nasceu', 'mt', 'boa-esperanca-do-norte'), a: await mk('mora', 'rj', 'cidade-exemplo-a') }
})

describe('the places in the address', () => {
  it('round-trips one, two and three places, in role order whatever the order of the address', () => {
    const refs = [{ role: 'mora', uf: 'rj', slug: 'cidade-exemplo' }, { role: 'vota', uf: 'sp', slug: 'x-y' }, { role: 'nasceu', uf: 'zz', slug: 'exterior-exemplo' }] as const
    expect(placesQuery(refs)).toBe('?mora=rj/cidade-exemplo&vota=sp/x-y&nasceu=zz/exterior-exemplo')
    expect(parsePlaces(placesQuery(refs))).toEqual(refs)
    expect(parsePlaces('?nasceu=zz/exterior-exemplo&mora=rj/cidade-exemplo')).toEqual([refs[0], refs[2]])
    expect(placesQuery([refs[1]])).toBe('?vota=sp/x-y')
    expect(placesQuery([])).toBe('')
  })
  it('drops what is not a place and never throws', () => {
    expect(parsePlaces('?mora=../../etc/passwd&vota=SP/X&nasceu=rj/a b&lugar=rj/x')).toEqual([])
    expect(parsePlaces('?mora=rj/x&mora=sp/y')).toEqual([{ role: 'mora', uf: 'rj', slug: 'x' }])
    expect(parsePlaces('')).toEqual([])
    expect(parsePlaces('?mora=%E0%A4%A')).toEqual([])
  })
  it('the same city in two roles is allowed', () => {
    expect(parsePlaces('?mora=rj/a&vota=rj/a')).toHaveLength(2)
  })
  it('the codes of the keys round-trip and refuse a code that is not one', () => {
    const refs = parsePlaces('?mora=rj/a&nasceu=sp/b')
    expect(placeCodes(refs)).toEqual(['mora=rj/a', 'nasceu=sp/b'])
    expect(placesFromCodes(placeCodes(refs))).toEqual(refs)
    expect(placesFromCodes(['rj/a', 'dono=rj/a'])).toEqual([])
  })
})

describe('the card of a place', () => {
  it('has the three cycles in order, each with the numbers of the city model', () => {
    expect(cards.rj!.name).toBe('Cidade Exemplo')
    expect(cards.rj!.cycles.map((c) => [c.ano, c.status, c.turno])).toEqual([[2018, 'data', 2], [2022, 'data', 2], [2026, 'data', 2]])
    const b = cards.rj!.cycles[2]!
    expect(b.status === 'data' && b.votedPct + b.notVotedPct).toBe(100)
  })
  it('a city with one cycle only says "sem dados" for the others, never zeros', () => {
    expect(cards.mt!.cycles.map((c) => c.status)).toEqual(['no-data', 'no-data', 'data'])
  })
})

describe('the headline, for each number of places', () => {
  const pct = (c: PlaceCard, ano: number) => { const b = c.cycles.find((x) => x.ano === ano)!; return b.status === 'data' ? b.notVotedPct : NaN }
  it('no place asks for one', () => {
    expect(meuBrasilHeadline([])).toBe('Escolha ao menos um lugar para ver o cartão.')
  })
  it('one place: its share of non-voters in each cycle', () => {
    expect(meuBrasilHeadline([cards.rj!])).toBe(`Em Cidade Exemplo, no 2º turno, a parcela do eleitorado que não votou foi de ${pct(cards.rj!, 2018)}% em 2018, ${pct(cards.rj!, 2022)}% em 2022 e ${pct(cards.rj!, 2026)}% em 2026.`)
    expect(meuBrasilHeadline([cards.mt!])).toBe(`Em Boa Esperança do Norte, no 2º turno, a parcela do eleitorado que não votou foi de ${pct(cards.mt!, 2026)}% em 2026.`)
  })
  it('two and three places: the share in each place in the latest cycle they all have', () => {
    expect(meuBrasilHeadline([cards.rj!, cards.sp!])).toBe(`No 2º turno de 2026, a parcela do eleitorado que não votou foi de ${pct(cards.rj!, 2026)}% em Cidade Exemplo e ${pct(cards.sp!, 2026)}% em Cidade Exemplo Paulista.`)
    expect(meuBrasilHeadline([cards.rj!, cards.sp!, cards.mt!])).toMatch(/^No 2º turno de 2026, .* foi de \d+% em Cidade Exemplo, \d+% em Cidade Exemplo Paulista e \d+% em Boa Esperança do Norte\.$/)
  })
  it('places with no cycle in common say so', () => {
    const broken: PlaceCard = { ...cards.rj!, cycles: cards.rj!.cycles.map((c) => (c.ano === 2026 ? { status: 'no-data', ano: 2026, turno: 2, reason: 'x' } : { ...c, status: 'no-data', reason: 'x' }) as PlaceCard['cycles'][number]) }
    expect(commonCycle([broken, cards.sp!])).toBeUndefined()
    expect(meuBrasilHeadline([broken, cards.sp!])).toBe('Os lugares escolhidos não têm dados do 2º turno de nenhum ciclo em comum.')
    expect(meuBrasilHeadline([broken])).toBe('Os lugares escolhidos não têm dados do 2º turno de nenhum ciclo em comum.')
  })
  it('never words a winner or a cause, in either register', () => {
    for (const set of [[cards.rj!], [cards.rj!, cards.sp!], [cards.rj!, cards.sp!, cards.mt!]])
      for (const register of ['standard', 'plain'] as const) expect(meuBrasilHeadline(set, { register })).not.toMatch(/vence|venceu|vencedor|ganhou|porque|por causa/i)
  })
  it('the plain register says the same figures', () => {
    expect(meuBrasilHeadline([cards.rj!, cards.sp!], { register: 'plain' })).toMatch(/^No 2º turno de 2026, estas foram as pessoas que não votaram: \d+% em Cidade Exemplo e \d+% em Cidade Exemplo Paulista\.$/)
  })
})

describe('the card picture and content', () => {
  const opts = { origin: 'https://votoavoto.exemplo.br', base: '/', fixture: true, edition: '2026-10-26' }
  it('carries the headline as its text alternative and as text, each place with the three cycles, the legend and the short address', () => {
    for (const n of [1, 2, 3]) {
      const set = [cards.rj!, cards.sp!, cards.mt!].slice(0, n)
      const c = meuBrasilContent(set, opts)
      const t = svgTexts(c.svg)
      expect(c.svg).toContain(`<title id="card-title">${c.variants.standard.alt}</title>`)
      for (const place of set) expect(t).toContain(`${place.name} · ${place.ufLabel}`)
      expect(t.filter((x) => /^20(18|22|26)$/.test(x))).toHaveLength(3 * n)
      expect(t.join(' ')).toContain('Vermelho = candidato de menor número')
      expect(t).toContain('votoavoto.exemplo.br/meu-brasil')
      expect(c.url).toBe(`https://votoavoto.exemplo.br/meu-brasil/${placesQuery(set.map((p) => p.ref))}`)
    }
  })
  it('draws "sem dados" for a cycle without data and keeps the picture taller with more places', () => {
    expect(svgTexts(meuBrasilContent([cards.mt!], opts).svg).filter((x) => x === 'sem dados')).toHaveLength(2)
    const h = (n: number) => meuBrasilContent([cards.rj!, cards.sp!, cards.mt!].slice(0, n), opts).height
    expect(h(1)).toBeLessThan(h(2))
    expect(h(2)).toBeLessThan(h(3))
  })
  it('the keys carry the places with their roles, the edition and the language', () => {
    const c = meuBrasilContent([cards.rj!, cards.mt!], opts)
    expect(readSvgKeys(c.svg)).toEqual({ ok: true, keys: { view: 'meu-brasil', places: ['mora=rj/cidade-exemplo', 'nasceu=mt/boa-esperanca-do-norte'], edition: '2026-10-26', lang: 'pt-BR' } })
    expect(c.variants.standard.text.endsWith(c.url)).toBe(true)
  })
  it('without a place there are no keys (nothing to reopen)', () => {
    expect(meuBrasilContent([], opts).keys).toBeUndefined()
    expect(meuBrasilCardSvg([], { address: 'x' }).svg).toContain('Escolha ao menos um lugar')
  })
  it('reopens from a dropped file, recomputed from the shards of the places', async () => {
    const c = meuBrasilContent([cards.rj!, cards.sp!], opts)
    const ctx = { edition: '2026-10-26', origin: opts.origin, base: '/', fixture: true, loadShard: loadCityShard }
    expect(await reopenFile(new TextEncoder().encode(c.svg), ctx)).toMatchObject({ status: 'ok', card: { href: '/meu-brasil/?mora=rj/cidade-exemplo&vota=sp/cidade-exemplo-paulista' } })
    expect(await reopenFile(new TextEncoder().encode(c.svg.replace(/vota=sp\/cidade-exemplo-paulista/g, 'vota=sp/nao-existe')), ctx)).toMatchObject({ status: 'mismatch' })
  })
})
