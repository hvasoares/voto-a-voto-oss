import { describe, expect, it } from 'vitest'
import { classifyPath, PAGE_FAMILIES, type PageFamily } from './page-family'

const TABLE: [string, PageFamily][] = [
  ['rj/cidade-exemplo/compartilhar/index.html', 'compartilhar'],
  ['fato/to/araguacema/2026-1/index.html', 'fato'],
  ['rj/cidade-exemplo/index.html', 'city-card'],
  ['rj/cidade-exemplo/qr/index.html', 'qr'],
  ['rj/cidade-exemplo/tres-ciclos/index.html', 'tres-ciclos'],
  ['rj/index.html', 'state'],
  ['brasil/sudeste/index.html', 'region'],
  ['brasil/centro-oeste/dados.json', 'other'],
  ['relatorios/comparecimento/index.html', 'report'],
  ['relatorios/index.html', 'report'],
  ['preview/rj/cidade-exemplo.png', 'previews'],
  ['preview.png', 'previews'],
  ['data/v1caa8653ea4b6728/city/rj.json', 'data-shards'],
  ['/rj/cidade-exemplo/qr/index.html', 'qr'],
  ['rj\\cidade-exemplo\\qr\\index.html', 'qr'],
  ['rj/cidade-exemplo/qr/qr.svg', 'qr'],
  ['sobre-os-dados/index.html', 'other'],
]

const OTHER = ['', '.', 'index.html', '404.html', 'CNAME', '_astro/x.js', 'sobre-os-dados/index.html', 'compartilhar/index.html', 'tres-ciclos/index.html',
  'brasil/index.html', 'brasil/compartilhar/index.html', 'rj/cidade-exemplo/historia/index.html', 'rj/cidade-exemplo', 'rj/historia']

describe('classifyPath', () => {
  it.each(TABLE)('%s is %s', (path, family) => {
    expect(classifyPath(path)).toBe(family)
  })

  it.each(OTHER)('%j matches no family and is other', (path) => {
    expect(classifyPath(path)).toBe('other')
  })

  it('names every family once, and the table covers each of them', () => {
    expect(new Set(TABLE.map(([, f]) => f)).size).toBe(PAGE_FAMILIES.length)
    expect(new Set(PAGE_FAMILIES).size).toBe(PAGE_FAMILIES.length)
  })
})
