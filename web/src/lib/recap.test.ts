import { describe, expect, it } from 'vitest'
import { buildCycleBlocks, type RunoffTally } from './compare'
import { buildRecap, span } from './recap'
import { recapChange, recapHeadline, recapSubtitle } from './sentences/recap'
import { recapCardSvg } from './recap-card'
import { recapContent, recapUrl } from './recap-content'
import { loadRecap, recapUfs } from './recap-data'
import { readSvgKeys, svgTexts } from './card-keys'

const tally = (validos: number, left: number, rival: number): RunoffTally => ({ validos, left, rival })
const labels = (l: string, r: string) => ({ left: l, rival: r })
const blocks = (t: Record<number, RunoffTally>) =>
  buildCycleBlocks({ tallies: new Map(Object.entries(t).map(([k, v]) => [Number(k), v])), labels: { 2018: labels('Lula', 'Bolsonaro'), 2022: labels('Lula', 'Bolsonaro'), 2026: labels('Lula', 'Flavio') } })
// A state: 2018 left 32.0281%, 2022 44.7609%, 2026 46.2%.
const three = { 2018: tally(1_000_000, 320_281, 679_719), 2022: tally(1_000_000, 447_609, 552_391), 2026: tally(1_000_000, 462_000, 538_000) }
const place = { stateName: 'São Paulo' }

describe('the recap numbers', () => {
  const recap = buildRecap('sp', blocks(three), { pt2018: true })
  it('the 2018 pair is labelled PT and Bolsonaro; the other cycles keep the dataset names', () => {
    expect(recap.rows.map((r) => [r.left!.label, r.rival!.label])).toEqual([['PT', 'Bolsonaro'], ['Lula', 'Bolsonaro'], ['Lula', 'Flavio']])
    expect(buildRecap('sp', blocks(three), { pt2018: false }).rows[0]!.left!.label).toBe('Lula')
  })
  it('percents have one decimal and the two sides of a bar add up to 100,0', () => {
    expect(recap.rows.map((r) => [r.left!.pct, r.rival!.pct])).toEqual([['32,0', '68,0'], ['44,8', '55,2'], ['46,2', '53,8']])
    for (const r of recap.rows) expect(r.left!.tenths + r.rival!.tenths).toBe(1000)
  })
  it('changes come from the UNROUNDED shares: 44,7609 - 32,0281 is +12,7 although the rounded shares differ by 12,8', () => {
    expect(recap.rows.map((r) => r.changePp)).toEqual([undefined, '+12,7', '+1,4'])
    expect(recap.rows.map((r) => r.changeVs)).toEqual([undefined, 2018, 2022])
  })
  it('a negative change keeps its sign, and a cycle without data is "sem dados" with the next change against the last cycle that has data', () => {
    const r = buildRecap('mt', blocks({ 2018: tally(1000, 600, 400), 2026: tally(1000, 500, 500) }), { pt2018: true })
    expect(r.rows.map((x) => x.status)).toEqual(['data', 'no-data', 'data'])
    expect(r.rows[2]).toMatchObject({ changePp: '-10,0', changeVs: 2018 })
    expect(r.rows[1]!.left).toBeUndefined()
    expect(span(r)).toEqual({ first: 2018, last: 2026 })
  })
  it('one cycle only: no change at all, the series starts there', () => {
    const r = buildRecap('mt', blocks({ 2026: tally(1000, 500, 500) }), { pt2018: false })
    expect(r.rows.map((x) => x.changePp)).toEqual([undefined, undefined, undefined])
    expect(recapChange(r.rows[2]!)).toBe('Ponto de partida da série')
    expect(recapChange(r.rows[0]!)).toBe('sem dados')
  })
})

