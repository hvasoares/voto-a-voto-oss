import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createStore } from '@/data/store'
import { diskSource } from '@/data/node'
import type { Candidate, State, Turnout, Vote } from '@/data'
import { buildBrasil, type BrasilView } from './brasil'
import { brasilCardSvg } from './brasil-card'
import { brasilContent, brasilUrl } from './brasil-content'
import { barText } from './brasil-label'
import { readSvgKeys, svgTexts } from './card-keys'
import { textWidth } from './share-picture'
import { brasilAlt, brasilHeadline, regionSentence } from './sentences/brasil'

/*
 * The share of /brasil/ (#91): the words, the picture and the labels of its bars, over a hand-made national result with the REAL widest names
 * (Lula, Flávio Bolsonaro; 2026). The numbers are the page's: everything below reads the same BrasilView the page prints.
 */
const REGIONS = [
  ['sudeste', 'sp', 4_100_000, 3_200_000, 2_000_000, 1_800_000],
  ['nordeste', 'ba', 2_850_000, 2_400_000, 1_500_000, 700_000],
  ['sul', 'rs', 1_470_000, 1_200_000, 450_000, 750_000],
  ['norte', 'pa', 810_000, 640_000, 320_000, 320_000],
  ['centro-oeste', 'go', 760_000, 620_000, 248_000, 372_000],
] as const
const STATES: State[] = [...REGIONS.map(([regiao, uf]) => ({ uf, regiao, municipios: 1 })), { uf: 'zz', regiao: 'exterior', municipios: 1 }]
const turnout = (uf: string, aptos: number, comparecimento: number, validos: number): Turnout => ({ ano: 2026, turno: 2, uf, cdMunicipio: `${uf}1`, aptos, comparecimento, abstencoes: aptos - comparecimento, brancos: 1000, nulos: 2000, anuladosApuSep: 0, validos })
const vote = (uf: string, numero: number, votos: number): Vote => ({ ano: 2026, turno: 2, uf, cdMunicipio: `${uf}1`, candidatoNumero: numero, votos })
const NAMES: Candidate[] = [
  { ano: 2026, turno: 2, candidatoNumero: 13, nomeUrna: 'LULA', partido: 'PT' },
  { ano: 2026, turno: 2, candidatoNumero: 22, nomeUrna: 'FLAVIO BOLSONARO', partido: 'PL' },
]
const view: BrasilView = buildBrasil({
  ano: 2026,
  turno: 2,
  states: STATES,
  turnout: [...REGIONS.map(([, uf, aptos, comp, a, b]) => turnout(uf, aptos, comp, a + b)), turnout('zz', 300, 200, 190)],
  votes: [...REGIONS.flatMap(([, uf, , , a, b]) => [vote(uf, 13, a), vote(uf, 22, b)]), vote('zz', 13, 100), vote('zz', 22, 90)],
  candidates: NAMES,
})
const options = { origin: 'https://votoavoto.exemplo.br', base: '/', fixture: false, edition: '2026-10-26' }

describe('the words of the share', () => {
  const [a, b] = view.nationalCandidates
  it('the headline reads the national bar aloud: ballot order, the same words for both, the numbers the page prints', () => {
    expect(brasilHeadline(view)).toBe(`No Brasil, no 2º turno de 2026, os votos válidos foram: Lula ${a!.pctText}% e Flávio Bolsonaro ${b!.pctText}%.`)
    expect(a!.pctText).toMatch(/^\d\d,\d\d$/)
  })
  it('names no winner, no ranking and no cause, in either register', () => {
    for (const register of ['standard', 'plain'] as const) {
      const alt = brasilAlt(view, { register })
      expect(alt).not.toMatch(/vence|venceu|ganhou|ganhador|vencedor|lidera|à frente|porque|por causa|primeiro|segundo lugar|ranking/i)
      expect(brasilHeadline(view, { register })).not.toMatch(/vence|ganhou|à frente|porque/i)
    }
  })
  it('the text alternative states every number of the page: national shares, each region\'s shares and turnout', () => {
    const alt = brasilAlt(view)
    for (const r of view.regions) {
      expect(alt).toContain(regionSentence(r))
      for (const n of [r.candidates[0]!.pctText, r.candidates[1]!.pctText, r.compareceramText, r.naoText]) expect(alt).toContain(`${n}%`)
    }
    expect(alt.startsWith(brasilHeadline(view))).toBe(true)
  })
  it('the plain register says the same figures in short sentences', () => {
    const alt = brasilAlt(view, { register: 'plain' })
    for (const r of view.regions) for (const n of [r.candidates[0]!.pctText, r.compareceramText, r.naoText]) expect(alt).toContain(`${n}%`)
    expect(alt).toContain('Foram votar')
  })
  it('the share text is the headline and the page address, nothing else', () => {
    const c = brasilContent(view, options)
    expect(c.variants.standard.text).toBe(`${brasilHeadline(view)} https://votoavoto.exemplo.br/brasil/`)
    expect(c.variants.plain.text.endsWith(' https://votoavoto.exemplo.br/brasil/')).toBe(true)
    expect(brasilUrl('https://x.br', '/voto-a-voto-oss/')).toBe('https://x.br/voto-a-voto-oss/brasil/')
  })
})

