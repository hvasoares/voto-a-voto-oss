import { describe, expect, it } from 'vitest'
import { hitStroke, hitUnits, MAP_PX, TOUCH_PX } from './map-hit'
import { UF_SHAPES } from './uf-polygons'

/** The state map is drawn MAP_PX wide over a 486-unit viewBox (StateMapMap.tsx). */
const HIT = hitUnits(486)

describe('hit units of the state map (#88)', () => {
  it('44 CSS px is 62 viewBox units at 350 px wide', () => {
    expect([TOUCH_PX, MAP_PX, HIT]).toEqual([44, 350, 62])
    expect(HIT * (MAP_PX / 486)).toBeGreaterThanOrEqual(TOUCH_PX)
  })

  it('a shape already as big as a fingertip needs no hit stroke; a smaller one grows to exactly the minimum', () => {
    expect(hitStroke(100, 90, HIT)).toBe(0)
    expect(hitStroke(62, 62, HIT)).toBe(0)
    expect(hitStroke(9.4, 5.5, HIT)).toBe(57) // DF: the tiniest, 62 - 5.5 rounded up
    expect(hitStroke(63, 22, HIT)).toBe(40) // PE: wide enough, too short
  })

  it('lifts every one of the 27 shapes to a 44 px bounding box, and the smallest ones are the ones that get a stroke', () => {
    expect(UF_SHAPES).toHaveLength(27)
    for (const s of UF_SHAPES) {
      const grown = Math.min(s.w, s.h) + hitStroke(s.w, s.h, HIT)
      expect(grown * (MAP_PX / 486), s.uf).toBeGreaterThanOrEqual(TOUCH_PX)
    }
    const small = UF_SHAPES.filter((s) => Math.min(s.w, s.h) * (MAP_PX / 486) < 30).map((s) => s.uf).sort()
    expect(small).toEqual(['ac', 'al', 'ce', 'df', 'es', 'pb', 'pe', 'rj', 'rn', 'sc', 'se']) // the 11 of the ticket
    for (const uf of small) expect(hitStroke(UF_SHAPES.find((s) => s.uf === uf)!.w, UF_SHAPES.find((s) => s.uf === uf)!.h, HIT), uf).toBeGreaterThan(0)
  })
})
