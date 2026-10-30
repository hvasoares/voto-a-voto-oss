// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { loadCityRoutes } from '@/lib/city-routes'
import { loadCityShard } from '@/lib/shard-files'
import { checkCityShard, cityShardResult, type CityShard } from '@/lib/city-shard'
import { CYCLES } from '@/shared/city-model'
import { displayName } from '@/shared/city-search'
import { DEFAULT_TURNO, buildCycleBlock } from '@/slots/city-cycles/cycles-model'
import { roundPanel } from '@/slots/city-cycles/cycles-view'
import { cyclesPageHtml, drawCyclesPage } from './cycles-page-draw'

/**
 * The three-cycles page drawn on the client (private#216) against what the build printed before: the panels the page used to pre-render are rebuilt here the
 * way the old page did (`buildCycleBlock` and `roundPanel` over the shard on disk), and the client output, from the shard as the browser receives it (JSON text,
 * through the shard check), must be the same markup, both rounds, all three cycles, for every city of the fixture build.
 */
const reference = (shard: CityShard): string[] =>
  ([1, 2] as const).map((turno) =>
    roundPanel({
      turno,
      subtitle: `Presidente 2018, 2022 e 2026 · ${displayName(shard.city.nome)} (${turno}º turno)`,
      blocks: CYCLES.map((ano) => buildCycleBlock({ ano, turno, city: shard.city, result: cityShardResult(shard, ano, turno) })),
      hidden: turno !== DEFAULT_TURNO,
    }).toString(),
  )
const normal = (markup: string): string => {
  const box = document.createElement('div')
  box.innerHTML = markup
  return box.innerHTML
}

let shards: CityShard[]
beforeAll(async () => {
  const routes = await loadCityRoutes()
  shards = (await Promise.all(routes.map((r) => loadCityShard(r.uf, r.slug)))).filter((s): s is CityShard => s !== undefined)
})

describe('the client-drawn panels equal the build\'s', () => {
  it('has a sample with a city of every shape of the fixture', () => {
    expect(shards.length).toBeGreaterThan(1)
  })

  it('draws both rounds of the three cycles with the same markup as the pre-rendered page, for every city', () => {
    for (const shard of shards) {
      const received = checkCityShard(JSON.parse(JSON.stringify(shard)), `${shard.city.uf}/${shard.city.slug}`)
      expect(received.ok).toBe(true)
      const host = document.createElement('div')
      document.body.append(host)
      drawCyclesPage(() => {})((received as { data: CityShard }).data, host)
      const drawn = [...host.querySelectorAll('.cycles__round')].map((p) => p.outerHTML)
      expect(drawn.map(normal)).toEqual(reference(shard).map(normal))
      expect(host.querySelectorAll('.cycle')).toHaveLength(6)
      host.remove()
    }
  })

  it('shows round 2 by default, offers round 1 in the switch link and keeps the legend', () => {
    const host = document.createElement('div')
    host.innerHTML = cyclesPageHtml(shards[0]!)
    expect(host.querySelector('[data-cycles]')!.getAttribute('data-turno')).toBe('2')
    expect(host.querySelector('.cycles__round[data-turno="1"]')!.hasAttribute('hidden')).toBe(true)
    expect(host.querySelector('.cycles__round[data-turno="2"]')!.hasAttribute('hidden')).toBe(false)
    expect(host.querySelector('[data-switch]')!.textContent).toBe('Ver o 1º turno ›')
    expect(host.querySelector('.cycles__legend')!.textContent).toContain('O candidato de menor número na urna fica à esquerda')
  })

  it('mounts the switching on the drawn page and puts the page\'s heading back to "Três ciclos"', () => {
    document.body.innerHTML = '<main><h1>Três ciclos · X · Voto a Voto</h1><div id="area"></div></main>'
    const mount = vi.fn()
    drawCyclesPage(mount)(shards[0]!, document.getElementById('area')!)
    expect(mount).toHaveBeenCalledWith(document.querySelector('[data-cycles]'))
    expect(document.querySelector('h1')!.textContent).toBe('Três ciclos')
  })
})

describe('the shard check', () => {
  it.each([
    ['not an object', null],
    ['a file cut short', { city: { uf: 'rj', slug: 'x' } }],
    ['another city', { city: { uf: 'sp', slug: 'x' }, cycles: {}, candidates: {} }],
  ])('refuses %s', (_, json) => {
    expect(checkCityShard(json, 'rj/x').ok).toBe(false)
  })
})
