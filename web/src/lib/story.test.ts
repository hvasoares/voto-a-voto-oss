import { describe, expect, it } from 'vitest'
import type { ArcCounts } from './arcs'
import { countsOf, storyFits, storyPlan, storyText, STORY_MAX, STORY_MIN, STORY_TEXT_MAX, surprise } from './story'
import { STORY_PLAIN, STORY_STANDARD } from './sentences/catalog-story'
import { UF_NOME } from './uf-names'
import { storyCardSvg } from './story-card'
import { storyContent } from './story-content'
import { textWidth } from './share-picture'

const arcs = (a: Partial<ArcCounts>): ArcCounts => ({ same: 0, switched2022: 0, switched2026: 0, returned: 0, switchedTwice: 0, tie: 0, missing: 0, ...a })
const kinds = (a: Partial<ArcCounts>, cities = 600, recap = true) => storyPlan({ cities, arcs: arcs(a), recap }).map((s) => s.kind)

describe('the cards of a state story', () => {
  it('counts cities from the arcs: changed in 2026, changed in 2022, came back, never changed', () => {
    expect(countsOf(arcs({ same: 600, switched2022: 3, switched2026: 30, returned: 6, switchedTwice: 2 }))).toEqual({
      turned2026: { n: 38, total: 641 },
      turned2022: { n: 11, total: 641 },
      returned: { n: 6, total: 641 },
      steady: { n: 600, total: 641 },
    })
  })
  it('opens with the municipalities, puts the most surprising fact second, ends with the share card, and has six to eight cards', () => {
    const plan = storyPlan({ cities: 645, arcs: arcs({ same: 400, switched2022: 100, switched2026: 30, returned: 6, switchedTwice: 2 }), recap: true })
    expect(plan.map((s) => s.kind)).toEqual(['cities', 'turned2022', 'turned2026', 'returned', 'steady', 'recap', 'share'])
    expect(plan[1]).toMatchObject({ kind: 'turned2022', surprising: true, n: 108, total: 538 })
    expect(plan.filter((s) => s.surprising)).toHaveLength(1)
    expect(storyFits(plan)).toBe(true)
    expect(plan.length).toBeGreaterThanOrEqual(STORY_MIN)
    expect(plan.length).toBeLessThanOrEqual(STORY_MAX)
  })
  it('the most surprising fact is the highest share of cities; a tie goes to turned2026, then turned2022, then returned; the steady count never competes', () => {
    expect(kinds({ same: 900, switched2026: 50, switched2022: 10 })[1]).toBe('turned2026')
    expect(kinds({ same: 900, switched2026: 10, switched2022: 50 })[1]).toBe('turned2022')
    expect(kinds({ same: 10, switched2026: 0, switched2022: 0, returned: 5 })[1]).toBe('turned2026')
    expect(kinds({ same: 1000 })[1]).toBe('turned2026')
    expect(surprise({ n: 1, total: 4 })).toBe(25)
    expect(surprise({ n: 0, total: 0 })).toBe(0)
  })
  it('a state with no change still tells it: the counts are zero and the sequence is complete', () => {
    const plan = storyPlan({ cities: 5, arcs: arcs({ same: 5 }), recap: true })
    expect(plan.map((s) => s.kind)).toEqual(['cities', 'turned2026', 'turned2022', 'returned', 'steady', 'recap', 'share'])
    expect(plan.find((s) => s.kind === 'turned2026')).toMatchObject({ n: 0, total: 5 })
    expect(plan.find((s) => s.kind === 'steady')).toMatchObject({ n: 5, total: 5 })
    expect(storyFits(plan)).toBe(true)
  })
  it('a one-city state says "1 cidade" and keeps six cards or more', () => {
    const plan = storyPlan({ cities: 1, arcs: arcs({ same: 1 }), recap: true })
    expect(storyFits(plan)).toBe(true)
    expect(storyText(plan.find((s) => s.kind === 'steady')!, { name: 'Distrito Federal', cards: plan.length }).sentence).toBe(
      'de 1 cidade de Distrito Federal, com os três ciclos, tiveram o mesmo lado com mais votos no 2º turno em 2018, 2022 e 2026.',
    )
    expect(storyText(plan[0]!, { name: 'Distrito Federal', cards: 7 })).toMatchObject({ big: '1' })
  })
  it('a state whose cities lack cycles has no arc cards, so no story is made for it (under six cards)', () => {
    const plan = storyPlan({ cities: 4, arcs: arcs({ missing: 4 }), recap: true })
    expect(plan.map((s) => s.kind)).toEqual(['cities', 'recap', 'share'])
    expect(storyFits(plan)).toBe(false)
    expect(storyPlan({ cities: 4, recap: false }).map((s) => s.kind)).toEqual(['cities', 'share'])
  })
  it('every sentence of every card of every state is within the limit, with no slot left open, in both registers', () => {
    const big = arcs({ same: 4000, switched2022: 800, switched2026: 700, returned: 99, switchedTwice: 12 })
    for (const name of Object.values(UF_NOME))
      for (const register of ['standard', 'plain'] as const)
        for (const step of storyPlan({ cities: 5570, arcs: big, recap: true })) {
          const t = storyText(step, { name, cards: 8 }, { register })
          expect(t.sentence.length).toBeLessThanOrEqual(STORY_TEXT_MAX)
          expect(t.sentence + t.kicker + t.big).not.toMatch(/\{\w+\}/)
        }
  })
  it('the build fails for a card over the length limit', () => {
    expect(() => storyText({ kind: 'steady', n: 1, total: 1 }, { name: 'X'.repeat(200), cards: 7 })).toThrow(/limit is 150/)
  })
  it('is neutral: counts of places, never why, never a winner, a person or a party', () => {
    const all = [...Object.entries(STORY_STANDARD), ...Object.entries(STORY_PLAIN)].filter(([k]) => k.startsWith('story.')).map(([, v]) => v).join(' | ')
    expect(all).not.toMatch(/porque|devido|causa|culpa|motivo|venc|perd|ganh|derrot|lider|vitóri|lula|bolsonaro|\bPT\b|você|eleitor/i)
  })
})

