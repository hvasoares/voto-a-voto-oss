/**
 * Conversions between the pure `CityResult` and the props the shared bar / legend components take
 * (moved from `site/src/shared/city-figures.ts` by #50; the data-store loaders stayed behind — the pages
 * now load the same numbers from the city shards, `web/src/lib/city-shard.ts`).
 */
import type { CityResult, Segment } from './city-model'
import type { CandidateRowProps, TurnoutBarProps } from './components'

const seg = (s: Segment | undefined) => ({ label: s?.label ?? '—', pct: s?.pct ?? 0, votos: s?.votos ?? 0, tone: s?.tone, short: s?.short })

/** Props of the shared voted / not-voted bars. */
export function toTurnoutBarProps(r: CityResult, calc?: TurnoutBarProps['calc']): TurnoutBarProps {
  const [a, b, outros] = [r.voted[0], r.voted[1], r.voted[2]]
  const [abstencao, brancos, nulos] = r.notVoted
  return {
    votedPct: r.votedPct,
    notVoted: { abstencaoPct: abstencao!.pct, brancosPct: brancos!.pct, nulosPct: nulos!.pct },
    candidates: { a: seg(a), b: seg(b) },
    others: outros ? seg(outros) : undefined,
    calc,
  }
}

/** Legend rows of the card: A, B, (Outros), Abstenção, Brancos, Nulos. */
export function toLegendRows(r: CityResult, calcFor?: (key: string) => string): CandidateRowProps[] {
  return [...r.voted, ...r.notVoted].map((s) => ({
    kind: s.tone ?? s.key,
    calc: calcFor?.(s.key),
    label: s.label,
    votes: s.votos,
    shareLabel: `${s.pct}% ${s.key === 'abstencao' || s.key === 'brancos' || s.key === 'nulos' ? 'dos que não votaram' : 'dos votos'}`,
  }))
}