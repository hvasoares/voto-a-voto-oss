/**
 * Pure model of tickets #14 screens (compare with 2022 / 2018 and three cycles per state), no HTML,
 * no data access. The build-time loader (`compare-data.ts`) feeds it tallies; the Astro pages render.
 *
 * Product decisions (ticket #14; the Sketch frames "11 Comparar com 2022", "11b Comparar com 2018",
 * "13 Três ciclos por estado" and web/docs/checkpoints/issue-14.md):
 * - Percentages are shares of valid votes of the 2nd turno, shown with one decimal (frame: "46,2%"),
 *   rounded with largest remainder in tenths so the two sides of a bar add up to exactly 100,0.
 * - Changes are computed from the UNROUNDED percentages: "+12,7 pp" is printed from the exact
 *   shares; "+599.392 votos" is the exact integer vote difference over the compared municipalities.
 * - A cycle without data is "sem dados", never zero (Boa Esperança do Norte/MT is 2026-only).
 * - Side labels follow the frames: candidate 13 is drawn as "Lula" in every cycle (the note of screen
 *   11b names the 2018 candidates: "o do PT (13) e Bolsonaro (17)"), the rival is "Bolsonaro" in
 *   2018/2022 and "Flavio" in 2026. Names come from candidates.csv; the short label is presentation
 *   text for the frame candidates and the site's generic shortening for anything else.
 */
import { formatInt, largestRemainder } from '@site/shared/city-model'

/** The two cycles the compare screens show next to 2026 (routes /comparar/2018/ and /comparar/2022/). */
export const COMPARE_CYCLES = [2018, 2022] as const
export type CompareCycle = (typeof COMPARE_CYCLES)[number]

/** All cycles of screen 13, in the order the frame draws them. */
export const CYCLES: readonly number[] = [2018, 2022, 2026]

/** The two-way runoff tally of one cycle (the Lula side, the rival, and the valid votes of the basis). */
export interface RunoffTally {
  /** Valid votes of the basis: the cycle's own municipalities, or the municipalities both cycles have. */
  validos: number
  left: number
  rival: number
}

/** The runoff pairing of each cycle (ticket rule): 2018 = 13 (PT) vs 17; 2022 and 2026 = 13 vs 22. */
export function runoffPair(ano: number): { left: number; rival: number } {
  return ano === 2018 ? { left: 13, rival: 17 } : { left: 13, rival: 22 }
}

/** The exact (unrounded) percent of `votes` over `validos`, in percentage points. */
export function exactPct(votes: number, validos: number): number {
  return validos > 0 ? (votes / validos) * 100 : 0
}

/**
 * Percents in tenths with largest remainder (462 = "46,2"), taken together so the sides of one bar
 * add up to exactly 100 (1000 tenths), like the site's whole-percent bars do to 100.
 */
export function tenthsOfBar(left: number, rival: number): { left: number; rival: number } {
  const [a = 0, b = 0] = largestRemainder([left, rival], 1000)
  return { left: a, rival: b }
}

/** Whole tenths -> "46,2" (always one decimal, the way the frames write percentages: "32,0%"). */
export function formatOneDecimal(tenths: number): string {
  const sign = tenths < 0 ? '-' : ''
  const t = Math.abs(tenths)
  return `${sign}${Math.floor(t / 10)},${t % 10}`
}

/** Signed integer with the pt-BR thousands separator: 599392 -> "+599.392", -77409 -> "-77.409". */
export function formatSignedInt(n: number): string {
  return n >= 0 ? `+${formatInt(n)}` : `-${formatInt(Math.abs(n))}`
}

/**
 * Signed pp text from two UNROUNDED percentages: 44.7609 vs 32.0281 -> "+12,7". Signed with one
 * decimal; rounding to the shown tenth never reads from anything but the exact shares.
 */
export function formatPpChange(currentExact: number, previousExact: number): string {
  const tenths = Math.round((currentExact - previousExact) * 10)
  const sign = tenths > 0 ? '+' : tenths < 0 ? '-' : ''
  return `${sign}${formatOneDecimal(Math.abs(tenths))}`
}

/**
 * Short name a candidate is drawn with. The frame candidates of the pairing get the frames' wording
 * (screens 11, 11b, 13; the 11b note explains that 2018 rows are "o do PT (13)"); anything else
 * (the fixture dataset's "Candidato A/B") gets the site's generic shortening.
 */
const FRAME_SHORT: Record<string, string> = {
  LULA: 'Lula',
  'FERNANDO HADDAD': 'Lula',
  'JAIR BOLSONARO': 'Bolsonaro',
  'FLAVIO BOLSONARO': 'Flavio',
}

/** Short label for one urna name ("FLAVIO BOLSONARO" -> "Flavio", "JAIR BOLSONARO" -> "Bolsonaro"). */
export function shortName(nomeUrna: string): string {
  const frame = FRAME_SHORT[nomeUrna.trim().toUpperCase()]
  if (frame) return frame
  const single = /^(?:Candidato|CANDIDATO)\s+([A-Za-z])$/.exec(nomeUrna.trim())
  if (single) return single[1]!.toUpperCase()
  const first = nomeUrna.trim().split(/\s+/)[0] ?? nomeUrna.trim()
  return first.slice(0, 1).toUpperCase() + first.slice(1).toLowerCase()
}

export interface CompareSide {
  label: string
  /** Exact percent in 2026 and in the compared cycle (unrounded; the pp changes use these). */
  share26: number
  shareOld: number
  /** Percent difference in pp, unrounded inputs. */
  diffPp: number
  /** Vote difference, 2026 minus the compared cycle, in integer votes over the compared municipalities. */
  diffVotes: number
  /** Votes of the side in each cycle (the volume shown with the rate: title of the row). */
  votos26: number
  votosOld: number
  /** Percent of the side in 2026 in tenths (for the bar). */
  tenths26: number
  /** Display percent with one decimal, 2026 and the compared cycle. */
  pct26: string
  pctOld: string
}

