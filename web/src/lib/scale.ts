/**
 * The diverging colour scale of the state map (frames 10/10b), PURE: the same bins colour the
 * mosaic tiles, the map paths and the legend. Colours come from the Sketch swatches
 * (`div-*` in @site/shared/tokens) mapped to CSS custom properties by @/theme.
 *
 * - Margin: centred on zero, bins at the frame's legend numbers -30 | -15 | 0 | +15 | +30.
 *   The zero bin is exactly 0 (or under half a tenth of a pp, so a margin stored as -0.0... does
 *   not flicker into a colour): negative margins are Flavio ahead, positive are Lula ahead.
 * - Swing: bins 0 | +2,5 | +5 (the frame's swing legend); negatives use the same steps mirrored.
 * - Meaning is never colour alone: callers draw the signed value on every tile and map label,
 *   and the legend carries the boundary numbers of the bins.
 */

export type DivBin = 'zero' | 'neg1' | 'neg2' | 'neg3' | 'pos1' | 'pos2' | 'pos3'

/** Half a tenth of a pp: absolute margins below this read as zero. */
const ZERO_EPS = 0.05

export function marginBin(pp: number): DivBin {
  if (Math.abs(pp) < ZERO_EPS) return 'zero'
  if (pp < 0) return pp <= -30 ? 'neg3' : pp <= -15 ? 'neg2' : 'neg1'
  return pp >= 30 ? 'pos3' : pp >= 15 ? 'pos2' : 'pos1'
}

export function swingBin(pp: number): DivBin {
  if (Math.abs(pp) < ZERO_EPS) return 'zero'
  if (pp < 0) return pp <= -5 ? 'neg3' : pp <= -2.5 ? 'neg2' : 'neg1'
  return pp >= 5 ? 'pos3' : pp >= 2.5 ? 'pos2' : 'pos1'
}

/** CSS custom property of each bin, on :root via @/theme (Sketch swatches). */
export const BIN_COLOR: Record<DivBin, string> = {
  neg3: 'var(--sketch-div-neg-3)',
  neg2: 'var(--sketch-div-neg-2)',
  neg1: 'var(--sketch-div-neg-1)',
  zero: 'var(--sketch-div-zero)',
  pos1: 'var(--sketch-div-pos-1)',
  pos2: 'var(--sketch-div-pos-2)',
  pos3: 'var(--sketch-div-pos-3)',
}

/** The bins a legend row shows for margin values (frame: -30 -15 0 +15 +30 under the swatches). */
export function marginLegend(): { bins: DivBin[]; edges: string[] } {
  return { bins: ['neg3', 'neg2', 'neg1', 'zero', 'pos1', 'pos2', 'pos3'], edges: ['-30', '-15', '0', '+15', '+30'] }
}

/**
 * The legend of the swing view. The scale covers both directions, but when no UF has a negative
 * swing the row shows only the positive swatches plus the frame's note, so the legend never
 * advertises a colour the page does not use.
 */
export function swingLegend(swings: readonly number[]): { bins: DivBin[]; edges: string[]; negativeNote: string | null } {
  const hasNegative = swings.some((s) => s < -ZERO_EPS)
  const bins = hasNegative ? (['neg3', 'neg2', 'neg1'] as DivBin[]) : []
  const edges = hasNegative ? ['-5', '-2,5', '0', '+2,5', '+5'] : ['0', '+2,5', '+5']
  return { bins: [...bins, 'zero', 'pos1', 'pos2', 'pos3'], edges, negativeNote: hasNegative ? null : 'Sem estados com variação negativa' }
}

/** Dark ink on the light steps, paper on the dark ones (contrast, like the frames). */
export function fgOf(bin: DivBin): 'var(--foreground)' | 'var(--background)' {
  return bin === 'zero' || bin === 'neg1' || bin === 'pos1' ? 'var(--foreground)' : 'var(--background)'
}

/**
 * Tile edge (px) scaled by valid votes, between MIN (usable tap target at 390px) and MAX.
 * sqrt keeps the area feeling proportional without letting the smallest tile sink below MIN.
 */
export const TILE_MIN = 40
export const TILE_MAX = 48

export function tileEdge(validos: number, maxValidos: number): number {
  if (maxValidos <= 0) return TILE_MAX
  const s = Math.sqrt(Math.max(0, validos) / maxValidos)
  return Math.round(TILE_MIN + (TILE_MAX - TILE_MIN) * s)
}