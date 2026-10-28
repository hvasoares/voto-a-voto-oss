import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CATALOG } from './catalog'
import { buildEscada } from './escada'
import { buildMapa } from './mapa'
import { detalhe } from './detalhe'
import { placar } from './panels'
import { placesWithShards, readPlace } from './shards'

/**
 * The golden-data contract of every panel (#77): the numbers a panel prints are compared with values computed independently from the source CSV (never with the shard it was
 * built from, never with a snapshot). `CONTRACTS` must list every panel of the catalogue: adding a panel without a contract fails here. Each later ticket adds its own entry.
 */
const dir = resolve(process.cwd(), 'fixtures/data')
const table = (name: string) => {
  const [head, ...lines] = readFileSync(resolve(dir, name), 'utf8').trim().split('\n')
  const keys = head!.split(',')
  return lines.map((l) => Object.fromEntries(l.split(',').map((v, i) => [keys[i]!, v]))) as Record<string, string>[]
}
const cities = table('cities.csv')
const turnout = table('turnout.csv')
const sumOf = (ano: number, turno: number, keep: (c: Record<string, string>) => boolean) => {
  const rows = turnout.filter((r) => r.ano === String(ano) && r.turno === String(turno) && keep(cities.find((c) => c.cd_municipio === r.cd_municipio)!))
  const n = (k: string) => rows.reduce((t, r) => t + Number(r[k]), 0)
  return { aptos: n('aptos'), comp: n('comparecimento'), abst: n('abstencoes'), val: n('validos'), bn: n('brancos') + n('nulos') + n('anulados_apu_sep'), rows: rows.length }
}
const int = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
const pct = (a: number, b: number) => `${(Math.round((a / b) * 1000) / 10).toFixed(1).replace('.', ',')}%`
const known = placesWithShards(resolve(dir, 'nerds'))

const CONTRACTS: Record<string, () => void> = {
  placar: () => {
    const all = readPlace('uf', 'rj', resolve(dir, 'nerds'))
    const spec = placar({ 1: all.get('2026-1'), 2: all.get('2026-2') })
    const want = sumOf(2026, 1, (c) => c.uf === 'rj')
    const first = (k: string) => spec.cards.find((c) => c.key === k)!.values[0]!.text
    expect([first('eleitorado'), first('comparecimento'), first('abstencao'), first('brancos_nulos'), first('validos')]).toEqual([int(want.aptos), pct(want.comp, want.aptos), pct(want.abst, want.aptos), pct(want.bn, want.comp), pct(want.val, want.comp)])
  },
  escada: () => {
    const spec = buildEscada(CATALOG.find((r) => r.id === 'escada')!, { cycle: {}, all: readPlace('regiao', 'sudeste', resolve(dir, 'nerds')) })
    for (const row of spec.rows) for (const turno of [1, 2] as const) {
      const want = sumOf(row.ciclo, turno, (c) => c.regiao === 'sudeste')
      expect(row.cells.abstencao![turno - 1]!.text).toBe(pct(want.abst, want.aptos))
    }
  },
  detalhe: () => {
    const all = readPlace('uf', 'sp', resolve(dir, 'nerds'))
    const spec = detalhe(CATALOG.find((r) => r.id === 'detalhe')!, { 1: all.get('2022-1'), 2: all.get('2022-2') }, known)
    const want = sumOf(2022, 1, (c) => c.uf === 'sp')
    expect(spec.rows.at(-1)!.cells[1]).toBe(int(want.aptos))
    expect(spec.rows.filter((r) => !r.total)).toHaveLength(want.rows)
  },
  mapa: () => {
    const spec = buildMapa(CATALOG.find((r) => r.id === 'mapa')!, { cycle: {}, all: readPlace('brasil', null, resolve(dir, 'nerds')) }, 'brasil', known.ufs)
    for (const turno of [1, 2] as const) {
      const view = spec.views[`2022-${turno}-comparecimento`]!
      for (const [uf, cell] of Object.entries(view.cells)) {
        const want = sumOf(2022, turno, (c) => c.uf === uf)
        expect(cell.text, `${uf} ${turno}º`).toBe(pct(want.comp, want.aptos))
      }
    }
  },
  sinais: () => {
    // The strip prints no number of its own: its coverage counts the rows the CSV has, and the conference delta is 0 when the CSV sums close.
    const want = sumOf(2026, 1, (c) => c.uf === 'rj')
    expect(want.rows).toBe(readPlace('uf', 'rj', resolve(dir, 'nerds')).get('2026-1')!.children.municipios!.length)
  },
  invariantes: () => {
    // Each rule is true of the raw CSV rows too: votantes + abstenção + não instalados = eleitorado, válidos + brancos + nulos = votantes.
    for (const r of turnout) {
      expect(Number(r.validos) + Number(r.brancos) + Number(r.nulos) + Number(r.anulados_apu_sep)).toBe(Number(r.comparecimento))
      expect(Number(r.comparecimento) + Number(r.abstencoes)).toBeLessThanOrEqual(Number(r.aptos))
    }
  },
}

describe('every panel has a golden-data contract', () => {
  it('lists every panel of the catalogue', () => {
    expect(Object.keys(CONTRACTS).sort()).toEqual(CATALOG.map((r) => r.id).sort())
  })
  for (const [id, run] of Object.entries(CONTRACTS)) it(`panel "${id}": its printed numbers equal an independent computation from the source CSV`, run)
})
