import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { Candidate, Turnout, Vote } from '../data'
import { buildBrasil } from '../lib/brasil'
import { shortName as compareShort } from '../lib/compare'
import { shareCardSvg } from '../lib/share-card'
import { stateMapData } from '../lib/state-map-data'
import { cityMapData } from '../lib/city-map-data'
import { computeMargins } from '../lib/margins'
import { orderedSides, sideText } from '../slots/city-cycles/cycles-model'
import { cycleBlock } from '../slots/city-cycles/cycles-view'
import { buildCityResult } from './city-model'
import { toLegendRows, toTurnoutBarProps } from './city-figures'
import { candidateRow, turnoutBar } from './components'
import { candidateName } from './candidate-name'
import { CANDIDATES, identityOf, identityOfUrna, sideTone, type RunoffCycle } from './candidates'
import { colors } from './tokens'
import { BIN_COLOR } from '../lib/scale'

/*
 * The identity table (#84) is the ONE source of how the site spells and colours the two runoff candidates of a cycle. These tests
 * feed the same two candidates to every screen that names them and demand the table's words and colours back: a screen that
 * keeps a spelling of its own fails here.
 */
const CYCLES = [2018, 2022, 2026] as const
const SPELLINGS = [...new Set(CYCLES.flatMap((ano) => CANDIDATES[ano].flatMap((c) => [c.name, c.short])))]

const candidatesOf = (ano: RunoffCycle): Candidate[] => CANDIDATES[ano].map((c) => ({ ano, turno: 2, candidatoNumero: c.numero, nomeUrna: c.urna, partido: 'P' }))
const turnout = (ano: number, turno: 1 | 2, uf = 'rj', cd = '1'): Turnout => ({ ano, turno, uf, cdMunicipio: cd, aptos: 1000, comparecimento: 800, abstencoes: 200, brancos: 20, nulos: 30, anuladosApuSep: 0, validos: 750 })
const votesOf = (ano: RunoffCycle, turno: 1 | 2, uf = 'rj', cd = '1'): Vote[] => CANDIDATES[ano].map((c, i) => ({ ano, turno, uf, cdMunicipio: cd, candidatoNumero: c.numero, votos: i === 0 ? 400 : 350 }))
/** The result of the runoff of `ano` in one city, with the two candidates as the data names them. */
const resultOf = (ano: RunoffCycle) => buildCityResult({ turnout: turnout(ano, 2), votes: votesOf(ano, 2), candidates: candidatesOf(ano) })

describe('the identity table', () => {
  it.each(CYCLES)('%i: two candidates, the lower ballot number on side a (red), the other on side b (blue)', (ano) => {
    const [a, b] = CANDIDATES[ano]
    expect(a.numero).toBeLessThan(b.numero)
    expect([a.side, b.side]).toEqual(['a', 'b'])
    expect([a.color, b.color]).toEqual(['lula', 'bolsonaro'])
    expect(colors[a.color]).toBe(colors['cand-a'])
    expect(colors[b.color]).toBe(colors['cand-b'])
  })

  it('spells each ballot name one way in every cycle, with the accent people write', () => {
    expect(CYCLES.map((ano) => CANDIDATES[ano].map((c) => c.name))).toEqual([['Fernando Haddad', 'Jair Bolsonaro'], ['Lula', 'Jair Bolsonaro'], ['Lula', 'Flávio Bolsonaro']])
    expect(CYCLES.map((ano) => CANDIDATES[ano].map((c) => c.short))).toEqual([['Haddad', 'Bolsonaro'], ['Lula', 'Bolsonaro'], ['Lula', 'Flávio']])
    const byUrna = new Map<string, string>()
    for (const c of CYCLES.flatMap((ano) => CANDIDATES[ano])) expect(byUrna.get(c.urna) ?? c.name).toBe((byUrna.set(c.urna, c.name), c.name))
  })

  it('finds a candidate by (cycle, number) and by ballot name; anyone else is spelled generically', () => {
    expect(identityOf(2018, 13)?.name).toBe('Fernando Haddad')
    expect(identityOfUrna('flavio bolsonaro')?.name).toBe('Flávio Bolsonaro')
    expect(identityOf(2022, 17)).toBeUndefined()
    expect(candidateName('CIRO GOMES')).toBe('Ciro Gomes')
    expect(candidateName('CIRO GOMES', 'short')).toBe('Ciro')
    expect(candidateName('Candidato A', 'short')).toBe('A')
  })

  it('a round 1 runner-up never wears the colour of a runoff candidate', () => {
    expect(sideTone(2022, 13, 12, 'b')).toBe('a')
    expect(sideTone(2022, 12, 13, 'a')).toBe('outros')
    expect(sideTone(2022, 91, 92, 'b')).toBe('b')
  })

  it('the map\'s strongest steps are the pair\'s own red and blue', () => {
    expect(colors['div-pos-3']).toBe(colors[CANDIDATES[2026][0].color])
    expect(colors['div-neg-3']).toBe(colors[CANDIDATES[2026][1].color])
    expect(BIN_COLOR.pos3).toContain('div-pos-3')
  })
})

