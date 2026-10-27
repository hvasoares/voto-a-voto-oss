/**
 * Pins every figure of `about-data.ts` to the file it was copied from, so a data update that
 * invalidates the page fails here instead of drifting. Source of truth for the numbers with an
 * entry in manifest.json: `data/manifest.json` (the repo root of the worktree, one level above web/).
 * Figures that exist only in the repo docs (sections, Salvador, overseas posts, Boa Esperança do
 * Norte) are cited in `about-data.ts` comments and the page itself.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { formatBytes, formatUtc, shortHash, sourceRow } from './about'
import { BR_CITIES_2018_2022, BR_CITIES_2026, ELECTORATE_2022_RECONFIRMED, NATIONAL_2026_R2, OUTPUT_ROWS, OVERSEAS_POSTS_2026, SOURCES, TURNOUT_REMAINDER, type SourceLine } from './about-data'

/** data/manifest.json, read raw from the committed repo root (schema_version 1). */
function loadManifest(): {
  sources: { id: string; kind: string; bytes: number; sha256: string; retrieved_at: string; files?: number; final?: number; digest?: string; newest_generation?: string; cities?: number }[]
  outputs: Record<string, { rows: number }>
  national_reference: Record<'2026-2' | '2022-2', { candidates: Record<string, number>; validos: number; aptos: number }>
  turnout_identity: { ano: number; aptos_menos_comparecimento_menos_abstencoes: number }[]
} {
  return JSON.parse(readFileSync(resolve(import.meta.dirname, '../../../data/manifest.json'), 'utf8'))
}

const manifest = loadManifest()

describe('manifest table of the page (SOURCES) matches data/manifest.json', () => {
  it('has one row per manifest source, identified by it', () => {
    expect(SOURCES).toHaveLength(manifest.sources.length)
    for (const s of manifest.sources) {
      if (s.kind === 'opendata') expect(SOURCES.some((r) => r.label.startsWith(s.id))).toBe(true)
      else if (s.kind === 'ibge_api') expect(SOURCES.some((r) => r.label.includes('servicodados.ibge.gov.br'))).toBe(true)
      else expect(SOURCES.some((r) => r.label.includes('resultados.tse.jus.br'))).toBe(true)
    }
  })

  it('each open-data zip shows the exact bytes, hash and collection minute', () => {
    for (const source of manifest.sources.filter((s) => s.kind === 'opendata')) {
      const row: SourceLine = SOURCES.find((r) => r.label.startsWith(source.id))!
      expect(row.bytes).toBe(source.bytes)
      expect(row.sha256).toBe(source.sha256)
      expect(formatUtc(row.retrievedAt)).toBe(formatUtc(source.retrieved_at))
    }
  })

  it('the IBGE entry shows the state files and their digest, and the centroid table is counted among the outputs', () => {
    const ibge = manifest.sources.find((s) => s.kind === 'ibge_api')!
    const row: SourceLine = SOURCES[5]!
    expect(row.files).toBe(ibge.files)
    expect(row.digest).toBe(ibge.digest)
    expect(formatUtc(row.retrievedAt)).toBe(formatUtc(ibge.retrieved_at))
    expect(OUTPUT_ROWS['centroids.csv']).toBe(manifest.outputs['centroids.csv']!.rows)
  })

  it('the 2026 entry shows files, final count, digest and newest generation', () => {
    expect(manifest.sources.filter((s) => s.kind === 'results_site')).toHaveLength(1)
    const results = manifest.sources.find((s) => s.kind === 'results_site')!
    const row: SourceLine = SOURCES[4]!
    expect(row.files).toBe(results.files)
    expect(row.final).toBe(results.final)
    expect(row.digest).toBe(results.digest)
    expect(row.newestGeneration).toBe(results.newest_generation)
    const shown = sourceRow(row).note
    expect(shown).toBe(
      `${formatBytes(results.files!)} arquivos · ${formatBytes(results.final!)} finais · geração mais recente do TSE: ${formatUtc(results.newest_generation!)} · digest dos arquivos: ${shortHash(results.digest!)}`,
    )
  })
})

describe('narrative figures match data/manifest.json', () => {
  it('the 2026 runoff national totals, overseas included, are the TSE national file ones', () => {
    const ref = manifest.national_reference['2026-2']
    expect(NATIONAL_2026_R2.lula).toBe(ref.candidates['13'])
    expect(NATIONAL_2026_R2.flavio).toBe(ref.candidates['22'])
    expect(NATIONAL_2026_R2.validos).toBe(ref.validos)
    expect(NATIONAL_2026_R2.lula + NATIONAL_2026_R2.flavio).toBe(ref.validos)
  })

  it('the electorate of 2022 quoted as re-confirmed is the manifest aptos', () => {
    expect(ELECTORATE_2022_RECONFIRMED).toBe(manifest.national_reference['2022-2'].aptos)
  })

  it('the turnout identity remainders are the per-cycle national ones', () => {
    expect(manifest.turnout_identity).toHaveLength(6)
    for (const { ano, aptos_menos_comparecimento_menos_abstencoes } of manifest.turnout_identity)
      expect(aptos_menos_comparecimento_menos_abstencoes).toBe(
        TURNOUT_REMAINDER[String(ano) as '2018' | '2022' | '2026'],
      )
  })

  it('the output row counts quoted are the manifest ones', () => {
    for (const [name, rows] of Object.entries(OUTPUT_ROWS)) expect(rows).toBe(manifest.outputs[name]?.rows)
  })

  it('2026 cities plus overseas posts equal the results source city count', () => {
    const results = manifest.sources.find((s) => s.kind === 'results_site')!
    expect(BR_CITIES_2026 + OVERSEAS_POSTS_2026).toBe(results.cities)
    expect(BR_CITIES_2018_2022).toBe(BR_CITIES_2026 - 1)
  })
})

describe('formatters', () => {
  it('numbers, dates and hashes render the way the page shows them', () => {
    expect(formatBytes(395389280)).toBe('395.389.280')
    expect(formatBytes(4269741)).toBe('4.269.741')
    expect(formatUtc('2026-10-26T21:55:20Z')).toBe('26/10/2026 21:55')
    expect(formatUtc('2026-10-26')).toBe('26/10/2026')
    expect(formatUtc('2026-10-25T23:27:44')).toBe('25/10/2026 23:27')
    expect(shortHash('f880848ef4ba340b15cb91ff0754aa370d34ca7b7e605d6607c0f2a75009adc8')).toBe('f880848ef4ba…')
  })

  it('the 2026 row states no invented size or hash', () => {
    const row = sourceRow(SOURCES[4]!)
    expect(row.bytes).toBe('')
    expect(row.hash).toBe('')
    expect(row.collected).toBe('26/10/2026')
  })
})