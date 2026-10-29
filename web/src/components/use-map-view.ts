import { useEffect, useRef, useState, type RefObject } from 'react'
import type { HeldStorage, HeldTap } from '@/lib/island-ready'
import { useIslandReady, type IslandReady } from './use-island-ready'

/**
 * The part of the view state the three map islands share (#140): the selected area, the tap that selects
 * it (with its analytics event), and the replay of the taps the page script kept before hydration, in
 * arrival order, so the last kept tap decides the selection (`lib/island-ready.ts` holds the queue
 * rules; the hook only maps each kept tap to the island's own action). After the replay the `?vista=mapa`
 * deep link opens the map. What differs per island (zoom, list or tile view, how a kept toggle tap is
 * applied) stays in the island: `onVistaTap` and `openMap` are its answers.
 */
export interface MapViewOptions {
  /** The island name for the ready gate, e.g. `state-map`. */
  name: string
  /** The selection when nothing was tapped yet. */
  initialSelected: string
  /**
   * Which kept tap selects, and the island's own report of a selecting tap (its analytics call, which
   * stays a literal in the island so the events table can find the emitter).
   */
  select: { storage: Extract<HeldStorage, 'pendingUf' | 'pendingCd'>; track(value: string): void }
  /** A kept tap on the view toggle (`pendingVista`) that landed while React was attaching. */
  onVistaTap(value: string): void
  /** The URL asks for the map view (`?vista=mapa`). */
  openMap(): void
}

export interface MapView {
  island: IslandReady
  sectionRef: RefObject<HTMLElement | null>
  selected: string
  /** A tap on an area: selects it (when it is another one) and reports the event. */
  tap(value: string): void
}

export function useMapView({ name, initialSelected, select, onVistaTap, openMap }: MapViewOptions): MapView {
  const [selected, setSelected] = useState(initialSelected)
  const sectionRef = useRef<HTMLElement | null>(null)
  const island = useIslandReady(name, { host: sectionRef, storage: [select.storage, 'pendingVista'] })
  const tap = (value: string) => {
    if (value !== selected) setSelected(value)
    select.track(value)
  }

  // Replay the kept taps, then report data-ready=yes in the same commit - yes is never observed before they are applied.
  useEffect(() => {
    island.markReady((held: HeldTap) => {
      if (held.storage === 'pendingVista') onVistaTap(held.value)
      else if (held.storage === select.storage) tap(held.value)
    })
    if (new URLSearchParams(window.location.search).get('vista') === 'mapa') openMap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { island, sectionRef, selected, tap }
}

/**
 * A kept toggle tap on the Mosaico | Mapa pair, applied to the address (State and Ficaram em casa: the
 * `?vista=mapa` read right after puts the island on the map).
 */
export function keepVistaInUrl(value: string): void {
  const url = new URL(window.location.href)
  if (value === 'mapa') url.searchParams.set('vista', 'mapa')
  else url.searchParams.delete('vista')
  window.history.replaceState(null, '', url)
}
