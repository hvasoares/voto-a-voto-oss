import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CATALOG, PLACAR } from './catalog'
import { assertCatalog, candidatosTabela, FOOTER_FIELDS, PANEL_KINDS, placar, RENDERERS, specFor, validatePanel, type PanelRecord } from './panels'
import { readPlace, readShard } from './shards'

const root = resolve(process.cwd(), 'fixtures/data/nerds')
const csv = (name: string) => {
  const [head, ...lines] = readFileSync(resolve(process.cwd(), 'fixtures/data', name), 'utf8').trim().split('\n')
  const keys = head!.split(',')
  return lines.map((l) => Object.fromEntries(l.split(',').map((v, i) => [keys[i]!, v])))
}
const record = (patch: Partial<PanelRecord> = {}): PanelRecord => ({ ...PLACAR, ...patch })

describe('the closed registry of panel kinds', () => {
  it('declares the seven kinds, and renders stat, table, bar, map and histogram so far', () => {
    expect([...PANEL_KINDS]).toEqual(['stat', 'bar', 'line', 'histogram', 'heatmap', 'table', 'map'])
    expect([...RENDERERS].sort()).toEqual(['bar', 'histogram', 'map', 'stat', 'table'])
  })

  it('fails the build for a record that names a kind with no renderer, with a clear message', () => {
    expect(() => assertCatalog([record({ id: 'mapa', kind: 'heatmap' })])).toThrow('panel "mapa": kind "heatmap" has no renderer')
  })

  it('refuses a kind that is not in the registry at all', () => {
    expect(validatePanel(record({ kind: 'pizza' as never }))[0]).toContain('is not one of stat, bar, line')
  })
})

describe('the provenance footer gate', () => {
  it.each(FOOTER_FIELDS)('fails a panel with the footer field %s missing or blank, naming the panel and the field', (field) => {
    const footer = { ...PLACAR.footer, [field]: '  ' }
    expect(() => assertCatalog([record({ id: 'sem-campo', footer })])).toThrow(`panel "sem-campo": footer field "${field}" is missing`)
    const gone = { ...PLACAR.footer } as Record<string, unknown>
    delete gone[field]
    expect(validatePanel(record({ footer: gone as never }))).toContain(`panel "sem-campo": footer field "${field}" is missing`.replace('sem-campo', 'placar'))
  })

  it('has no interpretation field: a fifth footer field is refused', () => {
    const footer = { ...PLACAR.footer, interpretacao: 'Isto mostra que...' } as never
    expect(validatePanel(record({ footer }))).toEqual(['panel "placar": footer field "interpretacao" is not allowed (a footer has the four provenance fields and no interpretation)'])
  })

  it('wants the edition and its date in the source, the title as a question, and a family that goes with the series', () => {
    expect(validatePanel(record({ footer: { ...PLACAR.footer, fonte: 'TSE.' } }))[0]).toContain('must name the edition')
    expect(validatePanel(record({ title: 'Placar do comparecimento' }))[0]).toContain('must be the question')
    expect(validatePanel(record({ series: 'candidatos' }))[0]).toContain('does not go with the participacao family')
  })

  it('passes the catalogue as shipped, and every record of it has all four fields', () => {
    expect(() => assertCatalog(CATALOG)).not.toThrow()
    for (const r of CATALOG) expect(Object.keys(r.footer).sort()).toEqual([...FOOTER_FIELDS].sort())
  })
})

describe('Placar prints the shard values', () => {
  const int = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const pct = (a: number, b: number) => `${(Math.round((a / b) * 1000) / 10).toFixed(1).replace('.', ',')}%`

  it.each(['rj', 'sp'])('equals an independent sum of the source CSV for %s, both turnos of 2022', (uf) => {
    const cities = new Set(csv('cities.csv').filter((c) => c.uf === uf).map((c) => c.cd_municipio))
    const spec = placar({ 1: readShard('uf', uf, 2022, 1, root)!, 2: readShard('uf', uf, 2022, 2, root)! })
    for (const turno of [1, 2] as const) {
      const rows = csv('turnout.csv').filter((r) => r.ano === '2022' && r.turno === String(turno) && cities.has(r.cd_municipio))
      const sum = (key: string) => rows.reduce((s, r) => s + Number(r[key]), 0)
      const [aptos, comp, abst, val] = [sum('aptos'), sum('comparecimento'), sum('abstencoes'), sum('validos')]
      const bn = sum('brancos') + sum('nulos') + sum('anulados_apu_sep')
      const printed = Object.fromEntries(spec.cards.map((c) => [c.key, c.values.find((v) => v.turno === turno)!.text]))
      expect(printed).toMatchObject({ eleitorado: int(aptos), comparecimento: pct(comp, aptos), abstencao: pct(abst, aptos), brancos_nulos: pct(bn, comp), validos: pct(val, comp) })
    }
  })

  it('reads "sem 2º turno" (a null, never a zero) when there was no 2º turno, and says the seções apuradas are not in the data', () => {
    const spec = placar({ 1: readShard('uf', 'rj', 2022, 1, root)! })
    for (const card of spec.cards) expect(card.values.find((v) => v.turno === 2)!.text).toBeNull()
    expect(spec.cards.find((c) => c.key === 'secoes')!.unavailable).toBe('não consta nos dados publicados')
  })
})

describe('the candidatos family builds from the same record schema', () => {
  const fixture: PanelRecord = {
    id: 'candidatos-tabela', level: 'todos', shard: 'ciclo', transform: 'candidatos-tabela', kind: 'table', measure: { family: 'candidatos', id: 'votos' }, series: 'candidatos',
    title: 'Quantos votos teve cada candidato?',
    footer: { definicao: 'Votos de cada candidato.', fonte: 'TSE, {edicao}.', calculo: 'Votos ÷ votos válidos.', naoMede: 'Quem ganhou nem por quê.' },
  }

  it('passes the gates and renders as a table in ballot-number order, never sorted by result', () => {
    expect(validatePanel(fixture)).toEqual([])
    const place = readPlace('brasil', null, root)
    const spec = specFor(fixture, { cycle: { 1: place.get('2022-1'), 2: place.get('2022-2') }, all: place })
    expect(spec.kind).toBe('table')
    const numbers = (spec as ReturnType<typeof candidatosTabela>).rows.map((r) => Number(r.cells[0]))
    expect(numbers).toEqual([...numbers].sort((a, b) => a - b))
  })
})
