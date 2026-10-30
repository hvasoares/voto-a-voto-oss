/** Pins the table, the budget comparison and the edition estimate of `check:dist-size` (private#204) on synthetic input; no build is read. */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DIST_BUDGET_BYTES, RECOMMENDED_FINAL_BYTES } from './dist-size-budget'
import { editionCost, editionOf, editionsOfHeadroom, judgeBudget, renderEditionCost, renderTable, summarize } from './dist-size-judge'
import { readDist } from './dist-size'

const files = [
  { path: 'rj/rio/compartilhar/index.html', bytes: 3000 },
  { path: 'rj/rio/index.html', bytes: 50_000 },
  { path: 'fato/rj/rio/2026-1/index.html', bytes: 10_000 },
  { path: 'fato/rj/rio/2026-2/index.html', bytes: 20_000 },
  { path: 'fato/brasil/2026-2/index.html', bytes: 6000 },
  { path: 'data/v1/fato/rj/rio/2026-2.json', bytes: 4000 },
  { path: 'data/v1/fato/rj/rio/comparacoes.json', bytes: 1000 },
  { path: 'fato/relatorios/resumo/index.html', bytes: 500 },
  { path: '_astro/app.js', bytes: 100 },
]

describe('summarize and renderTable', () => {
  it('counts pages, files and bytes by family, largest first, with a total', () => {
    const { rows, total } = summarize(files)
    expect(rows.map((r) => [r.family, r.pages, r.files, r.bytes])).toEqual([
      ['city-card', 1, 1, 50_000],
      ['fato', 4, 4, 36_500],
      ['data-shards', 0, 2, 5000],
      ['compartilhar', 1, 1, 3000],
      ['other', 0, 1, 100],
    ])
    expect(total).toMatchObject({ pages: 6, files: 9, bytes: 94_600 })
  })

  it('prints the table with the MB and the average KB per file', () => {
    expect(renderTable(summarize(files)).split('\n')).toEqual([
      'family        pages  files   MB  avg KB/file',
      '------------  -----  -----  ---  -----------',
      'city-card         1      1  0.1         50.0',
      'fato              4      4  0.0          9.1',
      'data-shards       0      2  0.0          2.5',
      'compartilhar      1      1  0.0          3.0',
      'other             0      1  0.0          0.1',
      '------------  -----  -----  ---  -----------',
      'total             6      9  0.1         10.5',
    ])
  })
})

describe('judgeBudget', () => {
  it('passes at the budget and fails one byte over, naming the excess', () => {
    expect(judgeBudget(1000, 1000)).toMatchObject({ ok: true, headroomBytes: 0 })
    expect(judgeBudget(1_500_001, 1_000_000)).toMatchObject({ ok: false, headroomBytes: -500_001 })
    expect(judgeBudget(1_500_000, 1_000_000).message).toContain('OVER BUDGET: 1.5 MB > 1.0 MB (over by 0.5 MB)')
  })

  it('keeps the gate at the real-data total plus 5% (private#215) and the recommended value untouched', () => {
    expect(DIST_BUDGET_BYTES).toBe(890_000_000)
    expect(RECOMMENDED_FINAL_BYTES).toBe(900_000_000)
  })
})

describe('edition cost', () => {
  it.each([
    ['fato/rj/rio/2026-2/index.html', '2026-2'],
    ['fato/brasil/2026-1/index.html', '2026-1'],
    ['data/v1/fato/rj/rio/2026-2.json', '2026-2'],
    ['data/v1/fato/rj/rio/comparacoes.json', undefined],
    ['fato/comparar/2022/index.html', undefined],
    ['rj/rio/index.html', undefined],
  ])('editionOf(%s) = %s', (path, expected) => expect(editionOf(path)).toBe(expected))

  it('sums pages and data files per edition and takes the mean', () => {
    const cost = editionCost(files)
    expect(cost.perEdition).toEqual({ '2026-1': 10_000, '2026-2': 30_000 })
    expect(cost.meanBytes).toBe(20_000)
  })

  it('counts whole editions of headroom, 0 when over or unmeasurable', () => {
    expect(editionsOfHeadroom(100, 1000, 300)).toBe(3)
    expect(editionsOfHeadroom(1000, 100, 300)).toBe(0)
    expect(editionsOfHeadroom(100, 1000, 0)).toBe(0)
  })

  it('labels the figure as an estimate', () => {
    expect(renderEditionCost(editionCost(files), 94_600, 1_000_000, 500_000)).toContain('ESTIMATE')
    expect(renderEditionCost(editionCost([]), 0, 1, 1)).toContain('ESTIMATE')
  })
})

describe('readDist', () => {
  it('reads a tiny directory with paths relative to it', () => {
    const dir = mkdtempSync(join(tmpdir(), 'dist-size-'))
    try {
      mkdirSync(join(dir, 'rj', 'rio'), { recursive: true })
      writeFileSync(join(dir, 'rj', 'rio', 'index.html'), 'x'.repeat(10))
      writeFileSync(join(dir, 'index.html'), 'y')
      expect(readDist(dir).sort((a, b) => a.path.localeCompare(b.path))).toEqual([
        { path: 'index.html', bytes: 1 },
        { path: 'rj/rio/index.html', bytes: 10 },
      ])
      expect(summarize(readDist(dir)).total.files).toBe(2)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('says to build first when the folder is missing', () => {
    expect(() => readDist(join(tmpdir(), 'dist-size-missing-folder'))).toThrow(/run `npm run build` first/)
  })
})
