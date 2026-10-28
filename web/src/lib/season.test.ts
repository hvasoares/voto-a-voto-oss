import { describe, expect, it } from 'vitest'
import type { ArcCounts } from './arcs'
import type { CycleBlock } from './compare'
import { citiesChanged, episodeLabel, orderSeason, pivotText, SEASON_DEFAULT_ORDER, seasonPivot } from './season'
import { SEASON_PLAIN, SEASON_STANDARD } from './sentences/catalog-season'

const arcs = (a: Partial<ArcCounts>): ArcCounts => ({ same: 0, switched2022: 0, switched2026: 0, returned: 0, switchedTwice: 0, tie: 0, missing: 0, ...a })
const block = (ano: number, pct: string, changePp?: string, label = 'Lula'): CycleBlock => ({
  status: 'data',
  ano,
  left: { label, pct, tenths: Number(pct.replace(',', '')), votes: 1, share: 0.5 },
  rival: { label: 'Bolsonaro', pct: '50,0', tenths: 500, votes: 1, share: 0.5 },
  validos: 2,
  changePp,
  changeVs: changePp ? ano - 4 : undefined,
}) as CycleBlock
const none = (ano: number): CycleBlock => ({ status: 'no-data', ano })
const full = [block(2018, '32,0'), block(2022, '44,8', '+12,7'), block(2026, '46,2', '+1,4')]

describe('the pivot between episodes 2 and 3', () => {
  it('counts the cities whose side changed in 2026 over the cities with the three cycles and no tie (the arcs of #41)', () => {
    expect(citiesChanged(arcs({ same: 600, switched2022: 3, switched2026: 30, returned: 6, switchedTwice: 2, tie: 1, missing: 4 }))).toEqual({ n: 38, total: 641 })
  })
  it('states the change in points and in cities', () => {
    const p = seasonPivot(full, arcs({ same: 600, switched2022: 3, switched2026: 30, returned: 6, switchedTwice: 2 }), 645)
    expect(pivotText(p)).toBe('Entre 2022 e 2026, a parcela de Lula nos votos válidos do 2º turno variou +1,4 pp. Em 38 das 641 cidades com os três ciclos o lado com mais votos mudou.')
    expect(pivotText(p, { register: 'plain' })).toBe('De 2022 para 2026, a parte dos votos de Lula no 2º turno mudou +1,4 pontos. Em 38 das 641 cidades com os três ciclos o lado com mais votos mudou.')
  })
  it('says one city, and none, in their own words', () => {
    expect(pivotText(seasonPivot(full, arcs({ same: 5, switched2026: 1 }), 6))).toContain('Em 1 das 6 cidades')
    expect(pivotText(seasonPivot(full, arcs({ same: 5 }), 5))).toContain('Em nenhuma das 5 cidades')
  })
  it('says plainly that nothing changed when the share and every city stayed', () => {
    const steady = [block(2018, '40,0'), block(2022, '45,0', '+5,0'), block(2026, '45,0', '0,0')]
    const p = seasonPivot(steady, arcs({ same: 9 }), 9)
    expect(p.kind).toBe('steady')
    expect(pivotText(p)).toBe('Entre 2022 e 2026 nada mudou: a parcela de Lula nos votos válidos do 2º turno ficou em 45,0% e, em nenhuma das 9 cidades com os três ciclos, o lado com mais votos mudou.')
  })
  it('a share that did not move but a city that did is still a change', () => {
    const p = seasonPivot([block(2018, '40,0'), block(2022, '45,0', '+5,0'), block(2026, '45,0', '0,0')], arcs({ same: 8, switched2026: 1 }), 9)
    expect(p.kind).toBe('change')
  })
  it('a missing cycle says which one, and gives no number', () => {
    expect(pivotText(seasonPivot([block(2018, '40,0'), none(2022), block(2026, '45,0')], arcs({}), 5))).toBe('Sem o resultado do 2º turno de 2022 neste estado, não dá para comparar 2022 e 2026.')
    expect(pivotText(seasonPivot([none(2018), none(2022), block(2026, '45,0')], undefined, 5))).toContain('2022')
    expect(pivotText(seasonPivot([block(2018, '40,0'), none(2022), none(2026)], undefined, 5))).toContain('2022 e 2026')
  })
  it('a state with one city says so, in words, for a change and for none', () => {
    expect(pivotText(seasonPivot(full, arcs({ switched2026: 1 }), 1))).toBe('Este estado tem uma só cidade. Entre 2022 e 2026, nela, o lado com mais votos no 2º turno mudou.')
    expect(pivotText(seasonPivot(full, arcs({ same: 1 }), 1))).toBe('Este estado tem uma só cidade. Entre 2022 e 2026, nela, o lado com mais votos no 2º turno não mudou.')
  })
  it('a state whose cities lack cycles still gets the share sentence, with no city count', () => {
    expect(pivotText(seasonPivot(full, arcs({ missing: 4 }), 4))).toBe('Entre 2022 e 2026, a parcela de Lula nos votos válidos do 2º turno variou +1,4 pp.')
  })
  it('never says why, never a winner or a loser', () => {
    const all = [...Object.values(SEASON_STANDARD), ...Object.values(SEASON_PLAIN)].join(' | ')
    expect(all).not.toMatch(/porque|devido|causa|culpa|motivo|venc|perd|ganh|derrot|lider|vitóri/i)
  })
})

describe('the order of the season', () => {
  it('reverses the episodes and the pivot together, and chronological is untouched', () => {
    const items = ['ep1', 'ep2', 'pivot', 'ep3']
    expect(orderSeason(items, 'chronological')).toEqual(items)
    expect(orderSeason(items, 'reverse')).toEqual(['ep3', 'pivot', 'ep2', 'ep1'])
    expect(items).toEqual(['ep1', 'ep2', 'pivot', 'ep3'])
  })
  it('has one default constant, and it is chronological (the page without scripts reads that way)', () => {
    expect(SEASON_DEFAULT_ORDER).toBe('chronological')
  })
  it('names an episode', () => {
    expect(episodeLabel(2, 2022)).toBe('Episódio 2 · 2022')
  })
})