/** One state of the compare screens: 2026 vs the compared cycle, both candidates. */
export interface CompareRow {
  uf: string
  /** Valid votes of the 2026 second turno summed over the municipalities BOTH cycles have. */
  validos: number
  left: CompareSide
  rival: CompareSide
}

export interface CompareRowInput {
  uf: string
  c: RunoffTally
  old: RunoffTally
  labels: { left: string; rival: string }
}

/** Builds one state row of the compare screens from the paired tallies; the sort stays below. */
export function buildCompareRow(p: CompareRowInput): CompareRow {
  const side = (v26: number, vOld: number, label: string, tenths: number): CompareSide => {
    const share26 = exactPct(v26, p.c.validos)
    const shareOld = exactPct(vOld, p.old.validos)
    return {
      label,
      share26,
      shareOld,
      diffPp: share26 - shareOld,
      diffVotes: v26 - vOld,
      votos26: v26,
      votosOld: vOld,
      tenths26: tenths,
      pct26: formatOneDecimal(tenths),
      pctOld: formatOneDecimal(Math.round(shareOld * 10)),
    }
  }
  const tenths26 = tenthsOfBar(p.c.left, p.c.rival)
  return {
    uf: p.uf,
    validos: p.c.validos,
    left: side(p.c.left, p.old.left, p.labels.left, tenths26.left),
    rival: side(p.c.rival, p.old.rival, p.labels.rival, tenths26.rival),
  }
}

/** Compare rows sorted deterministically: the six largest states first (2026 valid votes), then every other UF; ties by UF. */
export function sortCompareRows(rows: readonly CompareRow[]): CompareRow[] {
  return [...rows].sort((a, b) => b.validos - a.validos || a.uf.localeCompare(b.uf, 'pt'))
}

/** The pct text of a compared cycle's bar: largest remainder of THAT cycle's bar (32,0 / 68,0). */
export function pctOfCycle(t: RunoffTally, side: 'left' | 'rival'): string {
  const tenths = tenthsOfBar(t.left, t.rival)
  return formatOneDecimal(tenths[side])
}

/** One displayed side of a bar: its label, exact share and largest-remainder tenths. */
export interface Side {
  label: string
  /** Exact (unrounded) percent of the cycle's own valid votes. */
  share: number
  /** Percent in tenths (462) for the bar width. */
  tenths: number
}

export interface CycleBarSide extends Side {
  votes: number
  pct: string
}

/** One bar of screen 13 (one state, one cycle): data, or "sem dados" without any zero. */
export interface CycleBlock {
  status: 'data' | 'no-data'
  ano: number
  /** undefined on a no-data cycle. */
  left?: CycleBarSide
  rival?: CycleBarSide
  validos?: number
  /** "+12,7" against the previous cycle, computed from the unrounded shares; undefined for the first cycle with data or when there is nothing to compare. */
  changePp?: string
  /** The cycle the change points at. */
  changeVs?: number
}

export interface CycleBarInput {
  ano: number
  /** undefined (cycle not in the data for this state) or zero validos -> the "sem dados" block. */
  tally?: RunoffTally
  labels: { left: string; rival: string }
  /** The previous cycle IN THE FRAME ORDER (2018 -> 2022 -> 2026) with a data tally, for the change line. */
  previous?: { ano: number; tally: RunoffTally }
}

/** Builds one bar of screen 13. A cycle without data is "sem dados", never zeros. */
export function buildCycleBlock(p: CycleBarInput): CycleBlock {
  const { ano, tally: t, labels, previous } = p
  if (!t || t.validos <= 0) return { status: 'no-data', ano }
  const tenths = tenthsOfBar(t.left, t.rival)
  const mk = (v: number, share: number, tenth: number, label: string): CycleBarSide => ({
    label,
    share,
    tenths: tenth,
    pct: formatOneDecimal(tenth),
    votes: v,
  })
  return {
    status: 'data',
    ano,
    validos: t.validos,
    left: mk(t.left, exactPct(t.left, t.validos), tenths.left, labels.left),
    rival: mk(t.rival, exactPct(t.rival, t.validos), tenths.rival, labels.rival),
    changePp: previous && p.tally ? formatPpChange(exactPct(t.left, t.validos), exactPct(previous.tally.left, previous.tally.validos)) : undefined,
    changeVs: previous?.ano,
  }
}

/** The three blocks of screen 13 for one state, 2018 -> 2022 -> 2026, each change against the PREVIOUS CYCLE WITH DATA (unrounded). */
export function buildCycleBlocks(input: {
  /** tally per cycle; missing or empty -> "sem dados". */
  tallies: ReadonlyMap<number, RunoffTally>
  /** Short side labels per cycle: { 2018: ..., 2022: ..., 2026: ... } x { left, rival }. */
  labels: Readonly<Record<number, { left: string; rival: string }>>
}): CycleBlock[] {
  const blocks: CycleBlock[] = []
  let previous: { ano: number; tally: RunoffTally } | undefined
  for (const ano of CYCLES) {
    const tally = input.tallies.get(ano)
    blocks.push(
      buildCycleBlock({
        ano,
        tally,
        labels: input.labels[ano] ?? { left: '?', rival: '?' },
        previous: tally && previous ? previous : undefined,
      }),
    )
    if (tally && tally.validos > 0) previous = { ano, tally }
  }
  return blocks
}

/** Compare text of a "sem dados" block; the frame's wording for screen 13. */
export const NO_DATA = 'sem dados'