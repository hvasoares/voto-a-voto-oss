import { describe, expect, it } from 'vitest'
import type { Candidate, Turnout, Vote } from '@/data'
import { loadCityResult } from './shard-files'
import { buildCityResult, type CityResult } from '@/shared/city-model'
import { shareCardSvg, SHARE_CARD_SIZE, textWidth } from './share-card'

const turnout = (o: Partial<Turnout> = {}): Turnout => ({ ano: 2026, turno: 2, uf: 'rj', cdMunicipio: '1', aptos: 1000, comparecimento: 800, abstencoes: 200, brancos: 20, nulos: 30, anuladosApuSep: 0, validos: 750, ...o })
const cand = (numero: number, nome: string, turno: 1 | 2 = 2): Candidate => ({ ano: 2026, turno, candidatoNumero: numero, nomeUrna: nome, partido: 'X' })
const vote = (numero: number, votos: number, turno: 1 | 2 = 2): Vote => ({ ano: 2026, turno, uf: 'rj', cdMunicipio: '1', candidatoNumero: numero, votos })
const result = (t: Partial<Turnout>, votes: [number, number][], names: string[] = ['Ana Souza', 'Bruno Lima', 'Carla', 'Dario', 'Eva']): CityResult => {
  const turno = (t.turno ?? 2) as 1 | 2
  return buildCityResult({ turnout: turnout(t), votes: votes.map(([n, v]) => vote(n, v, turno)), candidates: votes.map(([n], i) => cand(n, names[i]!, turno)) })
}
const opts = { cityName: 'Cidade Teste', ufLabel: 'RJ', address: 'votoavoto.exemplo.br/rj/cidade-teste' }

