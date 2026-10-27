import { formatInt } from '@/shared/city-model'
import { formatSwing } from '@/lib/margins'
import { BIN_COLOR, fgOf, marginBin, swingBin, type DivBin } from '@/lib/scale'
import { UF_NAMES, ufFullLabel } from '@/lib/uf-names'
import type { StateMapData, StateMapRow } from '@/lib/state-map-data'

/**
 * What the desktop "Mapa por estado" (#54) prints for each state, computed once at build time from the same rows the phone's
 * tile mosaic reads (state-map-data.ts): the value, its colour step, the screen-reader label and the two sentences of the
 * selected-state panel. The sentences are the ones the mosaic's panel writes (frames 10 and 10b); the island of the phone
 * layout calls `panelLines` too, so the two layouts cannot say different things.
 */
export type MapKind = 'margin' | 'swing'

export interface MapCell {
  uf: string
  bin: DivBin
  fill: string
  fg: string
  /** The value printed on the map or its callout: "-7,7", "+0,9" (the dataset's own rounding, no computed difference of ours). */
  text: string
  /** The big number of the panel: "-7,7 pp". */
  big: string
  /** Name of the state: "São Paulo". */
  name: string
  /** `aria-label` of the state's link: "SP · São Paulo: -7,7 pp, Flavio à frente; 26.258.452 votos válidos". */
  label: string
  lines: [string, string]
}

export const valueOf = (row: StateMapRow, kind: MapKind): number => (kind === 'margin' ? row.margin2 : row.swing)

/** Why a colour, in words (colour is never the only cue). */
const direction = (row: StateMapRow, kind: MapKind, data: StateMapData): string => {
  const ahead = valueOf(row, kind) < 0 ? data.ladoBNome : data.ladoANome
  return kind === 'margin' ? `${ahead} à frente` : `variação para ${ahead}`
}

/** The two sentences under the big number of the selected-state panel. */
export function panelLines(kind: MapKind, data: StateMapData, row: StateMapRow): [string, string] {
  const first = `Votos válidos (2º turno): ${formatInt(row.validos2)}`
  const second =
    kind === 'margin'
      ? `Margem (${data.ladoANomeCompleto} − ${data.ladoBNomeCompleto}): ${formatSwing(row.margin2)} pp. Na eleição anterior: ${formatSwing(row.margin1)} pp.`
      : `A margem de ${data.ladoANomeCompleto} sobre ${data.ladoBNomeCompleto} era de ${formatSwing(row.margin1)} pp e passou para ${formatSwing(row.margin2)} pp. Variação: ${formatSwing(row.swing)} pp.`
  return [first, second]
}

export function mapCells(kind: MapKind, data: StateMapData): Record<string, MapCell> {
  const cells: Record<string, MapCell> = {}
  for (const row of data.rows) {
    const value = valueOf(row, kind)
    const bin = kind === 'margin' ? marginBin(row.margin2) : swingBin(row.swing)
    cells[row.uf] = {
      uf: row.uf,
      bin,
      fill: BIN_COLOR[bin],
      fg: fgOf(bin),
      text: formatSwing(value),
      big: `${formatSwing(value)} pp`,
      name: UF_NAMES[row.uf] ?? row.uf.toUpperCase(),
      label: `${ufFullLabel(row.uf)}: ${formatSwing(value)} pp, ${direction(row, kind, data)}; ${formatInt(row.validos2)} votos válidos`,
      lines: panelLines(kind, data, row),
    }
  }
  return cells
}

/** The panel's default state: the one with the most valid votes in the round (the frames pick SP), like the phone's panel. */
export function defaultUf(rows: readonly StateMapRow[]): string {
  return [...rows].sort((a, b) => b.validos2 - a.validos2)[0]?.uf ?? ''
}
