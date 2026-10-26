import { existsSync, readFileSync } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildSite } from './build'

const root = resolve(__dirname, '..')

describe('static build', () => {
  it('writes a pre-rendered file per real path, a 404 fallback and the data, under a Pages-style base', async () => {
    const out = await mkdtemp(join(tmpdir(), 'site-'))
    const r = await buildSite({ OUT_DIR: out, SITE_BASE: '/voto-a-voto/' }, root)
    expect(r.pages).toBeGreaterThan(40)
    const city = readFileSync(join(out, 'rj/cidade-exemplo/index.html'), 'utf8')
    expect(city).toContain('href="/voto-a-voto/rj/"')
    expect(city).toContain('src="/voto-a-voto/assets/app.js"')
    expect(city).toContain('data-city-card')
    expect(city).not.toContain('not yet hydrated')
    expect(readFileSync(join(out, 'rj/cidade-exemplo/compartilhar/index.html'), 'utf8')).toContain('not yet hydrated')
    expect(existsSync(join(out, '404.html'))).toBe(true)
    expect(existsSync(join(out, '.nojekyll'))).toBe(true)
    expect(existsSync(join(out, 'data/cities.csv'))).toBe(true)
    expect(readFileSync(join(out, 'assets/app.css'), 'utf8')).toContain('--c-accent: #14505c')
  })

  it('uses DATA_DIR when given, and fails loudly when files are missing', async () => {
    const out = await mkdtemp(join(tmpdir(), 'site-'))
    await expect(buildSite({ OUT_DIR: out, DATA_DIR: join(out, 'nope') }, root)).rejects.toThrow(/missing cities\.csv/)
    const ok = await buildSite({ OUT_DIR: out, DATA_DIR: 'fixtures/data' }, root)
    expect(ok.pages).toBeGreaterThan(0)
  })
})
