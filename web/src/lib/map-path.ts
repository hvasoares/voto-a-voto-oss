/**
 * The SVG path data of a polygon, shared by the three map islands (#140): `M x y L x y ... Z`,
 * points in the viewBox's own units. One build, so a shape drawn on the State, Ficaram em casa and
 * City maps cannot drift apart.
 */
export function toPath(pts: readonly (readonly [number, number])[]): string {
  let d = 'M'
  for (let i = 0; i < pts.length; i++) {
    if (i > 0) d += 'L'
    d += `${pts[i]![0]} ${pts[i]![1]}`
  }
  return d + 'Z'
}
