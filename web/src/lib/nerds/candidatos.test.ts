import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CATALOG } from './catalog'
import { detalhe, detalheCandidatos } from './detalhe'
import { buildDistribuicao } from './distribuicao'
import { buildEscada, candidatosFicha } from './escada'
import { exportOf } from './export-spec'
import { buildMapa } from './mapa'
import { par, parCandidatos } from './par'
import { rateOf, rateOfRow, measureOptions } from './rates'
import { assertCatalog } from './panels'
import { placesWithShards, readPlace } from './shards'

const root = resolve(process.cwd(), 'fixtures/data/nerds')
const dir = resolve(process.cwd(), 'fixtures/data')
const rows = (name: string) => {
  const [head, ...lines] = readFileSync(resolve(dir, name), 'utf8').trim().split('\n')
  const keys = head!.split(',')
  return lines.map((l) => Object.fromEntries(l.split(',').map((v, i) => [keys[i]!, v]))) as Record<string, string>[]
}
const rec = (id: string) => CATALOG.find((r) => r.id === id)!
const place = (level: 'brasil' | 'regiao' | 'uf', id: string | null) => readPlace(level, id, root)
const known = placesWithShards(root)
const BANNED = /\b(vencedor|venceu|ganhou|eleito|derrotad\w*|perdeu|melhor|pior|1º colocado|líder)\b/i

describe('candidate measures use the existing panels', () => {
  it('adds no panel component: the renderers are the same files, the kinds the same, and the records pass the same gates', () => {
    expect(readdirSync(resolve(process.cwd(), 'src/components/nerds')).sort()).toEqual(['DetalheEnhancer.tsx', 'DistribuicaoPanel.tsx', 'EscadaPanel.tsx', 'MapaEnhancer.tsx', 'MapaPanel.astro', 'NerdsPage.astro', 'PanelActions.tsx', 'PanelFrame.astro', 'StatPanel.astro', 'TablePanel.astro'])
    expect(() => assertCatalog(CATALOG)).not.toThrow()
    expect(CATALOG.filter((r) => r.measure.candidatos).map((r) => [r.id, r.kind])).toEqual([['mapa', 'map'], ['escada', 'bar'], ['distribuicao', 'histogram']])
  })

  it('offers the second group "Votos por candidato" after the participação measures, read from the record and the shards', () => {
    const options = measureOptions(['comparecimento', 'validos'], place('brasil', null).values(), true)
    expect(options.map((o) => [o.group, o.id])).toEqual([['Participação', 'comparecimento'], ['Participação', 'validos'], ['Votos por candidato', 'cand-91'], ['Votos por candidato', 'cand-92']])
    expect(measureOptions(['comparecimento'], place('brasil', null).values(), false)).toHaveLength(1)
  })
})

