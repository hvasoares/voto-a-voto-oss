import { formatInt } from './city-model'
import { html, Raw } from './html'
import { cardCalcLink } from '../lib/facts/link'
import { pickCandidateText } from './fit-candidate'

/*
 * Shared building-block PLACEHOLDERS. Each has a documented props interface that the hydration
 * ticket named below implements WITHOUT changing the signature, so other screens keep working.
 * Until then they render a visible dashed box ("placeholder") with the props they were given.
 * Ownership (who may edit the body): see CONTRACT in src/shared/README.md.
 */

const ph = (name: string, ticket: number, body: Raw | string) =>
  html`<div class="ph" data-placeholder="${name}" data-ticket="${ticket}"><span class="ph__tag">placeholder · ${name} · #${ticket}</span>${body}</div>`

export type CandidateKind = 'a' | 'b' | 'outros' | 'abstencao' | 'brancos' | 'nulos'

/**
 * Voted / not-voted bars of the city card (frames 2, 3, 9). Implemented by #5; #6 draws three of them, #7 draws the
 * same numbers on a canvas. Markup contract: `<section class="turnout">` with two headings and two `.bar`s whose
 * `.bar__seg--{kind}` segments are sized by `flex-grow: pct`. The text of a segment shrinks with its width
 * (see `segmentText`); the full text is always in the `title` attribute.
 */
export interface TurnoutBarProps {
  /** Share of the electorate that voted (valid votes), 0-100. */
  votedPct: number
  /** 100 - votedPct, split into abstention / blank / null (each % of the non-voters, summing to 100). */
  notVoted: { abstencaoPct: number; brancosPct: number; nulosPct: number }
  /** Split of the voted bar between the two candidates (% of valid votes). */
  candidates: { a: { label: string; pct: number; votos?: number; tone?: CandidateKind; short?: string }; b: { label: string; pct: number; votos?: number; tone?: CandidateKind; short?: string } }
  /** Round 1 only: everyone but the two leaders as one segment ("Outros candidatos (N)"); the three shares add up to 100. */
  others?: { label: string; pct: number; votos?: number }
  /** Where "ver cálculo" goes for the two titles (#61); the titles carry no link when absent (the other screens that draw the bars). */
  calc?: { voted: string; notVoted: string }
}

/** Text tiers of a bar segment, longest first: the first one that fits the segment's width wins (see `segmentText`). */
const TIERS: Record<Exclude<CandidateKind, 'a' | 'b'>, ((pct: number) => string)[]> = {
  outros: [(p) => `Outros  ${p}% dos votos`, (p) => `Outros  ${p}%`, () => 'Outros'],
  abstencao: [(p) => `Abstenção ${p}% dos que não votaram`, (p) => `Abstenção ${p}%`, () => 'Abstenção'],
  brancos: [(p) => `Brancos ${p}% dos que não votaram`, (p) => `Brancos ${p}%`, () => 'Brancos'],
  nulos: [(p) => `Nulos ${p}% dos que não votaram`, (p) => `Nulos ${p}%`, () => 'Nulos'],
}

/** Width of the card's bar at 390 px, rough bold 13px glyph width (the type scale's step 1, #86) and the segment's padding: how much text fits a segment. */
const BAR_PX = 318
export const GLYPH_PX = 7
export const PAD_PX = 10

/**
 * The text of a candidate segment (#82): name and share, never the share alone unless the segment is a sliver. It gives way in
 * steps, wrapping before it shortens: "Flavio Bolsonaro 48%", "Flavio" over "Bolsonaro 48%", "Flavio Bolsonaro" over "48%", "Flavio" over "48%", "48%", ''.
 */
export function candidateText(name: string, pct: number, short?: string): string {
  return pickCandidateText(name, `${pct}%`, short, (line) => line.length <= roomOf(pct))
}

/** How many characters fit a segment of `pct` percent of the bar. */
const roomOf = (pct: number) => Math.floor(((pct / 100) * BAR_PX - PAD_PX) / GLYPH_PX)

/**
 * The text that fits a segment of `pct` percent of its bar, whole or not at all (#89): a segment too narrow for its label prints
 * nothing, never initials like "Br"; the legend row below the bar carries the label and the share. `name` is the candidate's for the two sides.
 */
export function segmentText(kind: CandidateKind, pct: number, name = ''): string {
  if (kind === 'a' || kind === 'b') return candidateText(name, pct)
  return TIERS[kind].map((text) => text(pct)).find((t) => t.length <= roomOf(pct)) ?? ''
}

interface BarSegment {
  kind: CandidateKind
  pct: number
  title: string
  /** The candidate's name (the two sides): the segment prints it beside the share. */
  name?: string
  /** A named candidate (the two sides): its text is the name and share, whatever colour kind it wears. */
  named?: true
  /** The table's short form of the name, for the narrowest step before the share alone. */
  short?: string
}

