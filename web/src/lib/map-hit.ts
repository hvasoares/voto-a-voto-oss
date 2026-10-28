/**
 * Touch targets of the state map (ticket #88). The SVG is drawn 350 CSS px wide over a 486-unit viewBox, so a finger-sized
 * 44 px target is `HIT_UNITS` units. A shape smaller than that gets an invisible hit path: its own outline with a thick
 * transparent stroke, whose bounding box is at least HIT_UNITS wide and tall. The drawing stays faithful to the geography
 * because the hit paths are drawn BELOW every visible shape (they only claim empty space and never a neighbour's visible area).
 */
export const TOUCH_PX = 44
export const MAP_PX = 350

/** Units of the viewBox (`viewBoxWidth` wide, drawn `MAP_PX` CSS px wide) that make a TOUCH_PX target. */
export const hitUnits = (viewBoxWidth: number): number => Math.ceil((TOUCH_PX * viewBoxWidth) / MAP_PX)

/**
 * Width of the transparent stroke that lifts a shape of `w` x `h` units to a `min`-unit hit box (0 when it already is one).
 * A stroke with round joins grows the bounding box by its width on both axes.
 */
export function hitStroke(w: number, h: number, min: number): number {
  return Math.max(0, Math.ceil(min - Math.min(w, h)))
}
