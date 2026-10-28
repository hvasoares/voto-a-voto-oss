import { describe, expect, it } from 'vitest'
import { CATALOG } from './catalog'
import { STAYHOME_PLAIN, STAYHOME_STANDARD } from './catalog-stayhome'
import { claimLines, selectedLines, stayhomeAlt, stayhomeShareText, subtitle, viewLabel } from './stayhome'
import type { StayHomeRow } from '../stay-home'

const rows: StayHomeRow[] = [
  { uf: 'rj', aptos: 1000, naoVotaram: 211, share: 21.1 },
  { uf: 'sp', aptos: 2000, naoVotaram: 540, share: 27 },
]
const BANNED = /vence|venceu|ganh|derrot|lider|melhor|pior|porque|devid|culpa|decid|mudar|irregular|suspeit/i

describe('"Ficaram em casa" words', () => {
  it('registers the same keys in both registers, with the same slots', () => {
    expect(Object.keys(STAYHOME_PLAIN).sort()).toEqual(Object.keys(STAYHOME_STANDARD).sort())
    const slots = (t: string) => [...t.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
    for (const [k, t] of Object.entries(STAYHOME_PLAIN)) expect(slots(t), k).toEqual(slots(STAYHOME_STANDARD[k]!))
    expect(CATALOG['pt-BR'].standard['stayhome.title' as never]).toBe('Ficaram em casa')
  })

  it('says what the map shows, for the chosen cycle and round', () => {
    expect(subtitle({}, 2026, 1)).toBe('Quem não votou em ninguém (abstenção, brancos e nulos). 1º turno de 2026.')
    expect(viewLabel({}, 2022, 2)).toBe('2022 · 2º turno')
  })

  it('the text alternative lists every state with its percentage and names no candidate', () => {
    const alt = stayhomeAlt(rows, 2026, 2)
    expect(alt).toBe('Parcela dos eleitores que não votou em ninguém, por estado, 2º turno de 2026: RJ 21,1%; SP 27,0%.')
  })

  it('a cycle without rows says so instead of listing nothing', () => {
    expect(stayhomeAlt([], 2018, 1)).toBe('Não há dados do 1º turno de 2018 neste conjunto.')
  })

  it('the claim carries the selection own number and what it does not say', () => {
    const [claim, limits] = claimLines({ cities: 5571, greater: 2604, tenths: 467 }, 2026, 2)
    expect(claim).toBe('Em 46,7% das cidades, o número de pessoas que não votaram em ninguém foi maior do que a diferença de votos entre os dois primeiros (2º turno de 2026).')
    expect(limits).toContain('Não diz quem são essas pessoas')
    expect(limits).toContain('nem que o resultado teria sido outro')
  })

  it('the selected-state lines print the electorate and who did not vote', () => {
    expect(selectedLines({}, { uf: 'sp', aptos: 33482119, naoVotaram: 7065000, share: 21.1 })[0]).toBe('Eleitores aptos: 33.482.119 · não votaram: 7.065.000')
  })

  it('no sentence of the screen attributes a cause, an effect, a winner or an irregularity (both registers)', () => {
    for (const t of [...Object.values(STAYHOME_STANDARD), ...Object.values(STAYHOME_PLAIN)]) {
      // the limits sentence names what it does NOT say, so it is the one place the words "resultado" and "outro" appear
      expect(t).not.toMatch(BANNED)
    }
  })

  it('the share text names the cycle, the round and nothing else', () => {
    expect(stayhomeShareText({}, 2026, 1)).toBe('Parcela dos eleitores que não votou em ninguém (abstenção, brancos e nulos), por estado, 1º turno de 2026.')
  })
})
