import { describe, expect, it } from 'vitest'
import { assertReportPage, assertReportRows, type ReportRow } from './layout'

const row: ReportRow = { id: 'x', uf: 'sp', slug: 'campinas', name: 'Campinas/SP', detail: '1 voto' }

describe('assertReportRows', () => {
  it('accepts well-formed rows and an empty list', () => {
    expect(() => assertReportRows('p', [row, { ...row, id: 0 }])).not.toThrow()
    expect(() => assertReportRows('p', [])).not.toThrow()
  })

  it.each(['uf', 'slug', 'name', 'detail'] as const)('names the page, the row and the empty %s', (field) => {
    expect(() => assertReportRows('relatorios/x', [row, { ...row, [field]: ' ' }])).toThrow(`relatorios/x: row 1 has an empty ${field}`)
  })

  it('rejects a row without an id and a non-array', () => {
    expect(() => assertReportRows('p', [{ ...row, id: undefined as unknown as string }])).toThrow('p: row 0 has no id')
    expect(() => assertReportRows('p', {} as unknown as ReportRow[])).toThrow('rows must be an array')
  })
})

describe('assertReportPage', () => {
  const page = { title: 'T · Voto a Voto', heading: 'T', seal: [] as string[] }

  it('accepts the minimum a page hands over', () => {
    expect(() => assertReportPage({ ...page, report: 'r', notice: 'n' })).not.toThrow()
  })

  it('fails with the page named when a field is malformed', () => {
    expect(() => assertReportPage({ ...page, heading: '' })).toThrow('report page "T · Voto a Voto": heading is empty')
    expect(() => assertReportPage({ ...page, seal: undefined as unknown as string[] })).toThrow('seal must be the lines of sealOf()')
    expect(() => assertReportPage({ ...page, notice: '' })).toThrow('notice must be non-empty')
    expect(() => assertReportPage({ ...page, title: '' })).toThrow('report page has no title')
  })
})
