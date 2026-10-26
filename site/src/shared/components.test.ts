import { describe, expect, it } from 'vitest'
import { candidateRow, roundTabs, segmentText, turnoutBar } from './components'

const text = (markup: { value: string }) => markup.value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

describe('turnoutBar', () => {
  const props = {
    votedPct: 70,
    notVoted: { abstencaoPct: 78, brancosPct: 10, nulosPct: 12 },
    candidates: { a: { label: 'Candidato A', pct: 52 }, b: { label: 'Candidato B', pct: 48 } },
  }
  it('shows both headings and the frame segment texts', () => {
    const t = text(turnoutBar(props))
    expect(t).toContain('Votaram · 70% do eleitorado')
    expect(t).toContain('Não votaram · 30% do eleitorado')
    expect(t).toContain('A 52% dos votos')
    expect(t).toContain('B 48% dos votos')
    expect(t).toContain('Abstenção 78% dos que não votaram')
    expect(t).toContain('Br')
    expect(t).toContain('Nu')
  })
  it('sizes segments by their percent and carries the full text in the title', () => {
    const out = turnoutBar(props).value
    expect(out).toMatch(/bar__seg--a" style="flex-grow:52" title="Candidato A: 52% dos votos"/)
    expect(out).toMatch(/bar__seg--nulos" style="flex-grow:12" title="Nulos: 12% dos que não votaram"/)
  })
  it('draws no segment for a part of 0% but never drops the others', () => {
    const out = turnoutBar({ ...props, notVoted: { abstencaoPct: 100, brancosPct: 0, nulosPct: 0 } }).value
    expect(out).not.toContain('bar__seg--brancos')
    expect(out).toContain('bar__seg--abstencao')
  })
  it('round 1: a third "Outros" segment next to the two leaders', () => {
    const out = turnoutBar({ ...props, candidates: { a: { label: 'Lula', pct: 50 }, b: { label: 'Flavio', pct: 40 } }, others: { label: 'Outros candidatos (10)', pct: 10 } }).value
    expect(out).toContain('bar__seg--outros" style="flex-grow:10" title="Outros candidatos (10): 10% dos votos"')
  })
  it('escapes names', () => {
    expect(turnoutBar({ ...props, candidates: { a: { label: '<b>x</b>', pct: 52 }, b: props.candidates.b } }).value).not.toContain('<b>x</b>')
  })
})

describe('segmentText: the text shrinks with the segment', () => {
  it('candidates', () => {
    expect(segmentText('a', 52)).toBe('A  52% dos votos')
    expect(segmentText('a', 20)).toBe('A  20%')
    expect(segmentText('a', 8)).toBe('A')
    expect(segmentText('a', 3)).toBe('')
  })
  it('not-voted parts', () => {
    expect(segmentText('abstencao', 78)).toBe('Abstenção 78% dos que não votaram')
    expect(segmentText('abstencao', 40)).toBe('Abstenção 40%')
    expect(segmentText('brancos', 10)).toBe('Br')
    expect(segmentText('nulos', 12)).toBe('Nu')
    expect(segmentText('nulos', 4)).toBe('')
  })
})

describe('candidateRow', () => {
  it('is a legend row: swatch, name, votes with thousands dots, share', () => {
    const out = candidateRow({ kind: 'a', label: 'Candidato A', votes: 36400, shareLabel: '52% dos votos' })
    expect(out.value).toContain('legend__swatch--a')
    expect(text(out)).toBe('Candidato A 36.400 · 52% dos votos')
  })
})

describe('roundTabs', () => {
  it('are plain links; the active one is marked', () => {
    const out = roundTabs({ active: 2, hrefFor: (t) => `/x/?turno=${t}` }).value
    expect(out).toContain('href="/x/?turno=1"')
    expect(out).toMatch(/href="\/x\/\?turno=2"[^>]*aria-current="true"/)
    expect(out).toMatch(/href="\/x\/\?turno=1"[^>]*aria-current="false"/)
    expect(text({ value: out })).toBe('1º turno 2º turno')
  })
})