describe('the recap words', () => {
  const recap = buildRecap('sp', blocks(three), { pt2018: true })
  it('the headline reads the bars aloud, the same words for both sides, with no winner and no cause', () => {
    expect(recapHeadline(recap, place)).toBe('Em São Paulo, no 2º turno, os votos válidos foram: 2018, PT 32,0% e Bolsonaro 68,0%; 2022, Lula 44,8% e Bolsonaro 55,2%; 2026, Lula 46,2% e Flavio 53,8%.')
    for (const register of ['standard', 'plain'] as const) expect(recapHeadline(recap, { ...place, register })).not.toMatch(/vence|venceu|ganhou|porque|passou de/i)
  })
  it('the plain register says the same figures', () => {
    expect(recapHeadline(recap, { ...place, register: 'plain' })).toBe('Em São Paulo, no 2º turno, estes foram os votos dados a candidatos: em 2018, PT teve 32,0% e Bolsonaro teve 68,0%; em 2022, Lula teve 44,8% e Bolsonaro teve 55,2%; em 2026, Lula teve 46,2% e Flavio teve 53,8%.')
  })
  it('lists only the cycles that have data, and says so when none has', () => {
    expect(recapHeadline(buildRecap('mt', blocks({ 2026: tally(1000, 500, 500) }), { pt2018: false }), { stateName: 'Mato Grosso' })).toBe('Em Mato Grosso, no 2º turno, os votos válidos foram: 2026, Lula 50,0% e Flavio 50,0%.')
    expect(recapHeadline(buildRecap('mt', blocks({}), { pt2018: false }), { stateName: 'Mato Grosso' })).toBe('Sem dados do 2º turno em Mato Grosso.')
  })
  it('the subtitle and the change lines', () => {
    expect(recapSubtitle(recap, place)).toBe('São Paulo · Presidente, 2º turno, 2018 a 2026')
    expect(recap.rows.map((r) => recapChange(r))).toEqual(['Ponto de partida da série', '+12,7 pp vs 2018', '+1,4 pp vs 2022'])
  })
})

describe('the recap picture and content', () => {
  const recap = buildRecap('sp', blocks(three), { pt2018: true })
  const opts = { stateName: 'São Paulo', origin: 'https://votoavoto.exemplo.br', base: '/', fixture: true, edition: '2026-10-26' }
  const content = recapContent(recap, opts)
  it('carries the headline as the text alternative, the three rows, the base of the percentages, the address and the source', () => {
    const t = svgTexts(content.svg)
    expect(content.svg).toContain(`<title id="card-title">${content.variants.standard.alt}</title>`)
    expect(t.join(' ')).toContain('Base: votos válidos do 2º turno, sem o exterior')
    for (const label of ['2018', '2022', '2026', 'Ponto de partida da série', '+12,7 pp vs 2018', 'PT 32,0%', 'Bolsonaro 68,0%', 'Flavio 53,8%', 'votoavoto.exemplo.br/sp/resumo']) expect(t, label).toContain(label)
    expect(t.join(' ')).toContain('Dados fictícios. Fonte real: TSE.')
    expect(t).toContain('EXEMPLO')
  })
  it('is self-describing (keys of view "recap" and the state) and shares the text with the link', () => {
    expect(readSvgKeys(content.svg)).toEqual({ ok: true, keys: { view: 'recap', places: ['sp'], edition: '2026-10-26', lang: 'pt-BR' } })
    expect(content.variants.standard.text.endsWith('https://votoavoto.exemplo.br/sp/resumo/')).toBe(true)
    expect(content.filename).toBe('voto-a-voto-sp-resumo-do-estado.png')
    expect(recapUrl('https://x.br', '/voto-a-voto-oss/', 'rj')).toBe('https://x.br/voto-a-voto-oss/rj/resumo/')
  })
  it('a cycle without data draws "sem dados" and no bar, never zeros', () => {
    const r = buildRecap('mt', blocks({ 2026: tally(1000, 500, 500) }), { pt2018: false })
    const svg = recapCardSvg(r, { stateName: 'Mato Grosso', address: 'votoavoto.exemplo.br/mt/resumo' }).svg
    expect(svgTexts(svg).filter((x) => x === 'sem dados')).toHaveLength(2)
    expect(svg).not.toMatch(/ 0,0%/)
  })
  it('keeps every line inside the card, in a state with a long name', () => {
    const long = recapCardSvg(recap, { stateName: 'Estado de Nome Muito Mas Muito Comprido Mesmo', address: 'votoavoto.exemplo.br/sp/resumo' })
    expect(long.height).toBeGreaterThan(900)
    expect(long.svg).toContain(`viewBox="0 0 1080 ${long.height}"`)
  })
})

describe('the dataset', () => {
  it('every state of the fixture has a recap, with the overseas post left out of the totals', async () => {
    const ufs = await recapUfs()
    expect(ufs).not.toContain('zz')
    expect(ufs).toEqual(expect.arrayContaining(['rj', 'sp', 'mt']))
    const rj = (await loadRecap('rj'))!
    expect(rj.rows.map((r) => r.status)).toEqual(['data', 'data', 'data'])
    const mt = (await loadRecap('mt'))!
    expect(mt.rows.map((r) => r.status)).toEqual(['no-data', 'no-data', 'data'])
    expect(await loadRecap('xx')).toBeUndefined()
  })
  it('the fixture pairs by the two leaders, so its 2018 sides keep the dataset names (PT only where 13 ran against 17)', async () => {
    const rj = (await loadRecap('rj'))!
    expect(rj.rows[0]!.left!.label).not.toBe('PT')
  })
})
