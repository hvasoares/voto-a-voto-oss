/**
 * The 27 federative units as drawn in the Sketch frame "1 Home": a tile map that follows the
 * shape of Brazil (north on top, Rio Grande do Sul at the bottom). `col`/`row` are 1-based cells of a
 * 7-column grid. This is geography, not election data; the overseas post (`zz`) is deliberately absent.
 */
export interface UfTile {
  uf: string
  col: number
  row: number
}

const rows: Record<number, [string, number][]> = {
  1: [['rr', 3], ['ap', 4], ['rn', 7]],
  2: [['am', 2], ['pa', 4], ['ma', 5], ['ce', 6], ['pb', 7]],
  3: [['ac', 1], ['ro', 2], ['to', 4], ['pi', 5], ['pe', 6], ['al', 7]],
  4: [['mt', 3], ['go', 4], ['df', 5], ['ba', 6], ['se', 7]],
  5: [['ms', 4], ['sp', 5], ['mg', 6], ['es', 7]],
  6: [['pr', 4], ['sc', 5], ['rj', 6]],
  7: [['rs', 4]],
}

export const UF_TILES: UfTile[] = Object.entries(rows).flatMap(([row, tiles]) => tiles.map(([uf, col]) => ({ uf, col, row: Number(row) })))
