import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { writeEditions } from './editions'

const fixtures = resolve(import.meta.dirname, '../fixtures/editions')
const dirs: string[] = []
const scratch = () => dirs[dirs.push(mkdtempSync(resolve(tmpdir(), 'editions-'))) - 1]!
afterEach(() => dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })))

const read = (dir: string, id: string) => readFileSync(resolve(dir, 'edicoes', id, 'edition.json'), 'utf8')

describe('writeEditions', () => {
  it('serves each edition.json byte for byte as committed', () => {
    const out = scratch()
    expect(writeEditions(out, fixtures)).toEqual(['2026-10-20', '2026-10-26'])
    expect(read(out, '2026-10-26')).toBe(readFileSync(resolve(fixtures, '2026-10-26/edition.json'), 'utf8'))
  })

  it('publishing a new edition never changes the files of an older one', () => {
    const source = scratch()
    cpSync(resolve(fixtures, '2026-10-20'), resolve(source, '2026-10-20'), { recursive: true })
    const before = scratch()
    writeEditions(before, source)
    const older = read(before, '2026-10-20')

    cpSync(resolve(fixtures, '2026-10-26'), resolve(source, '2026-10-26'), { recursive: true }) // a newer edition arrives
    const after = scratch()
    writeEditions(after, source)

    expect(readdirSync(resolve(after, 'edicoes'))).toEqual(['2026-10-20', '2026-10-26'])
    expect(read(after, '2026-10-20')).toBe(older)
  })

  it('writes the same bytes on a second run', () => {
    const out = scratch()
    writeEditions(out, fixtures)
    const first = read(out, '2026-10-26')
    writeEditions(out, fixtures)
    expect(read(out, '2026-10-26')).toBe(first)
  })
})
