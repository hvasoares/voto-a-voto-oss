import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { editionsDir } from '../src/lib/editions-load'

/**
 * Copies every edition's served files into `public/edicoes/<id>/` (ticket #59): `edition.json`, byte for byte as
 * committed, and the files of its open dataset release (#63) under `dados/`. The directory is rebuilt on every run from the committed `editions/`, which no run changes, so an
 * edition's files are identical whatever editions come after it (the test pins it).
 */
export function writeEditions(publicDir: string, source = editionsDir()): string[] {
  const target = resolve(publicDir, 'edicoes')
  rmSync(target, { recursive: true, force: true })
  const ids = readdirSync(source, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort()
  for (const id of ids) {
    mkdirSync(resolve(target, id), { recursive: true })
    cpSync(resolve(source, id, 'edition.json'), resolve(target, id, 'edition.json'))
    if (existsSync(resolve(source, id, 'release'))) cpSync(resolve(source, id, 'release'), resolve(target, id, 'dados'), { recursive: true })
  }
  return ids
}
