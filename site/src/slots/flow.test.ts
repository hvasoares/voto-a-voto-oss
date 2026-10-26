import { describe, expect, it } from 'vitest'
import { enumerateRoutes, resolveRoute } from '../app'
import { stripBase } from '../paths'
import { makeHref } from '../shared/slot'
import { testContext } from '../shared/test-context'
import { slots } from './registry'

const { data } = testContext()

/** Slot -> slots it links to, rendered at its fixture route. */
async function graph(): Promise<Map<string, Set<string>>> {
  const out = new Map<string, Set<string>>()
  for (const r of await enumerateRoutes(slots, data)) {
    const ctx = { ...testContext(r.params), href: makeHref('/', r.params) }
    const page = await r.slot.render(ctx)
    const edges = out.get(r.slot.meta.id) ?? new Set<string>()
    for (const [, href] of page.html.value.matchAll(/href="([^"]+)"/g)) {
      const url = new URL(href!.replace(/&amp;/g, '&'), 'http://site')
      const hit = await resolveRoute(stripBase('/', url.pathname), slots, data)
      expect(hit, `${r.path} links to ${href} which resolves to no page`).toBeDefined()
      edges.add(hit!.slot.meta.id)
    }
    out.set(r.slot.meta.id, edges)
  }
  return out
}

/** Arrows of the Sketch page "Fluxo" (plus link texts inside the frames). */
const FLOW: [string, string][] = [
  ['home', 'city'], ['home', 'state'], ['home', 'brasil'], ['home', 'state-map'], ['home', 'reports'], ['home', 'state-cycles'], ['home', 'about'],
  ['city', 'share'], ['city', 'city-cycles'], ['city', 'compare-2022'], ['city', 'state'], ['city', 'home'],
  ['share', 'qr'], ['share', 'city'], ['qr', 'share'], ['qr', 'city'],
  ['state', 'state-map'], ['state', 'state-cycles'], ['state', 'city'], ['state', 'home'],
  ['reports', 'flipped-cities'], ['reports', 'compare-2022'], ['reports', 'cohorts'], ['reports', 'report-undesigned'], ['reports', 'about'],
  ['flipped-cities', 'reports'], ['flipped-cities', 'city'], ['cohorts', 'reports'],
  ['brasil', 'state-map'], ['brasil', 'region-detail'],
  ['state-map', 'state-map-flip'], ['state-map-flip', 'state-map'], ['state-map', 'state'], ['state-map-flip', 'state'],
  ['compare-2022', 'compare-2018'], ['compare-2018', 'compare-2022'], ['compare-2022', 'state'], ['compare-2018', 'state'],
  ['state-cycles', 'state'], ['state-cycles', 'city-cycles'],
]

describe('prototype flow ("Fluxo") is clickable end to end', () => {
  it('has every arrow of the prototype as a real link, and no link goes to a missing page', async () => {
    const g = await graph()
    for (const [from, to] of FLOW) expect(g.get(from)?.has(to), `${from} -> ${to}`).toBe(true)
  })

  it('reaches every slot starting from Home', async () => {
    const g = await graph()
    const seen = new Set<string>(['home'])
    const queue = ['home']
    while (queue.length) for (const to of g.get(queue.shift()!) ?? []) if (!seen.has(to)) (seen.add(to), queue.push(to))
    expect([...seen].sort()).toEqual(slots.map((s) => s.meta.id).sort())
  })

  it('every result screen links to "Sobre os dados"', async () => {
    const g = await graph()
    for (const id of ['reports', 'flipped-cities', 'brasil', 'state-map', 'state-map-flip', 'compare-2022', 'compare-2018', 'cohorts', 'state-cycles', 'city', 'home']) {
      expect(g.get(id)?.has('about'), id).toBe(true)
    }
  })
})
