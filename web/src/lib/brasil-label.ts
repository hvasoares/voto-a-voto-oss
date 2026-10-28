/**
 * The text of one candidate's segment in a bar of /brasil/ (#91), PURE: the same fit steps as every other bar (`pickCandidateText`), measured in characters
 * like the City card's bar (`GLYPH_PX`, `PAD_PX`). The page's bars are 28 px tall and carry ONE line of 13 px text, so the wrapped steps do not apply: the
 * name and share, else the table's short form and share, else the share alone, else nothing. A runoff name is never cut with an ellipsis and the text
 * is never smaller than 13 px (the type scale's floor): a segment too narrow prints no smaller text, it prints less.
 */
import { GLYPH_PX, PAD_PX } from '@/shared/components'
import { pickCandidateText } from '@/shared/fit-candidate'

/** The page's bars at their narrowest: 390 px minus the page's 20 px gutters (wider screens only add room). */
export const BAR_PX = 350
/** The 2 px paper gap between the slices of a bar. */
const SLICE_GAP = 2

export interface LabelSide {
  labelFull: string
  /** The identity table's short form. */
  label: string
  /** "47,2" (no percent sign). */
  pctText: string
}

/** `share` is the segment's part of its bar, 0 to 100. */
export function barText(c: LabelSide, share: number, barPx = BAR_PX): string {
  const room = Math.floor(((share / 100) * barPx - SLICE_GAP - PAD_PX) / GLYPH_PX)
  const pct = `${c.pctText}%`
  const oneLine = (name: string) => pickCandidateText(name, pct, undefined, (line, lines) => lines === 1 && line.length <= room)
  const full = oneLine(c.labelFull)
  return full === pct ? oneLine(c.label) : full
}
