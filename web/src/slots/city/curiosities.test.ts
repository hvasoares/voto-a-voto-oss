import { describe, expect, it } from 'vitest'
import type { Fact } from '../../lib/curiosities'
import { curiosityCard } from './curiosities'

const facts: Fact[] = [
  { code: 'td', rank: 3, n: 48, cycles: [2022, 2026] },
  { code: 'ml', rank: 12, n: 48, cycles: [2026] },
  { code: 'bh', rank: 5, n: 48, cycles: [2018, 2022, 2026] },
]
const html = curiosityCard(facts, 'x', (anchor) => `/fato/rj/x/comparacoes/#${anchor}`).toString()

describe('the curiosities card', () => {
  it('has a "ver cálculo" link on every fact, to that fact\'s record', () => {
    expect(html.match(/<a class="calc" href="\/fato\/rj\/x\/comparacoes\/#(td|ml|bh)">De onde vem este número\?<\/a>/g)).toHaveLength(3)
  })
  it('is the frame: the rank, what it ranks, the group size and the cycles compared', () => {
    expect(html).toContain('3ª')
    expect(html).toContain('maior queda de comparecimento entre cidades do mesmo porte')
    expect(html).toContain('Grupo: 48 cidades · 2022 → 2026')
    expect(html).toContain('12ª')
    expect(html).toContain('menor diferença entre os dois candidatos no 1º turno')
    expect(html).toContain('Grupo: 48 cidades · 2026')
    expect(html).toContain('5ª')
    expect(html).toContain('maior parcela de votos brancos e nulos')
    expect(html).toContain('Grupo: 48 cidades · 2018, 2022 e 2026')
  })
  it('every fact names its group size and its cycles, in both registers', () => {
    expect((html.match(/Grupo: 48 cidades · /g) ?? []).length).toBe(6)
    expect(html).toContain('maior queda de comparecimento entre cidades do mesmo tamanho')
  })
  it('is worded as a comparison, never as a finding', () => {
    expect(html).toContain('É uma comparação com cidades do mesmo perfil, não um indício de irregularidade.')
    expect(html).toContain('Isto só compara a cidade com outras parecidas. Não mostra que algo deu errado.')
    expect(html.replace('não um indício de irregularidade', '').replace('Não mostra que algo deu errado', '')).not.toMatch(/irregular|fraude|suspeit|anormal|problema|erro/i)
  })
  it('a rise in turnout is an "alta"', () => {
    expect(curiosityCard([{ code: 'tu', rank: 1, n: 20, cycles: [2022, 2026] }], 'y', (a) => `#${a}`).toString()).toContain('maior alta de comparecimento')
  })
  it('has the standard register first and nothing at all when the city has no facts', () => {
    expect(html.indexOf('data-register="standard"')).toBeLessThan(html.indexOf('data-register="plain"'))
    expect(curiosityCard([], 'z', (a) => `#${a}`).toString()).toBe('')
  })
})