describe('Escada by candidate', () => {
  const spec = buildEscada(rec('escada'), { cycle: {}, all: place('uf', 'rj') })

  it('shows, per cycle and turno, exactly the candidates listed, in ballot-number order, never sorted by result', () => {
    const listed = (ano: number, turno: number) => rows('candidates.csv').filter((c) => c.ano === String(ano) && c.turno === String(turno)).map((c) => Number(c.candidato_numero)).sort((a, b) => a - b)
    for (const turno of [1, 2] as const) for (const c of spec.candidatos![turno]) {
      expect(c.bars.map((b) => b.numero), `${c.ciclo} ${turno}º`).toEqual(listed(c.ciclo, turno))
    }
    expect(spec.candidatos![2].every((c) => c.bars.length === 2)).toBe(true)
  })

  it('prints the share of votos válidos and the votes equal to an independent sum of the CSV; the shares plus brancos, nulos close to 100% of the votantes', () => {
    const cities = new Set(rows('cities.csv').filter((c) => c.uf === 'rj').map((c) => c.cd_municipio))
    for (const c of spec.candidatos![2]) {
      const t = rows('turnout.csv').filter((r) => r.ano === String(c.ciclo) && r.turno === '2' && cities.has(r.cd_municipio!))
      const validos = t.reduce((s, r) => s + Number(r.validos), 0)
      const comp = t.reduce((s, r) => s + Number(r.comparecimento), 0)
      const bn = t.reduce((s, r) => s + Number(r.brancos) + Number(r.nulos) + Number(r.anulados_apu_sep), 0)
      let sumVotes = 0
      for (const b of c.bars) {
        const votes = rows('votes.csv').filter((r) => r.ano === String(c.ciclo) && r.turno === '2' && r.candidato_numero === String(b.numero) && cities.has(r.cd_municipio!)).reduce((s, r) => s + Number(r.votos), 0)
        sumVotes += votes
        expect(b.text).toBe(`${(Math.round((votes / validos) * 1000) / 10).toFixed(1).replace('.', ',')}%`)
        expect(b.votos.replace(/\./g, '')).toBe(String(votes))
      }
      expect(sumVotes + bn).toBe(comp) // candidates + brancos + nulos = votantes
    }
  })

  it('has a Ficha with the votes, and no ranking, winner label or difference anywhere in the spec or its export', () => {
    const f = candidatosFicha(spec, 2)
    expect(f.headers).toEqual(['Ciclo', 'Nº', 'Candidato', 'Votos', '% dos votos válidos'])
    expect(JSON.stringify(spec)).not.toMatch(BANNED)
    expect(JSON.stringify(exportOf(spec))).not.toMatch(BANNED)
  })
})

describe('the other panels for a candidate', () => {
  it('map: shaded by one candidate\'s share (from the shard rows), every UF\'s step from the shard values', () => {
    const all = place('brasil', null)
    const spec = buildMapa(rec('mapa'), { cycle: {}, all }, 'brasil', known.ufs)
    const view = spec.views['2022-2-cand-91']!
    expect(view).toBeDefined()
    const shard = all.get('2022-2')!
    for (const row of shard.children.ufs!.filter((r) => r.id !== 'zz')) expect(view.cells[row.id]!.text).toBe(rateOfRow(row, 'cand-91', shard.candidatos)!.text)
  })

  it('distribuição: bins sum to the number of children for a candidate\'s share', () => {
    const all = place('uf', 'rj')
    const spec = buildDistribuicao(rec('distribuicao'), { cycle: { 1: all.get('2022-1'), 2: all.get('2022-2') }, all })
    const d = spec.byKey['2-cand-91']!
    expect(d.bins.reduce((t, b) => t + b.count, 0)).toBe(d.n)
    expect(spec.options.some((o) => o.id === 'cand-91')).toBe(true)
  })

  it('par: the candidates in ballot-number order with the share of the place and of Brasil, no difference', () => {
    const own = { name: 'Rio de Janeiro', shards: { 1: place('uf', 'rj').get('2022-1'), 2: place('uf', 'rj').get('2022-2') } }
    const spec = parCandidatos(own, { 1: place('brasil', null).get('2022-1'), 2: place('brasil', null).get('2022-2') })
    const numbers = spec.rows.map((r) => Number(r.id))
    expect(numbers).toEqual([...numbers].sort((a, b) => a - b))
    expect(JSON.stringify(spec)).not.toMatch(BANNED)
    expect(par).toBeDefined()
  })

  it('tabela: one column per candidate and turno in ballot-number order, the total last, shares from the shard', () => {
    const all = place('uf', 'rj')
    const spec = detalheCandidatos(rec('detalhe'), { 1: all.get('2022-1'), 2: all.get('2022-2') }, known)
    expect(spec.columns.map((c) => c.key)).toEqual(['nome', 'cand-91-1', 'cand-91-2', 'cand-92-1', 'cand-92-2'])
    expect(spec.rows.at(-1)!.total).toBe(true)
    const base = detalhe(rec('detalhe'), { 1: all.get('2022-1'), 2: all.get('2022-2') }, known)
    expect(spec.rows.map((r) => r.cells[0])).toEqual(base.rows.map((r) => r.cells[0]))
    expect(rateOf(all.get('2022-1'), 'cand-91')!.text).toBe(spec.rows.at(-1)!.cells[1])
  })
})