describe('the picture', () => {
  const c = brasilContent(view, options)
  const texts = svgTexts(c.svg)
  it('is 1080 wide, carries the alternative as its title and the source and edition lines the other pictures carry', () => {
    expect(c.svg).toContain('width="1080"')
    expect(c.svg).toContain(`<title id="card-title">${c.variants.standard.alt}</title>`)
    expect(texts).toContain('votoavoto.exemplo.br/brasil')
    expect(texts.join(' ')).toContain('Fonte: TSE')
  })
  it('prints the numbers of the page: national bar, one bar per region and the turnout in text', () => {
    const joined = texts.join(' ')
    for (const k of view.nationalCandidates) expect(joined).toContain(`${k.pctText}%`)
    for (const r of view.regions) {
      expect(joined).toContain(`${r.shareText}% dos votos válidos do país`)
      expect(joined).toContain(`Compareceram ${r.compareceramText}% · Não compareceram ${r.naoText}%`)
    }
    // one bar per region: two candidate rectangles each, plus the national one: no third band
    expect(c.svg.match(/fill="#b02b27"/g)).toHaveLength(1 + view.regions.length)
    expect(c.svg.match(/fill="#0c54a0"/g)).toHaveLength(1 + view.regions.length)
  })
  it('never cuts a candidate name: a long name wraps or shortens, and there is no ellipsis anywhere', () => {
    expect(texts.join(' ')).not.toContain('…')
    expect(texts.join(' ')).toMatch(/Flávio|Bolsonaro/)
  })
  it('is self-describing: keys of view "brasil" and no place, and it draws a sample text inside its width', () => {
    expect(readSvgKeys(c.svg)).toEqual({ ok: true, keys: { view: 'brasil', places: [], edition: '2026-10-26', lang: 'pt-BR' } })
    expect(c.filename).toBe('voto-a-voto-brasil-2026-turno-2.png')
    for (const t of texts) expect(textWidth(t, 28)).toBeLessThan(1080)
  })
  it('the fixture draws the EXEMPLO tag and the fictitious-data line', () => {
    const f = svgTexts(brasilCardSvg(view, { address: 'votoavoto.exemplo.br/brasil', fixture: true }).svg)
    expect(f).toContain('EXEMPLO')
    expect(f.join(' ')).toContain('Dados fictícios. Fonte real: TSE.')
  })
})

describe('the text of a bar segment', () => {
  const lula = { labelFull: 'Lula', label: 'Lula', pctText: '47,2' }
  const flavio = { labelFull: 'Flávio Bolsonaro', label: 'Flávio', pctText: '52,8' }
  const width = (s: string) => s.length * 7 + 10
  it('prints the whole name and share when the segment holds it', () => {
    expect(barText(lula, 47.2)).toBe('Lula 47,2%')
    expect(barText(flavio, 52.8)).toBe('Flávio Bolsonaro 52,8%')
  })
  it('gives way to the short form, then to the share alone, then to nothing, and never to an ellipsis', () => {
    const small = { ...flavio, pctText: '30,6' }
    expect(barText(small, 30.6)).toBe('Flávio 30,6%')
    expect(barText(small, 14)).toBe('30,6%')
    expect(barText(small, 4)).toBe('')
    for (const share of [3, 6, 10, 15, 20, 30, 50, 70, 88]) expect(barText(flavio, share)).not.toContain('…')
  })
  it('the text always fits its segment on a 350 px bar (one line, 13 px bold)', () => {
    for (let share = 5; share <= 95; share += 1)
      for (const c of [lula, flavio]) {
        const t = barText(c, share)
        if (t) expect(width(t), `${c.labelFull} at ${share}%`).toBeLessThanOrEqual((share / 100) * 350 - 2)
      }
  })
})

describe('the picture from the REAL national result (../data, 2026 round 2)', () => {
  const realData = resolve('..', 'data')
  it.runIf(existsSync(resolve(realData, 'manifest.json')))('draws the real numbers, names both candidates in full or in the table\'s short form, never cut', async () => {
    const store = createStore(diskSource(realData))
    const [states, t, v, c] = await Promise.all([store.states(), store.turnout({ ano: 2026, turno: 2 }), store.votes({ ano: 2026, turno: 2 }), store.candidates({ ano: 2026, turno: 2 })])
    const real = buildBrasil({ ano: 2026, turno: 2, states, turnout: t, votes: v, candidates: c })
    const content = brasilContent(real, options)
    const texts = svgTexts(content.svg)
    const [lula, flavio] = real.nationalCandidates
    expect(content.variants.standard.text).toBe(`No Brasil, no 2º turno de 2026, os votos válidos foram: Lula ${lula!.pctText}% e Flávio Bolsonaro ${flavio!.pctText}%. https://votoavoto.exemplo.br/brasil/`)
    // every shown share is in the picture's text and in the alternative; nothing is cut
    for (const r of real.regions) for (const k of r.candidates) expect(content.variants.standard.alt).toContain(`${k.pctText}%`)
    expect(texts.join(' ')).not.toContain('…')
    // the widest real names, at every region's share, always keep the share and either the whole name, a wrapped name or the short form
    for (const r of real.regions) for (const k of r.candidates) expect(texts.some((x) => x.includes(`${k.pctText}%`)), `${r.label} ${k.labelFull}`).toBe(true)
    for (const x of texts) expect(textWidth(x, 28), x).toBeLessThan(1080 - 98)
    expect(content.height).toBeLessThan(1800)
  })
})
