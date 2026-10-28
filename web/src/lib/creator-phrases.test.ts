import { describe, expect, it } from 'vitest'
import { creatorPhrases } from './creator-phrases'
import { fixtureCityShards } from './shard-files'
import type { CityShard } from './city-shard'

const BANNED = /\b(porque|por causa|vence|venceu|lidera|culpa|protesto|derrota|ganhou|perdeu)\b/i

describe('creator phrases', async () => {
  const shards = await fixtureCityShards()
  const rj = shards.find((s) => s.city.slug === 'cidade-exemplo' && s.city.uf === 'rj')!

  it('has a participation, a result and a sequence phrase from the same words as the card', () => {
    const { phrases } = creatorPhrases(rj, 'standard')
    expect(phrases.map((p) => p.kind)).toEqual(['turnout', 'result', 'sequence'])
    expect(phrases[0]!.text).toContain('Em Cidade Exemplo, no 2º turno de 2026,')
    expect(phrases[1]!.text).toMatch(/^No 2º turno de 2026, em Cidade Exemplo, .+ teve \d+(,\d)?% dos votos válidos e .+, \d+(,\d)?%\.$/)
    expect(phrases[2]!.text).toContain('Cidade Exemplo: ')
    expect(phrases[2]!.text).toContain('não a causa')
  })
  it('the plain register changes the words and keeps the numbers', () => {
    const std = creatorPhrases(rj, 'standard').phrases
    const plain = creatorPhrases(rj, 'plain').phrases
    expect(plain[1]!.text).not.toBe(std[1]!.text)
    expect(plain[1]!.text.match(/\d+(,\d)?%/g)).toEqual(std[1]!.text.match(/\d+(,\d)?%/g))
  })
  it('a city with no data says there is none and does not call it zero', () => {
    const empty: CityShard = { ...rj, cycles: {} }
    const out = creatorPhrases(empty, 'standard')
    expect(out.phrases).toEqual([])
    expect(out.noData).toContain('não tem dados')
    expect(out.noData).toContain('não diga que o resultado foi zero')
  })
  it.each(shards.map((s) => [s.city.slug, s] as const))('%s: no cause, no winner label, in both registers', (_slug, s) => {
    for (const register of ['standard', 'plain'] as const) for (const p of creatorPhrases(s, register).phrases) expect(p.text).not.toMatch(BANNED)
  })
})
