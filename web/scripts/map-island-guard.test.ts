import { globSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * #140 guard: the three map islands draw polygons with the one `toPath` of `lib/map-path` and take the selected area, its tap and the
 * replay of the taps kept before hydration from `useMapView` (built on the shared gate of #122). An island that keeps its own path
 * builder, or wires the pending-uf / pending-cd storage into the gate itself, fails here.
 */
const WEB = resolve(import.meta.dirname, '..')
const ISLANDS = globSync('src/components/{CityMapMap,StateMapMap,StayHomeMap}.tsx', { cwd: WEB }).sort()

/** The copied pieces, one by one. */
export const FORBIDDEN: [RegExp, string][] = [
  [/(?:function|const)\s+toPath\b/, 'declares its own toPath: import it from @/lib/map-path'],
  [/useIslandReady\(/, 'opens the ready gate itself: take the selection and the replay from useMapView'],
  [/\.markReady\(/, 'replays the kept taps itself: pass onVistaTap and openMap to useMapView'],
  [/pending(?:Uf|Cd)/, 'names the pending-uf / pending-cd storage outside useMapView options: use select.storage only'],
]

/** Forbidden pieces found per file; the `select.storage` option is the one allowed mention of the storage name. */
export const violations = (files: Record<string, string>): string[] =>
  Object.entries(files).flatMap(([file, text]) => {
    const code = text.replace(/select:\s*\{\s*storage:\s*'pending(?:Uf|Cd)'/g, '')
    return FORBIDDEN.filter(([re]) => re.test(code)).map(([, why]) => `${file}: ${why}`)
  })

describe('map islands share their path builder and their selection block (#140)', () => {
  it('scans the three islands (a glob that matches nothing guards nothing)', () => {
    expect(ISLANDS).toHaveLength(3)
  })

  it('none of them keeps its own toPath or its own held-tap replay', () => {
    const texts = Object.fromEntries(ISLANDS.map((f) => [f, readFileSync(resolve(WEB, f), 'utf8')]))
    expect(violations(texts)).toEqual([])
  })

  it('can fail: the old private copies are reported', () => {
    const old = [
      "const island = useIslandReady('state-map', { host: sectionRef, storage: ['pendingUf', 'pendingVista'] })",
      'useEffect(() => { island.markReady((tap) => { if (tap.storage === "pendingUf") tapState(tap.value) }) }, [])',
      'function toPath(pts: readonly (readonly [number, number])[]): string { return "" }',
    ].join('\n')
    expect(violations({ 'src/components/StateMapMap.tsx': old })).toHaveLength(4)
  })
})