/** Text of every <text> element, unescaped. */
const texts = (svg: string) => [...svg.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)].map((m) => m[1]!.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&'))
const all = (svg: string) => texts(svg).join('\n')
const rects = (svg: string) => [...svg.matchAll(/<rect\b([^>]*)\/>/g)].map((m) => Object.fromEntries([...m[1]!.matchAll(/([\w-]+)="([^"]*)"/g)].map((a) => [a[1]!, a[2]!])))

/** The serif lines between "Presidente 20xx" and the "2026 · n º turno" line. */
const frameNameLines = (svg: string) => {
  const t = texts(svg)
  return t.slice(t.findIndex((x) => x.startsWith('Presidente')) + 1, t.findIndex((x) => /º turno · /.test(x)))
}
const nameOf = (svg: string) => frameNameLines(svg).join(' ')

/** A bar label: the name (maybe cut with an ellipsis when the segment is narrow) and the percent. */
const label = (s: { label: string; pct: number }) => new RegExp(`^${s.label.slice(0, 3).replace(/[()]/g, '.')}.* ${s.pct}%$`, 'm')

const two = result({}, [[13, 450], [22, 300]])

describe('shareCardSvg: what the picture says', () => {
  it('is a near-square SVG 1080x1070 with an XML-safe root and a title', () => {
    const svg = shareCardSvg(two, opts)
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)
    expect(svg).toContain(`viewBox="0 0 ${SHARE_CARD_SIZE.width} ${SHARE_CARD_SIZE.height}"`)
    expect(svg).toContain(`width="${SHARE_CARD_SIZE.width}"`)
    expect(svg).toContain(`height="${SHARE_CARD_SIZE.height}"`)
    expect(svg).toMatch(/<title>[^<]+<\/title>/)
  })

  it('carries city, UF, cycle, round, shares of voted and not voted, candidates, source and the short address', () => {
    const t = all(shareCardSvg(two, opts))
    expect(t).toContain('Cidade Teste')
    expect(t).toContain('2026 · 2º turno · RJ')
    expect(t).toContain('Presidente 2026')
    expect(t).toContain(`Votaram: ${two.votedPct}% do eleitorado`)
    expect(t).toContain(`Não votaram: ${two.notVotedPct}% do eleitorado`)
    for (const s of two.voted) expect(t).toMatch(label(s))
    expect(t).toContain(`${two.notVoted[0]!.label} ${two.notVoted[0]!.pct}%`)
    expect(t).toContain('Voto a Voto · Fonte: TSE')
    expect(t).toContain('votoavoto.exemplo.br/rj/cidade-teste')
  })

  it('takes every number from the CityResult: the percentages of each bar add up to 100', () => {
    const r = result({ aptos: 12345, comparecimento: 9000, abstencoes: 3345, brancos: 111, nulos: 222, validos: 8667 }, [[13, 4001], [22, 3333], [30, 1333]], ['A Silva', 'B Costa', 'C Dias'])
    const t = all(shareCardSvg(r, opts))
    for (const s of r.voted) expect(t).toMatch(s.key === 'outros' ? new RegExp(`(^|\\s)${s.pct}%$`, 'm') : label(s))
    expect(r.voted.reduce((a, s) => a + s.pct, 0)).toBe(100)
    expect(t).toContain(`Votaram: ${r.votedPct}% do eleitorado`)
    expect(r.votedPct + r.notVotedPct).toBe(100)
  })

  it('round 1 shows the two leaders and one "outros" segment on the bar', () => {
    const r = result({ turno: 1 }, [[13, 300], [22, 250], [30, 100], [40, 60], [50, 40]])
    const t = all(shareCardSvg(r, opts))
    expect(t).toContain('2026 · 1º turno · RJ')
    expect(t).toMatch(/^Ana.* \d+%$/m)
    expect(t).toMatch(/^Bru.* \d+%$/m)
    expect(t).toMatch(/^Out.* \d+%$/m)
    expect(t).not.toContain('Dario')
    expect(r.voted.map((s) => s.pct).reduce((a, b) => a + b, 0)).toBe(100)
  })

  it('has no QR: only text and rectangles, and the address has no scheme', () => {
    const svg = shareCardSvg(two, opts)
    expect(svg).not.toMatch(/<image|<foreignObject|<script|href=/)
    expect(all(svg)).not.toMatch(/https?:\/\//)
    const squares = rects(svg).filter((r) => r.width === r.height && Number(r.width) > 300)
    expect(squares).toEqual([])
  })

  it('draws the fictitious tag and source only for fixture data', () => {
    expect(all(shareCardSvg(two, { ...opts, fixture: true }))).toContain('EXEMPLO')
    expect(all(shareCardSvg(two, { ...opts, fixture: true }))).toContain('Voto a Voto · Dados fictícios. Fonte real: TSE.')
    expect(all(shareCardSvg(two, opts))).not.toMatch(/EXEMPLO|fictício/)
  })

  it('treats both candidates the same: swapping the candidates swaps the labels and nothing else', () => {
    const a = result({}, [[13, 450], [22, 300]], ['Ana Souza', 'Bruno Lima'])
    const b = result({}, [[13, 300], [22, 450]], ['Ana Souza', 'Bruno Lima'])
    const ta = texts(shareCardSvg(a, opts))
    const tb = texts(shareCardSvg(b, opts))
    expect(ta).toHaveLength(tb.length)
    expect(a.voted[0]!.pct).toBe(b.voted[0]!.pct)
    expect(a.voted[0]!.label).toBe('Ana Souza')
    expect(b.voted[0]!.label).toBe('Bruno Lima')
  })
})

describe('shareCardSvg: robustness', () => {
  it('escapes every text (names with & < > quotes and apostrophes)', () => {
    const r = result({}, [[13, 450], [22, 300]], [`Tom & "Jerry" <b>`, "D'Ávila"])
    const svg = shareCardSvg(r, { ...opts, cityName: `Vila <Nova> & "Filhos" D'Oeste`, ufLabel: '<UF>', address: 'x.br/a&b' })
    expect(svg).not.toContain('<b>')
    expect(svg).not.toContain('<Nova>')
    expect(svg).not.toContain('<UF>')
    expect(svg).not.toMatch(/&(?!amp;|lt;|gt;|quot;|#39;)/)
    expect(all(svg)).toMatch(/^Tom & "Jerry".* \d+%$/m)
    expect(all(svg)).toContain('x.br/a&b')
    expect(svg).toContain('&lt;Nova&gt;')
  })

  it('drops characters that are not allowed in XML', () => {
    const svg = shareCardSvg(two, { ...opts, cityName: 'Ba\u0000d\u0008 Name' })
    expect(svg).not.toMatch(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/)
    expect(all(svg)).toContain('Bad Name')
  })

  it('keeps non-ASCII names whole', () => {
    expect(nameOf(shareCardSvg(two, { ...opts, cityName: 'São João d’Aliança' }))).toBe('São João d’Aliança')
  })

  it('wraps a long name onto two lines and never writes text outside the picture', () => {
    const long = 'Santa Rita do Passa Quatro de Nossa Senhora Aparecida dos Milagres'
    const svg = shareCardSvg(two, { ...opts, cityName: long })
    const lines = frameNameLines(svg)
    expect(lines).toHaveLength(2)
    expect(lines.join(' ')).toContain('Santa Rita')
    expect(lines[1]).toMatch(/…$/)
    for (const m of svg.matchAll(/<text\b([^>]*)>([^<]*)<\/text>/g)) {
      const size = Number(/font-size="([\d.]+)"/.exec(m[1]!)![1])
      const x = Number(/\bx="([\d.]+)"/.exec(m[1]!)![1])
      const w = textWidth(m[2]!, size, /font-weight="700"/.test(m[1]!))
      const anchor = /text-anchor="(\w+)"/.exec(m[1]!)?.[1] ?? 'start'
      const [left, right] = anchor === 'end' ? [x - w, x] : anchor === 'middle' ? [x - w / 2, x + w / 2] : [x, x + w]
      expect(left, m[2]).toBeGreaterThanOrEqual(10)
      expect(right, m[2]).toBeLessThanOrEqual(1070)
    }
  })

  it('truncates a name that cannot fit even on two lines, with an ellipsis', () => {
    const svg = shareCardSvg(two, { ...opts, cityName: 'X'.repeat(200) })
    expect(all(svg)).toContain('…')
  })

  it('truncates a very long candidate name in its bar label', () => {
    const r = result({}, [[13, 450], [22, 300]], ['Maria Aparecida de Fátima dos Santos Oliveira Pereira Nunes da Silva', 'B'])
    const t = all(shareCardSvg(r, opts))
    expect(t).toMatch(/…\s?\d+%|^\d+%$/m)
  })

  it('a tie gives both candidates the same bar treatment and the same percent', () => {
    const r = result({}, [[13, 300], [22, 300]])
    const t = all(shareCardSvg(r, opts))
    expect(r.voted.map((s) => s.pct)).toEqual([50, 50])
    expect(t.match(/ 50%/g)).toHaveLength(2)
  })

  it('zero turnout (overseas post): says nobody voted, no candidate percentages, no NaN', () => {
    const r = result({ aptos: 400, comparecimento: 0, abstencoes: 0, brancos: 0, nulos: 0, validos: 0 }, [[13, 0], [22, 0]])
    const svg = shareCardSvg(r, { ...opts, ufLabel: 'Exterior' })
    const t = all(svg)
    expect(t).toContain('2026 · 2º turno · Exterior')
    expect(t).toContain('Votaram: 0% do eleitorado')
    expect(t).toContain('Não votaram: 100% do eleitorado')
    expect(t).toContain('Nenhum voto válido')
    expect(t).toContain('Abstenção 100%')
    expect(svg).not.toMatch(/NaN|undefined|Infinity/)
  })

  it('no electorate: says so and draws no bars', () => {
    const r = result({ aptos: 0, comparecimento: 0, abstencoes: 0, brancos: 0, nulos: 0, validos: 0 }, [])
    const svg = shareCardSvg(r, opts)
    expect(all(svg)).toContain('Sem eleitores aptos registrados')
    expect(svg).not.toMatch(/NaN|undefined|Infinity/)
  })

  it('width and height only scale the output, the drawing stays 1080x1070', () => {
    const svg = shareCardSvg(two, { ...opts, width: 540, height: 535 })
    expect(svg).toContain('width="540"')
    expect(svg).toContain('height="535"')
    expect(svg).toContain(`viewBox="0 0 ${SHARE_CARD_SIZE.width} ${SHARE_CARD_SIZE.height}"`)
  })

  it('uses system font stacks only (no web fonts, no url())', () => {
    const svg = shareCardSvg(two, opts)
    expect(svg).not.toMatch(/@font-face|url\(/)
    expect(svg).toMatch(/font-family="[^"]*Georgia[^"]*"/)
  })

  it('is deterministic and does not touch the DOM', () => {
    expect(shareCardSvg(two, opts)).toBe(shareCardSvg(two, opts))
    expect(typeof document).toBe('undefined')
  })
})

describe('shareCardSvg over the fixture city (the Sketch frame figures)', () => {
  it('draws the numbers of the frame for Cidade Exemplo, round 1 of 2026', async () => {
    const r = (await loadCityResult('rj', 'cidade-exemplo', 2026, 1))!
    const t = all(shareCardSvg(r, { cityName: 'Cidade Exemplo', ufLabel: 'RJ', address: 'votoavoto.exemplo.br/rj/cidade-exemplo', fixture: true }))
    for (const s of ['Votaram: 70% do eleitorado', 'Não votaram: 30% do eleitorado', 'Candidato A 52%', 'Candidato B 48%', 'Abstenção 78%', '2026 · 1º turno · RJ', 'votoavoto.exemplo.br/rj/cidade-exemplo']) expect(t, s).toContain(s)
  })
})

describe('the short address', () => {
  const addrLines = (svg: string) => texts(svg).filter((t) => t.includes('votoavoto'))
  it('is written whole when it fits, at a smaller size when needed', () => {
    expect(addrLines(shareCardSvg(two, opts))).toEqual([opts.address])
    expect(addrLines(shareCardSvg(two, { ...opts, address: 'votoavoto.exemplo.br/rj/' + 'a'.repeat(25) }))).toHaveLength(1)
  })
  it('a very long address goes onto two lines after a slash or hyphen, without losing characters', () => {
    const address = 'votoavoto.exemplo.br/voto-a-voto/sp/santa-rita-do-passa-quatro-de-nossa-senhora-aparecida'
    const lines = texts(shareCardSvg(two, { ...opts, address })).filter((t) => /votoavoto|aparecida|senhora/.test(t) && !t.includes('Santa'))
    expect(lines).toHaveLength(2)
    expect(lines.join('')).toBe(address)
  })
})

describe('textWidth (conservative estimate used to fit text)', () => {
  it('grows with size, with length and with bold; wide letters cost more than narrow ones', () => {
    expect(textWidth('abc', 20)).toBeLessThan(textWidth('abc', 40))
    expect(textWidth('abc', 20)).toBeLessThan(textWidth('abcd', 20))
    expect(textWidth('abc', 20)).toBeLessThan(textWidth('abc', 20, true))
    expect(textWidth('iii', 20)).toBeLessThan(textWidth('WWW', 20))
    expect(textWidth('', 20)).toBe(0)
  })
})