describe.each(CYCLES)('the same words and colours on every screen: %i', (ano) => {
  const [a, b] = CANDIDATES[ano]
  const textOf = (markup: { value: string }) => markup.value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

  it('City card: bars and legend name them from the table, each in its own colour', () => {
    const result = resultOf(ano)
    const bars = turnoutBar(toTurnoutBarProps(result)).value
    expect(bars).toMatch(new RegExp(`bar__seg--a"[^>]*>${a.name} \\d+%<`))
    expect(bars).toMatch(new RegExp(`bar__seg--b"[^>]*>${b.name.replace(' ', '\\s')} \\d+%<|bar__seg--b"[^>]*>${b.name.split(' ')[0]}\\s`))
    const legend = toLegendRows(result).slice(0, 2).map((r) => candidateRow(r).value)
    expect(legend[0]).toContain('legend__swatch--a')
    expect(legend[0]).toContain(`>${a.name}<`)
    expect(legend[1]).toContain('legend__swatch--b')
    expect(legend[1]).toContain(`>${b.name}<`)
  })

  it('City card: the colour follows the candidate when the other one leads the city', () => {
    const swapped = buildCityResult({ turnout: turnout(ano, 2), votes: votesOf(ano, 2).map((v, i) => ({ ...v, votos: i === 0 ? 300 : 450 })), candidates: candidatesOf(ano) })
    const bars = turnoutBar(toTurnoutBarProps(swapped)).value
    // the leader (candidate b) comes first in the card, and it is still blue
    expect(bars.indexOf('bar__seg--b')).toBeLessThan(bars.indexOf('bar__seg--a'))
    expect(bars).toMatch(new RegExp(`bar__seg--b"[^>]*>${b.name.split(' ')[0]}`))
  })

  it('three-cycle page: sides in ballot order with the table\'s names and colours', () => {
    const sides = orderedSides(resultOf(ano))
    expect(sides.map((s) => [s.label, s.tone, s.short])).toEqual([[a.name, 'a', a.short], [b.name, 'b', b.short]])
    expect(sideText({ ...sides[0]!, pct: 55 })).toBe(`${a.name} 55%`)
    const html = cycleBlock({ status: 'data', ano, turno: 2, votedPct: 70, notVotedPct: 30, validos: 100, sides, notVoted: [] }).value
    expect(html).toContain('bar__seg--a')
    expect(html).toContain('bar__seg--b')
    // a narrow side gives way to the table's short form, never to a first word that differs from the other side's spelling
    expect(sideText({ ...sides[0]!, pct: 30 })).toBe(`${a.short} 30%`)
  })

  it('maps (state and city): short and complete names from the table', () => {
    const rows = [...votesOf(ano, 1), ...votesOf(ano, 2)]
    const state = stateMapData([turnout(ano, 1), turnout(ano, 2)], rows, candidatesOf(ano), ano)
    expect([state.ladoANome, state.ladoBNome, state.ladoANomeCompleto, state.ladoBNomeCompleto]).toEqual([a.short, b.short, a.name, b.name])
    const m = computeMargins({ ano, turnout: [turnout(ano, 1), turnout(ano, 2)], votes: rows, candidates: candidatesOf(ano) })
    const city = cityMapData([turnout(ano, 1), turnout(ano, 2)], rows, [], ano, 'rj', m)
    expect([city.ladoANome, city.ladoBNome, city.ladoANomeCompleto, city.ladoBNomeCompleto]).toEqual([a.short, b.short, a.name, b.name])
  })

  it('/brasil/: full and short names from the table', () => {
    const view = buildBrasil({ ano, turno: 2, states: [{ uf: 'rj', regiao: 'sudeste', municipios: 1 }], turnout: [turnout(ano, 2)], votes: votesOf(ano, 2), candidates: candidatesOf(ano) })
    expect(view.nationalCandidates.map((c) => [c.labelFull, c.label])).toEqual([[a.name, a.short], [b.name, b.short]])
    expect(view.regions[0]!.candidates.map((c) => [c.labelFull, c.label])).toEqual([[a.name, a.short], [b.name, b.short]])
  })

  it('/comparar/: the short label of a ballot name', () => {
    expect([compareShort(a.urna), compareShort(b.urna)]).toEqual([a.short, b.short])
  })

  it('share picture and link preview: the names read from the result, the fill is the pair\'s colour', () => {
    const result = resultOf(ano)
    const svg = shareCardSvg(result, { cityName: 'Cidade', ufLabel: 'RJ', alt: 'x', address: 'a.b/c' })
    expect(svg).toContain(`fill="${colors[a.color]}"`)
    expect(svg).toContain(`fill="${colors[b.color]}"`)
    expect(svg).toContain(`>${a.name.split(' ')[0]}`)
    expect(svg).toContain(`>${b.name.split(' ')[0]}`)
  })

  it('no screen spells them otherwise: the same words in the text of the card', () => {
    const t = textOf(turnoutBar(toTurnoutBarProps(resultOf(ano))))
    expect(SPELLINGS.some((s) => t.includes(s))).toBe(true)
    expect(t).not.toMatch(/Flavio|Fernando Haddad Fernando/)
  })
})