const bar = (label: string, segs: BarSegment[]) =>
  html`<div class="bar" role="img" aria-label="${label}">${segs
    .filter((s) => s.pct > 0)
    .map((s) => {
      const text = s.named ? candidateText(s.name!, s.pct, s.short) : segmentText(s.kind, s.pct, s.name)
      // the title only says more than the text when the text had to give way (it is the hover for a segment with no text at all)
      return html`<span class="bar__seg bar__seg--${s.kind}" style="flex-grow:${s.pct}"${text === `${s.name} ${s.pct}%` || text === s.title.replace(':', '') ? '' : html` title="${s.title}"`}>${text}</span>`
    })}</div>`

export function turnoutBar(p: TurnoutBarProps): Raw {
  const { a, b } = p.candidates
  const voted: BarSegment[] = [
    // the label is already the identity table's spelling (#84, shared/candidates.ts); the colour is the candidate's own side
    { kind: a.tone ?? 'a', pct: a.pct, title: `${a.label}: ${a.pct}% dos votos`, name: a.label, short: a.short, named: true },
    { kind: b.tone ?? 'b', pct: b.pct, title: `${b.label}: ${b.pct}% dos votos`, name: b.label, short: b.short, named: true },
    ...(p.others ? [{ kind: 'outros' as const, pct: p.others.pct, title: `${p.others.label}: ${p.others.pct}% dos votos`, name: p.others.label }] : []),
  ]
  const n = p.notVoted
  const notVoted: BarSegment[] = [
    { kind: 'abstencao', pct: n.abstencaoPct, title: `Abstenção: ${n.abstencaoPct}% dos que não votaram` },
    { kind: 'brancos', pct: n.brancosPct, title: `Brancos: ${n.brancosPct}% dos que não votaram` },
    { kind: 'nulos', pct: n.nulosPct, title: `Nulos: ${n.nulosPct}% dos que não votaram` },
  ]
  const notVotedPct = 100 - p.votedPct
  return html`<section class="turnout" data-component="turnout-bar">
    <h2 class="turnout__title">Votaram <span class="turnout__sep" aria-hidden="true">·</span> ${p.votedPct}% do eleitorado${p.calc && cardCalcLink(p.calc.voted)}</h2>
    ${bar(`Votaram, por candidato: ${voted.filter((s) => s.pct > 0).map((s) => `${s.name} ${s.pct}%`).join(', ')} dos votos`, voted)}
    <h2 class="turnout__title">Não votaram <span class="turnout__sep" aria-hidden="true">·</span> ${notVotedPct}% do eleitorado${p.calc && cardCalcLink(p.calc.notVoted)}</h2>
    ${bar('Não votaram, por tipo', notVoted)}
  </section>`
}

/**
 * Cycle tabs 2018 | 2022 | 2026 (frame 2). Implemented by #6: plain links (work without JavaScript), the active one has
 * aria-current="true"; each link carries data-ciclo for the progressive enhancement of the city slot.
 */
export interface CycleTabsProps {
  cycles: number[]
  active: number
  /** Link for a cycle tab (real path or query), built with ctx.href. */
  hrefFor(cycle: number): string
}
export function cycleTabs(p: CycleTabsProps): Raw {
  return html`<nav class="tabs" aria-label="Ciclo" data-component="cycle-tabs">${p.cycles.map((c) => html`<a class="tabs__tab" href="${p.hrefFor(c)}" data-ciclo="${c}" aria-current="${c === p.active ? 'true' : 'false'}">${c}</a>`)}</nav>`
}

/**
 * Round tabs 1º turno | 2º turno (frames 2, 9). Implemented by #5: plain links (work without JavaScript), the active one has
 * aria-current="true"; each link carries data-turno for the progressive enhancement of the city slot.
 */
export interface RoundTabsProps {
  active: 1 | 2
  hrefFor(turno: 1 | 2): string
}
export function roundTabs(p: RoundTabsProps): Raw {
  return html`<nav class="tabs" aria-label="Turno" data-component="round-tabs">${([1, 2] as const).map((t) => html`<a class="tabs__tab" href="${p.hrefFor(t)}" data-turno="${t}" aria-current="${t === p.active ? 'true' : 'false'}">${t}º turno</a>`)}</nav>`
}

/**
 * Legend row of the city card: swatch, name, "36.400 · 52% dos votos" (frame 2). Implemented by #5. Renders an `<li>`:
 * put the rows in a `<ul class="legend">`.
 */
export interface CandidateRowProps {
  kind: CandidateKind
  /** "Candidato A", "Abstenção", ... */
  label: string
  /** Absolute votes. */
  votes: number
  /** Already formatted percentage text, e.g. "52% dos votos" or "78% dos que não votaram". */
  shareLabel: string
  /** Where "ver cálculo" goes for this row (#61). */
  calc?: string
}
export function candidateRow(p: CandidateRowProps): Raw {
  return html`<li class="legend__row" data-kind="${p.kind}"><span class="legend__swatch legend__swatch--${p.kind}" aria-hidden="true"></span><span class="legend__label">${p.label}${p.calc && cardCalcLink(p.calc)}</span><span class="legend__value">${formatInt(p.votes)} · ${p.shareLabel}</span></li>`
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
