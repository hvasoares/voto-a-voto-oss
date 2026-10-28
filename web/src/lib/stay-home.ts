/**
 * "Ficaram em casa" (#32), PURE: per state, the share of the electorate that did not vote for anyone (abstention, blank and null,
 * plus the few votes annulled in a separate count) in one cycle and round, and the one claim the measure note supports.
 *
 * Definitions (docs/nonvoters-vs-margin.md, same as the city card): did not vote = `aptos - validos`; the share of a state is the sum over its
 * cities divided by its electorate. The overseas posts (UF "zz") are not a state and never appear. No candidate enters any number here.
 *
 * The claim (`nonVotersExceedMargin`) is the note's: in how many tenths of a percent of the cities the number of people who did not vote for
 * anyone is STRICTLY larger than the margin of votes between the two first. It is made per cycle and round, with that selection's own number,
 * and says nothing about who those people are or what would have changed (words: `sentences/stayhome.ts`).
 */
import type { Turnout, Vote } from '@/data'

export const OVERSEAS_UF = 'zz'

export interface StayHomeRow {
  uf: string
  aptos: number
  naoVotaram: number
  /** Exact percent of the electorate (0 to 100). */
  share: number
}

export interface StayHomeView {
  ano: number
  turno: 1 | 2
}

export function stayHomeRows(turnout: readonly Turnout[], ano: number, turno: 1 | 2): StayHomeRow[] {
  const byUf = new Map<string, { aptos: number; naoVotaram: number }>()
  for (const r of turnout) {
    if (r.ano !== ano || r.turno !== turno || r.uf === OVERSEAS_UF) continue
    const acc = byUf.get(r.uf) ?? { aptos: 0, naoVotaram: 0 }
    acc.aptos += r.aptos
    acc.naoVotaram += r.aptos - r.validos
    byUf.set(r.uf, acc)
  }
  return [...byUf]
    .filter(([, a]) => a.aptos > 0)
    .map(([uf, a]) => ({ uf, aptos: a.aptos, naoVotaram: a.naoVotaram, share: (a.naoVotaram / a.aptos) * 100 }))
    .sort((a, b) => (a.uf < b.uf ? -1 : 1))
}

/** The cycles and rounds the dataset has, newest cycle first, round 1 before round 2. */
export function stayHomeViews(turnout: readonly Turnout[]): StayHomeView[] {
  const seen = new Set<string>()
  const views: StayHomeView[] = []
  for (const r of turnout) {
    const key = `${r.ano}-${r.turno}`
    if (seen.has(key)) continue
    seen.add(key)
    views.push({ ano: r.ano, turno: r.turno })
  }
  return views.sort((a, b) => b.ano - a.ano || a.turno - b.turno)
}

/** "21,1": one decimal and a comma, as the frames write it. */
export function formatShare(share: number): string {
  return (Math.round(share * 10) / 10).toFixed(1).replace('.', ',')
}

/** The edges between the seven steps, in percent. Fixed, so the same colour means the same share in every cycle and round. */
export const STAY_HOME_EDGES = [17, 20, 23, 26, 29, 32] as const

export type StayHomeBin = 1 | 2 | 3 | 4 | 5 | 6 | 7

/** An edge belongs to the step above it. */
export function stayHomeBin(share: number): StayHomeBin {
  return (STAY_HOME_EDGES.filter((e) => share >= e).length + 1) as StayHomeBin
}

/**
 * The one-direction teal scale of the Sketch frames, lightest to darkest. Kept here, not in `shared/tokens.ts`: a token becomes CSS variables inlined in EVERY
 * page's head, and these seven are used by this screen alone (the city card's html has no room for them). Step 5 is a little darker than the frame's
 * #43808c so that the paper ink on it reaches the 4.5:1 contrast of WCAG AA.
 */
const HEX: Record<StayHomeBin, string> = { 1: '#eef3f1', 2: '#cfe0e0', 3: '#a5c6ca', 4: '#74a5ad', 5: '#38707d', 6: '#24606c', 7: '#14404b' }

/** The fill of each step (a hex, used as is by the island, the fragment and the picture). */
export const STAY_HOME_COLOR: Record<StayHomeBin, string> = HEX

/** Ink on the lightest steps, paper on the dark ones (the contrast is tested). */
export function stayHomeInk(bin: StayHomeBin): 'var(--foreground)' | 'var(--background)' {
  return bin >= 5 ? 'var(--background)' : 'var(--foreground)'
}

export const stayHomeHex = (bin: StayHomeBin): string => HEX[bin]

export function stayHomeLegend(): { bins: StayHomeBin[]; edges: string[] } {
  return { bins: [1, 2, 3, 4, 5, 6, 7], edges: STAY_HOME_EDGES.map((e) => String(e)) }
}

export interface Claim {
  cities: number
  greater: number
  /** Percent of the cities in tenths (525 = 52,5%), rounded half up as the note does. */
  tenths: number
}

/** The note's measure for one cycle and round; undefined when no city has an electorate and valid votes. */
export function nonVotersExceedMargin(turnout: readonly Turnout[], votes: readonly Vote[], ano: number, turno: 1 | 2): Claim | undefined {
  const top = new Map<string, [number, number]>()
  for (const x of votes) {
    if (x.ano !== ano || x.turno !== turno || x.uf === OVERSEAS_UF) continue
    const cur = top.get(x.cdMunicipio) ?? [0, 0]
    if (x.votos > cur[0]) top.set(x.cdMunicipio, [x.votos, cur[0]])
    else {
      if (x.votos > cur[1]) cur[1] = x.votos
      top.set(x.cdMunicipio, cur)
    }
  }
  let cities = 0
  let greater = 0
  for (const r of turnout) {
    if (r.ano !== ano || r.turno !== turno || r.uf === OVERSEAS_UF || r.aptos <= 0 || r.validos <= 0) continue
    cities++
    const [first, second] = top.get(r.cdMunicipio) ?? [0, 0]
    if (r.aptos - r.validos > first - second) greater++
  }
  return cities ? { cities, greater, tenths: Math.floor((greater * 1000) / cities + 0.5) } : undefined
}
