import { useEffect, useRef } from 'react'
import { enhanceMap, type MapEnhanceOptions } from '@/lib/nerds/map-enhance'

/** The map island (#78): renders a 1 px sentinel for the lazy directive and enhances the static SVG of its own panel; see lib/nerds/map-enhance.ts. */
export default function MapaEnhancer(props: Omit<MapEnhanceOptions, 'search'>) {
  const sentinel = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const panel = sentinel.current?.closest<HTMLElement>('[data-panel="mapa"]')
    if (!panel) return
    const enhanced = enhanceMap(panel, { ...props, search: location.search })
    return () => enhanced.destroy()
  }, [props])
  return <span ref={sentinel} className="nerds-sentinel" aria-hidden="true" />
}
