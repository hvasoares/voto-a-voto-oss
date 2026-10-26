import { html, Raw } from './html'

/*
 * Shared building-block PLACEHOLDERS. Each has a documented props interface that the hydration
 * ticket named below implements WITHOUT changing the signature, so other screens keep working.
 * Until then they render a visible dashed box ("placeholder") with the props they were given.
 * Ownership (who may edit the body): see CONTRACT in src/shared/README.md.
 */

const ph = (name: string, ticket: number, body: Raw | string) =>
  html`<div class="ph" data-placeholder="${name}" data-ticket="${ticket}"><span class="ph__tag">placeholder · ${name} · #${ticket}</span>${body}</div>`

export type CandidateKind = 'a' | 'b' | 'outros' | 'abstencao' | 'brancos' | 'nulos'

/** Voted / not-voted bar of the city card (frames 2, 3, 9). Real implementation: ticket #5. */
export interface TurnoutBarProps {
  /** Share of the electorate that voted (valid votes), 0-100. */
  votedPct: number
  /** 100 - votedPct, split into abstention / blank / null (each % of the non-voters, summing to 100). */
  notVoted: { abstencaoPct: number; brancosPct: number; nulosPct: number }
  /** Split of the voted bar between the two candidates (% of valid votes). */
  candidates: { a: { label: string; pct: number; votos?: number }; b: { label: string; pct: number; votos?: number } }
  /** Round 1 only: everyone but the two leaders as one segment ("Outros candidatos (N)"); the three shares add up to 100. */
  others?: { label: string; pct: number; votos?: number }
}
export function turnoutBar(p: TurnoutBarProps): Raw {
  return ph(
    'turnout-bar',
    5,
    html`<p>Votaram ${p.votedPct}% · não votaram ${100 - p.votedPct}%. ${p.candidates.a.label} ${p.candidates.a.pct}% · ${p.candidates.b.label} ${p.candidates.b.pct}%. Abstenção ${p.notVoted.abstencaoPct}% · brancos ${p.notVoted.brancosPct}% · nulos ${p.notVoted.nulosPct}%.</p>`,
  )
}

/** Cycle tabs 2018 | 2022 | 2026 (frame 2). Real implementation: ticket #6. */
export interface CycleTabsProps {
  cycles: number[]
  active: number
  /** Link for a cycle tab (real path or query), built with ctx.href. */
  hrefFor(cycle: number): string
}
export function cycleTabs(p: CycleTabsProps): Raw {
  return ph('cycle-tabs', 6, html`<nav class="tabs" aria-label="Ciclo">${p.cycles.map((c) => html`<a class="tabs__tab" href="${p.hrefFor(c)}" aria-current="${c === p.active ? 'true' : 'false'}">${c}</a>`)}</nav>`)
}

/** Round tabs 1º turno | 2º turno (frames 2, 9). Real implementation: ticket #5. */
export interface RoundTabsProps {
  active: 1 | 2
  hrefFor(turno: 1 | 2): string
}
export function roundTabs(p: RoundTabsProps): Raw {
  return ph('round-tabs', 5, html`<nav class="tabs" aria-label="Turno">${([1, 2] as const).map((t) => html`<a class="tabs__tab" href="${p.hrefFor(t)}" aria-current="${t === p.active ? 'true' : 'false'}">${t}º turno</a>`)}</nav>`)
}

/** Legend row of the city card: swatch, name, "36.400 · 52% dos votos" (frame 2). Real implementation: ticket #5. */
export interface CandidateRowProps {
  kind: CandidateKind
  /** "Candidato A", "Abstenção", ... */
  label: string
  /** Absolute votes. */
  votes: number
  /** Already formatted percentage text, e.g. "52% dos votos" or "78% dos que não votaram". */
  shareLabel: string
}
export function candidateRow(p: CandidateRowProps): Raw {
  return ph('candidate-row', 5, html`<p>[${p.kind}] ${p.label}: ${p.votes.toLocaleString('pt-BR')} · ${p.shareLabel}</p>`)
}

/** Item of the reports hub (frame 6): bold title, one-line headline number, chevron. Real implementation: ticket #12. */
export interface ReportListItemProps {
  title: string
  /** Headline number, computed from the data (never typed in). */
  summary: string
  href: string
}
export function reportListItem(p: ReportListItemProps): Raw {
  return ph('report-list-item', 12, html`<a class="report-item" href="${p.href}"><strong>${p.title}</strong><span>${p.summary}</span><span aria-hidden="true">›</span></a>`)
}

/** Consent banner (ticket #20). Hidden in the skeleton; page-frame renders its mount point. */
export interface ConsentBannerProps {
  accepted: boolean | undefined
}
export function consentBanner(_p: ConsentBannerProps): Raw {
  return html`<div class="ph" data-placeholder="consent-banner" data-ticket="20" hidden></div>`
}
