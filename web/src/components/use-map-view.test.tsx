// @vitest-environment jsdom
import { render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getAnalytics, setAnalytics, noopAnalytics, type Analytics } from '@/analytics'
import { keepVistaInUrl, useMapView } from './use-map-view'

/** A probe island: renders the selection, records the toggle taps and the deep-link opening. */
function Probe({ log }: { log: string[] }) {
  const { sectionRef, island, selected } = useMapView({
    name: 'probe-map',
    initialSelected: 'sp',
    select: { storage: 'pendingUf', track: (uf) => getAnalytics().event('map_state_tap', { uf }) },
    onVistaTap: (value) => log.push(`vista:${value}`),
    openMap: () => log.push('open'),
  })
  return <section ref={sectionRef} data-root data-ready={island.dataReady} data-selected={selected} />
}

const host = (attrs: Record<string, string>) => {
  const el = document.createElement('astro-island')
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}
const root = () => document.querySelector('[data-root]')!
const ready = () => waitFor(() => expect(root().getAttribute('data-ready')).toBe('yes'))

afterEach(() => {
  setAnalytics(noopAnalytics)
  window.history.replaceState(null, '', '/')
  document.body.innerHTML = ''
})

describe('useMapView', () => {
  it('starts on the initial selection and reports ready with nothing kept', async () => {
    render(<Probe log={[]} />)
    await ready()
    expect(root().getAttribute('data-selected')).toBe('sp')
  })

  it('applies the kept taps in arrival order: the last kept selection wins, the toggle goes to the island', async () => {
    const log: string[] = []
    const wrap = host({ 'data-pending-uf': 'rj', 'data-pending-vista': 'mapa' })
    render(<Probe log={log} />, { container: wrap })
    await ready()
    expect(root().getAttribute('data-selected')).toBe('rj')
    expect(log).toEqual(['vista:mapa'])
  })

  it('reports the selection event with the island parameter when a kept tap selects', async () => {
    const event = vi.fn()
    setAnalytics({ ...noopAnalytics, event } as Analytics)
    const wrap = host({ 'data-pending-uf': 'mg' })
    render(<Probe log={[]} />, { container: wrap })
    await ready()
    expect(event).toHaveBeenCalledWith('map_state_tap', { uf: 'mg' })
  })

  it('opens the map when the address asks for ?vista=mapa, and only then', async () => {
    window.history.replaceState(null, '', '/?vista=mapa')
    const log: string[] = []
    render(<Probe log={log} />)
    await ready()
    expect(log).toEqual(['open'])
  })
})

describe('keepVistaInUrl', () => {
  it('sets ?vista=mapa for the map and removes it for the mosaic', () => {
    keepVistaInUrl('mapa')
    expect(window.location.search).toBe('?vista=mapa')
    keepVistaInUrl('mosaico')
    expect(window.location.search).toBe('')
  })
})