describe('nothing else spells or colours a candidate', () => {
  const SRC = join(import.meta.dirname, '..')
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => {
      const p = join(dir, f)
      return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx|astro)$/.test(f) && !/\.test\./.test(f) ? [p] : []
    })
  const sources = files(SRC).filter((p) => !p.endsWith(join('shared', 'candidates.ts')))

  it('no source file holds a string literal that spells a runoff candidate (the table does)', () => {
    const spelling = /['"`][^'"`\n]*\b(Flavio|Flávio|Haddad|Fernando|Jair Bolsonaro|Lula)\b[^'"`\n]*['"`]/
    const hits = sources.flatMap((p) =>
      readFileSync(p, 'utf8')
        .split('\n')
        .map((line, i) => [i + 1, line] as const)
        .filter(([, line]) => !/^\s*(\*|\/\/|\/\*)/.test(line) && spelling.test(line.replace(/\/\/.*$/, '')))
        .map(([n]) => `${relative(SRC, p)}:${n}`),
    )
    expect(hits).toEqual([])
  })

  it('no stylesheet or component pins a hex for the pair: colours come from the tokens', () => {
    const hex = new RegExp(`${colors.lula}|${colors.bolsonaro}`, 'i')
    const hits = sources.filter((p) => p !== join(SRC, 'shared', 'tokens.ts') && hex.test(readFileSync(p, 'utf8'))).map((p) => relative(SRC, p))
    expect(hits).toEqual([])
  })
})
