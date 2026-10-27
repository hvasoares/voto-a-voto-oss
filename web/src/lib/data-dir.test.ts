import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { dataDir } from './data-dir'

describe('dataset switch', () => {
  it('uses the committed fixtures in web/fixtures/data by default', () => {
    expect(dataDir({}, '/w/web')).toBe(resolve('/w/web/fixtures/data'))
  })
  it('uses DATA_DIR relative to web/ (real data: DATA_DIR=../data)', () => {
    expect(dataDir({ DATA_DIR: '../data' }, '/w/web')).toBe(resolve('/w/data'))
  })
})
