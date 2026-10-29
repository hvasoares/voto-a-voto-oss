import { describe, expect, it } from 'vitest'
import { checksum, PAGE_DATA_VERSION, pageDataFile, stableJson, validatePageData } from './page-data'

const good = () => JSON.parse(stableJson(pageDataFile('fixture', 'rj/cidade-exemplo', { b: 2, a: [1, { z: 1, y: 'é' }] })))

describe('stableJson and checksum', () => {
  it('orders keys at every depth, so the same records give the same bytes', () => {
    expect(stableJson({ b: 1, a: { d: 1, c: 2 } })).toBe('{"a":{"c":2,"d":1},"b":1}')
    expect(checksum({ a: 1, b: 2 })).toBe(checksum({ b: 2, a: 1 }))
  })
  it('changes with the payload', () => {
    expect(checksum({ a: 1 })).not.toBe(checksum({ a: 2 }))
  })
})

describe('validatePageData', () => {
  it('accepts a file the builder wrote', () => {
    expect(validatePageData(good(), { family: 'fixture', path: 'rj/cidade-exemplo' })).toMatchObject({ ok: true })
  })
  it.each(['v', 'family', 'path', 'data', 'sum'])('rejects a missing field %s', (key) => {
    const f = good()
    delete f[key]
    expect(validatePageData(f)).toEqual({ ok: false, error: `missing field ${key}` })
  })
  it('rejects a wrong version', () => {
    expect(validatePageData({ ...good(), v: PAGE_DATA_VERSION + 1 })).toMatchObject({ ok: false, error: expect.stringContaining('wrong version') })
  })
  it('rejects a bad checksum', () => {
    expect(validatePageData({ ...good(), data: { a: 'edited' } })).toEqual({ ok: false, error: 'bad checksum' })
  })
  it('rejects a file for another address or family than the one asked', () => {
    expect(validatePageData(good(), { path: 'sp/x' })).toMatchObject({ ok: false })
    expect(validatePageData(good(), { family: 'qr' })).toMatchObject({ ok: false })
  })
  it.each([null, 'x', [], 3])('rejects %j', (value) => {
    expect(validatePageData(value)).toMatchObject({ ok: false })
  })
})