describe('the picture of a card', () => {
  const svg = storyCardSvg({ kicker: 'SP · 2022 → 2026', big: '38', sentence: 'de 641 cidades de São Paulo, com os três ciclos, tiveram mudança do lado com mais votos no 2º turno entre 2022 e 2026.', address: 'votoavoto.exemplo.br/sp/historia#2', alt: 'alt', fixture: true })
  it('is vertical, 1080x1920, with one number, the sentence, the source and the address of its position', () => {
    expect(svg).toContain('viewBox="0 0 1080 1920"')
    const lines = [...svg.matchAll(/<text [^>]*>([^<]*)<\/text>/g)].map((m) => m[1]!)
    expect(lines).toEqual(expect.arrayContaining(['EXEMPLO', 'SP · 2022 → 2026', '38', 'votoavoto.exemplo.br/sp/historia#2']))
    expect(lines.join(' ')).toContain('de 641 cidades de São Paulo')
  })
})

describe('the address of a card', () => {
  it('is complete: a long address goes on two lines, never cut', () => {
    const svg = storyCardSvg({ kicker: 'k', big: '1', sentence: 'x y z', address: 'votoavoto.exemplo.br/meu-brasil/historia#2', alt: 'a' })
    const lines = [...svg.matchAll(/<text [^>]*>([^<]*)<\/text>/g)].map((m) => m[1]!)
    expect(lines.join('')).toContain('votoavoto.exemplo.br/meu-brasil/historia#2'.replace('/historia#2', '') )
    expect(lines.some((l) => l.includes('…'))).toBe(false)
    expect(lines.filter((l) => /historia#2$/.test(l))).toHaveLength(1)
  })
})

describe('the content of a sequence', () => {
  const o = { uf: 'sp', stateName: 'São Paulo', origin: 'https://votoavoto.exemplo.br', base: '/', fixture: true, cities: 645 }
  const a = arcs({ same: 400, switched2022: 100, switched2026: 30, returned: 6 })
  const row = (ano: number, a: number) => ({ ano, status: 'data' as const, left: { label: 'A', pct: `${a},0`, tenths: a * 10 }, rival: { label: 'B', pct: `${100 - a},0`, tenths: (100 - a) * 10 }, changePp: ano === 2018 ? undefined : '+1,0', changeVs: ano === 2018 ? undefined : ano - 4 })
  const recapData = { uf: 'sp', rows: [row(2018, 40), row(2022, 45), row(2026, 46)] }

  it('reuses the state recap card as it is where it covers the shares, and adds only the missing cards', () => {
    const cards = storyContent({ ...o, arcs: a, recapData })!
    expect(cards.map((c) => c.kind)).toEqual(['cities', 'turned2022', 'turned2026', 'returned', 'steady', 'recap', 'share'])
    const recap = cards.find((c) => c.kind === 'recap')!
    expect(recap.svg).toContain('votoavoto.exemplo.br/sp/resumo')
    expect(recap.url).toBe('https://votoavoto.exemplo.br/sp/historia/#6')
  })
  it('each card has its position in its address, its file name, a caption, and a message that ends with the link to it', () => {
    const cards = storyContent({ ...o, arcs: a, recapData })!
    expect(cards.map((c) => c.address)).toEqual([1, 2, 3, 4, 5, 6, 7].map((n) => `votoavoto.exemplo.br/sp/historia#${n}`))
    expect(cards[1]!.filename).toBe('voto-a-voto-sp-historia-2.png')
    expect(cards[1]!.caption).toBe('Cartão 2 de 7 · o fato mais surpreendente')
    expect(cards[2]!.caption).toBe('Cartão 3 de 7')
    expect(cards[6]!.variants.standard.text.endsWith('https://votoavoto.exemplo.br/sp/historia/#7')).toBe(true)
    expect(cards[1]!.svg).toContain('votoavoto.exemplo.br/sp/historia#2')
  })
  it('every card has one number and the number of a data card has its record', () => {
    const cards = storyContent({ ...o, arcs: a, recapData })!
    expect(cards.filter((c) => c.kind !== 'recap').map((c) => [...c.svg.matchAll(/font-size="(\d+)"[^>]*fill="#14505c"[^>]*>([^<]*)</g)].length)).toEqual([1, 1, 1, 1, 1, 1])
    expect(cards.map((c) => c.calc)).toEqual(['municipios', '2022-viradas', '2026-viradas', 'voltaram', 'sem-mudanca', undefined, undefined])
  })
  it('without the recap the sequence still has six cards; without arcs there is no sequence', () => {
    expect(storyContent({ ...o, arcs: a })!.map((c) => c.kind)).toEqual(['cities', 'turned2022', 'turned2026', 'returned', 'steady', 'share'])
    expect(storyContent({ ...o, recapData })).toBeUndefined()
  })
  it('every text of every card is plain text about places (no winner, no why)', () => {
    const cards = storyContent({ ...o, arcs: a, recapData })!
    for (const c of cards.filter((x) => x.kind !== 'recap')) expect(c.variants.standard.alt + c.variants.plain.alt).not.toMatch(/venc|ganh|perd|porque|lider/i)
  })
  it('keeps a card inside the picture: the widest line of any card is not wider than the card', () => {
    const cards = storyContent({ ...o, stateName: 'Rio Grande do Norte', arcs: arcs({ same: 4000, switched2022: 800, switched2026: 700, returned: 99 }), recapData })!
    for (const c of cards.filter((x) => x.kind !== 'recap'))
      for (const m of c.svg.matchAll(/<text [^>]*font-size="(\d+)"[^>]*>([^<]*)</g)) expect(textWidth(m[2]!, Number(m[1]))).toBeLessThanOrEqual(884 + 60)
  })
})
