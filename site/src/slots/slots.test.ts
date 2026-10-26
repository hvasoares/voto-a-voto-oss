import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { enumerateRoutes, resolveRoute } from '../app'
import { stripBase } from '../paths'
import { makeHref, NOT_YET_HYDRATED, type SlotContext } from '../shared/slot'
import { testContext } from '../shared/test-context'
import { slots } from './registry'

const root = resolve(__dirname, '../..')
const slotsDir = resolve(__dirname)
const { data } = testContext()

const ctxFor = (params: Record<string, string>): SlotContext => ({ ...testContext(params), href: makeHref('/', params) })

describe('slot registry', () => {
  it('covers every frame of the Sketch page "Election SPA v2" plus the placeholders', () => {
    expect(slots.map((s) => s.meta.id)).toEqual([
      'home', 'city', 'share', 'qr', 'state', 'reports', 'flipped-cities', 'brasil', 'city-cycles', 'state-map', 'state-map-flip',
      'compare-2022', 'compare-2018', 'cohorts', 'state-cycles', 'about', 'report-undesigned', 'region-detail',
    ])
  })

  it('has unique ids and routes', () => {
    expect(new Set(slots.map((s) => s.meta.id)).size).toBe(slots.length)
    expect(new Set(slots.map((s) => s.meta.route)).size).toBe(slots.length)
  })

  it('gives every slot a contract, a fixture module, a test and a reference image', () => {
    for (const s of slots) {
      const dir = resolve(slotsDir, s.meta.id)
      for (const f of ['CONTRACT.md', 'fixture.ts', 'slot.ts', 'slot.test.ts']) expect(existsSync(resolve(dir, f)), `${s.meta.id}/${f}`).toBe(true)
      for (const ref of [...s.meta.references, ...(s.meta.extraFixtures ?? []).map((e) => e.reference)]) {
        expect(existsSync(resolve(root, 'reference', ref)), ref).toBe(true)
      }
      expect(s.meta.ticket).toBeGreaterThan(2)
    }
  })

  it('keeps slots independent: no slot imports another slot', () => {
    for (const s of slots) {
      const dir = resolve(slotsDir, s.meta.id)
      for (const f of readdirSync(dir).filter((f) => f.endsWith('.ts'))) {
        const src = readFileSync(resolve(dir, f), 'utf8')
        for (const [, spec] of src.matchAll(/from\s+'([^']+)'/g)) {
          const ok = spec!.startsWith('./') || /^\.\.\/\.\.\/(shared|data|analytics)(\/|$)/.test(spec!) || spec!.startsWith('../../../reference/') || spec === 'vitest'
          expect(ok, `${s.meta.id}/${f} imports "${spec}"`).toBe(true)
        }
      }
    }
  })

  it('never hard-codes colours: slots use design tokens only', () => {
    for (const s of slots) {
      const src = readFileSync(resolve(slotsDir, s.meta.id, 'slot.ts'), 'utf8')
      expect(src).not.toMatch(/#[0-9a-fA-F]{6}\b/)
    }
  })
})

describe('pre-rendering over the fixtures', () => {
  it('lists real-path pages for fixture cities, states, the 2026-only city and the overseas post', async () => {
    const paths = (await enumerateRoutes(slots, data)).map((r) => r.path)
    for (const p of ['/', '/rj/', '/rj/cidade-exemplo/', '/rj/cidade-exemplo/compartilhar/', '/rj/cidade-exemplo/qr/', '/rj/cidade-exemplo/tres-ciclos/', '/mt/boa-esperanca-do-norte/', '/zz/exterior-exemplo/', '/tres-ciclos/sp/', '/mapa/virada/', '/relatorios/maiores-viradas/', '/brasil/sudeste/']) {
      expect(paths, p).toContain(p)
    }
    expect(paths).not.toContain('/zz/')
  })

  it('treats unknown cities and states as not found, not as errors', async () => {
    expect(await resolveRoute('/rj/inexistente/', slots, data)).toBeUndefined()
    expect(await resolveRoute('/zz/', slots, data)).toBeUndefined()
    expect(await resolveRoute('/xx/', slots, data)).toBeUndefined()
    expect((await resolveRoute('/rj/', slots, data))?.slot.meta.id).toBe('state')
    expect((await resolveRoute('/relatorios/cidades-que-viraram/', slots, data))?.slot.meta.id).toBe('flipped-cities')
    expect((await resolveRoute('/relatorios/maiores-viradas/', slots, data))?.slot.meta.id).toBe('report-undesigned')
  })

  it('renders every route; blank slots carry the "not yet hydrated" marker', async () => {
    for (const r of await enumerateRoutes(slots, data)) {
      const page = await r.slot.render(ctxFor(r.params))
      expect(page.title, r.path).toBeTruthy()
      expect(page.html.value.includes(NOT_YET_HYDRATED), r.path).toBe(!r.slot.hydrated)
      expect(page.html.value, r.path).toContain('<h1')
    }
  })

  it('renders the fixture route of every slot', async () => {
    for (const s of slots) {
      const path = stripBase('/', s.meta.fixtureRoute.split('?')[0]!)
      const resolved = await resolveRoute(path, slots, data)
      expect(resolved?.slot.meta.id, s.meta.fixtureRoute).toBe(s.meta.id)
    }
  })
})
