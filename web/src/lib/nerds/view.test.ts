import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { childLinks, loadPlace, placeName } from './view'

const root = resolve(process.cwd(), 'fixtures/data/nerds')

describe('one component, three levels (#74)', () => {
  it('serves Brasil, a região and an estado from the same loader with different shards', () => {
    const brasil = loadPlace('brasil', null, root)
    const regiao = loadPlace('regiao', 'sudeste', root)
    const estado = loadPlace('estado', 'rj', root)

    expect([brasil.shardLevel, regiao.shardLevel, estado.shardLevel]).toEqual(['brasil', 'regiao', 'uf'])
    expect(brasil.shards.get('2026-1')!.total.eleitorado).toBeGreaterThan(regiao.shards.get('2026-1')!.total.eleitorado)
    expect(regiao.shards.get('2026-1')!.total.eleitorado).toBeGreaterThan(estado.shards.get('2026-1')!.total.eleitorado)
    expect(brasil.cycles).toEqual([2018, 2022, 2026])
  })

  it('has the three routes render the one NerdsPage component, with only the level parameter different', () => {
    for (const [file, level] of [['index.astro', 'brasil'], ['regiao/[regiao]/index.astro', 'regiao'], ['estado/[uf]/index.astro', 'estado']] as const) {
      const source = readFileSync(resolve(process.cwd(), 'src/pages/dados-para-nerds', file), 'utf8')
      expect(source, file).toContain("import NerdsPage from '@/components/nerds/NerdsPage.astro'")
      expect(source, file).toContain(`<NerdsPage level="${level}"`)
    }
  })

  it('draws the breadcrumb from Brasil down through the região', () => {
    expect(loadPlace('estado', 'rj', root).crumbs).toEqual([
      { label: 'Brasil', path: 'dados-para-nerds/' },
      { label: 'Sudeste', path: 'dados-para-nerds/regiao/sudeste/' },
      { label: 'Rio de Janeiro' },
    ])
    expect(loadPlace('regiao', 'sudeste', root).crumbs.at(-1)).toEqual({ label: 'Sudeste' })
    expect(loadPlace('brasil', null, root).crumbs).toEqual([{ label: 'Brasil' }])
  })

  it('links down: Brasil lists its regiões then its estados that have a page; a região its estados; an estado none', () => {
    const labels = (level: 'brasil' | 'regiao' | 'estado', id: string | null) => childLinks(loadPlace(level, id, root), root).map((g) => [g.label, g.links.map((l) => l.label)])
    expect(labels('brasil', null)).toEqual([['Regiões', ['Centro-Oeste', 'Sudeste']], ['Estados', ['Mato Grosso', 'Rio de Janeiro', 'São Paulo']]])
    expect(labels('regiao', 'sudeste')).toEqual([['Estados', ['Rio de Janeiro', 'São Paulo']]])
    expect(labels('estado', 'rj')).toEqual([])
  })

  it('names places', () => {
    expect(placeName('estado', 'sp')).toBe('São Paulo')
    expect(placeName('regiao', 'centro-oeste')).toBe('Centro-Oeste')
  })
})
