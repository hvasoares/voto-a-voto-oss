import { existsSync } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createNodeStore } from '../src/data/node'
import { buildSite } from './build'

const root = resolve(__dirname, '..')
const real = resolve(root, '../data')
const hasReal = existsSync(join(real, 'cities.csv'))

/** Runs only when the real dataset (ticket #1) exists at ../data; skipped otherwise. */
describe.skipIf(!hasReal)('build against the real dataset (../data)', () => {
  it('succeeds and pre-renders every city page (city, share, qr, tres-ciclos)', async () => {
    const out = await mkdtemp(join(tmpdir(), 'site-real-'))
    const r = await buildSite({ OUT_DIR: out, DATA_DIR: '../data' }, root)
    const cities = await createNodeStore(real).cities()
    expect(cities.length).toBeGreaterThan(5000)
    expect(r.pages).toBeGreaterThanOrEqual(cities.length * 4)
    for (const c of cities) {
      for (const sub of ['', 'compartilhar/', 'qr/', 'tres-ciclos/']) {
        if (!existsSync(join(out, c.uf, c.slug, sub, 'index.html'))) throw new Error(`missing page ${c.uf}/${c.slug}/${sub}`)
      }
    }
    expect(existsSync(join(out, 'zz', 'index.html'))).toBe(false)
    expect(existsSync(join(out, 'rj', 'index.html'))).toBe(true)
  }, 120_000)
})
