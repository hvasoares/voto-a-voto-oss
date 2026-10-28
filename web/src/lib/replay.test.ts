import { describe, expect, it } from 'vitest'
import { buildReplay, missingText, replayAlt, sidesText, type ReplaySide } from './replay'
import { REPLAY_STANDARD } from './sentences/catalog-replay'

const two = (a: number): ReplaySide[] => [{ key: 'a', label: 'Candidato A', pct: a }, { key: 'b', label: 'Candidato B', pct: 100 - a }]
const all = buildReplay([{ ano: 2018, sides: two(55) }, { ano: 2022, sides: two(49) }, { ano: 2026, sides: two(52) }])

describe('the replay of a city', () => {
  it('has a frame for each of the three cycles, in order, whatever order the cycles come in', () => {
    expect(buildReplay([{ ano: 2026, sides: two(52) }, { ano: 2018, sides: two(55) }, { ano: 2022, sides: two(49) }]).frames.map((f) => f.ano)).toEqual([2018, 2022, 2026])
    expect(all.missing).toEqual([])
    expect(missingText(all)).toBeUndefined()
  })
  it('a cycle with no result is not a frame, and the replay says which one is missing', () => {
    const r = buildReplay([{ ano: 2018 }, { ano: 2022, sides: [] }, { ano: 2026, sides: two(52) }])
    expect(r.frames.map((f) => f.ano)).toEqual([2026])
    expect(r.missing).toEqual([2018, 2022])
    expect(missingText(r)).toBe('Sem dados de 2018 e 2022: o replay mostra só o que existe.')
    expect(missingText(buildReplay([{ ano: 2018, sides: two(50) }, { ano: 2022, sides: two(50) }]))).toBe('Sem dados de 2026: o replay mostra só o que existe.')
  })
  it('a city with no cycle has no frame at all (the page already says so)', () => {
    expect(buildReplay([]).frames).toEqual([])
    expect(buildReplay([]).missing).toEqual([2018, 2022, 2026])
  })
  it('the text alternative gives the three results', () => {
    expect(replayAlt(all, 'Cidade Exemplo', 2)).toBe('Replay do 2º turno em Cidade Exemplo: 2018, Candidato A 55% e Candidato B 45% dos votos válidos; 2022, Candidato A 49% e Candidato B 51% dos votos válidos; 2026, Candidato A 52% e Candidato B 48% dos votos válidos.')
  })
  it('round 1 lists the third side too', () => {
    const f = { ano: 2026, sides: [...two(40).map((s, i) => ({ ...s, pct: [40, 35][i]! })), { key: 'outros' as const, label: 'Outros', pct: 25 }] }
    expect(sidesText(f)).toBe('Candidato A 40%, Candidato B 35% e Outros 25%')
  })
  it('only says the numbers: no winner, no loser, no change, no why', () => {
    const everything = Object.values(REPLAY_STANDARD).join(' | ') + replayAlt(all, 'X', 2)
    expect(everything).not.toMatch(/venc|ganh|perd|derrot|lider|mudou|virou|porque|devido|causa|motivo|culpa/i)
  })
})
