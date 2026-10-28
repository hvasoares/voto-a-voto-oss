import { describe, expect, it } from 'vitest'
import { candidateRow, roundTabs, segmentText, turnoutBar , cycleTabs } from './components'

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
    expect(t).toContain('Candidato A 52%')
    expect(t).toContain('Candidato B 48%')
    expect(t).not.toContain('dos votos')
    expect(t).toContain('Abstenção 78% dos que não votaram')
    expect(t).toContain('Br')
    expect(t).toContain('Nu')
  })
  it('names the candidates in the picture\'s text alternative, with the shares, in ballot order', () => {
    const out = turnoutBar({ ...props, candidates: { a: { label: 'Lula', pct: 52 }, b: { label: 'Flavio Bolsonaro', pct: 48 } } }).value
    expect(out).toContain('aria-label="Votaram, por candidato: Lula 52%, Flavio Bolsonaro 48% dos votos"')
  })
  it('sizes segments by their percent; the title appears only when the text gave way', () => {
    const out = turnoutBar(props).value
    expect(out).toMatch(/bar__seg--a" style="flex-grow:52">Candidato A 52%</)
    const narrow = turnoutBar({ ...props, candidates: { a: { label: 'Flavio Bolsonaro', pct: 20 }, b: { label: 'Lula', pct: 80 } } }).value
    expect(narrow).toMatch(/bar__seg--a" style="flex-grow:20" title="Flavio Bolsonaro: 20% dos votos">Flavio\n20%</)
    expect(out).toMatch(/bar__seg--nulos" style="flex-grow:12" title="Nulos: 12% dos que não votaram"/)
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
  it('candidates: the name beside the share, wrapping and shortening before the share goes', () => {
    expect(segmentText('a', 52, 'Lula')).toBe('Lula 52%')
    expect(segmentText('b', 48, 'Flavio Bolsonaro')).toBe('Flavio Bolsonaro 48%')
    expect(segmentText('b', 36, 'Flavio Bolsonaro')).toBe('Flavio\nBolsonaro 36%')
    expect(segmentText('b', 30, 'Flavio Bolsonaro')).toBe('Flavio\n30%')
    expect(segmentText('b', 26, 'Flavio Bolsonaro')).toBe('Flavio\n26%')
    expect(segmentText('b', 20, 'Flavio Bolsonaro')).toBe('Flavio\n20%')
    expect(segmentText('a', 8, 'Lula')).toBe('8%')
expect(segmentText('b', 48, 'Veterinário Wilson Grassi')).toBe('Veterinário\nWilson Grassi 48%')
    expect(segmentText('a', 3, 'Lula')).toBe('')
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

describe('cycleTabs (#6): plain links, same markup the city card used inline', () => {
  const out = cycleTabs({ cycles: [2018, 2022, 2026], active: 2022, hrefFor: (c) => `/x/?ciclo=${c}` }).value
  it('is not a placeholder any more', () => expect(out).not.toContain('data-placeholder'))
  it('one link per cycle with its href and data-ciclo; the active one has aria-current=true', () => {
    expect(out).toContain('<nav class="tabs" aria-label="Ciclo" data-component="cycle-tabs">')
    expect(out).toContain('<a class="tabs__tab" href="/x/?ciclo=2018" data-ciclo="2018" aria-current="false">2018</a>')
    expect(out).toContain('href="/x/?ciclo=2022" data-ciclo="2022" aria-current="true"')
  })
})
