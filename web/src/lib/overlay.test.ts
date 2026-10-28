import { describe, expect, it } from 'vitest'
import { buildCityResult } from '@/shared/city-model'
import { DEFAULT_OVERLAY, overlayFigure, overlayQuery, parseOverlay, sealText, type OverlayConfig } from './overlay'

function result(aptos: number, votos: number[], comparecimento: number, turno: 1 | 2 = 2) {
  const validos = votos.reduce((a, b) => a + b, 0)
  return buildCityResult({
    turnout: { ano: 2026, turno, uf: 'rj', cdMunicipio: '1', aptos, comparecimento, abstencoes: aptos - comparecimento, brancos: 0, nulos: comparecimento - validos, anuladosApuSep: 0, validos },
    votes: votos.map((v, i) => ({ ano: 2026, turno, uf: 'rj', cdMunicipio: '1', candidatoNumero: i + 1, votos: v })),
    candidates: votos.map((_, i) => ({ ano: 2026, turno, candidatoNumero: i + 1, nomeUrna: `Cand ${i + 1}`, partido: 'P' })),
  })
}
const cfg = (o: Partial<OverlayConfig> = {}): OverlayConfig => ({ ...DEFAULT_OVERLAY, city: 'rj/cidade-exemplo', ...o })
const r = result(100000, [36400, 33600], 76600)

describe('overlay address', () => {
  it('reproduces the chosen configuration', () => {
    const c = cfg({ measure: 'margem', ano: 2022, turno: 1, size: '600x200', background: 'escuro' })
    expect(overlayQuery(c)).toBe('?c=rj/cidade-exemplo&m=margem&a=2022&t=1&s=600x200&f=escuro')
    expect(parseOverlay(overlayQuery(c))).toEqual(c)
  })
  it('falls back to the defaults on anything invalid and never throws', () => {
    expect(parseOverlay('?c=../../etc&m=x&a=1999&t=9&s=1x1&f=rosa')).toEqual({ ...DEFAULT_OVERLAY, city: undefined })
    expect(parseOverlay('')).toEqual({ ...DEFAULT_OVERLAY, city: undefined })
    expect(overlayQuery({ ...DEFAULT_OVERLAY })).toBe('')
  })
  it('has no parameter that turns the source seal off', () => {
    const parsed = parseOverlay('?c=rj/x&seal=0&selo=off&fonte=0&source=none&hideSeal=1')
    expect(Object.keys(parsed).sort()).toEqual(['ano', 'background', 'city', 'measure', 'size', 'turno'])
    expect(overlayQuery(parsed)).not.toMatch(/seal|selo|fonte|source/)
  })
})

describe('overlay figure', () => {
  it('quem não votou: the share and a sentence that reads it', () => {
    expect(overlayFigure(r, cfg(), 'Cidade Exemplo')).toEqual({ big: '30%', sentence: 'dos eleitores de Cidade Exemplo não votaram no 2º turno de 2026.' })
  })
  it('margem em votos, comparecimento and resultado, numbers only', () => {
    expect(overlayFigure(r, cfg({ measure: 'margem' }), 'Cidade Exemplo').big).toBe('2.800')
    expect(overlayFigure(r, cfg({ measure: 'comparecimento' }), 'Cidade Exemplo')).toEqual({ big: '76,6%', sentence: 'dos eleitores de Cidade Exemplo compareceram no 2º turno de 2026.' })
    const res = overlayFigure(r, cfg({ measure: 'resultado' }), 'Cidade Exemplo')
    expect(res.big).toBe('52%')
    expect(res.sentence).toContain('Cand 1')
    expect(res.sentence).toContain('Cand 2 teve 48%')
  })
  it('no data is said, never zero', () => {
    const none = overlayFigure(undefined, cfg(), 'Cidade Exemplo')
    expect(none.big).toBe('—')
    expect(none.sentence).toBe('Sem dados de Cidade Exemplo no 2º turno de 2026.')
  })
  it('gives no cause and no winner label in any measure', () => {
    for (const m of ['nv', 'margem', 'comparecimento', 'resultado'] as const) expect(overlayFigure(r, cfg({ measure: m }), 'Cidade Exemplo').sentence).not.toMatch(/porque|vence|venceu|lidera|culpa|protesto|ganhou|perdeu/i)
  })
})

describe('overlay seal', () => {
  it('names the source, the edition and the address; the fixture says it is fictitious', () => {
    expect(sealText({ edition: '26/10/2026', address: 'voto-a-voto.com', fixture: false })).toBe('TSE · dados finais · edição 26/10/2026 · voto-a-voto.com')
    expect(sealText({ edition: '26/10/2026', address: 'voto-a-voto.com', fixture: true })).toContain('dados fictícios')
  })
})
