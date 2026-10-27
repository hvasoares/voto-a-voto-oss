import type { Turno } from '../../data'
import { formatInt, type Segment } from '../../shared/city-model'
import { html, type Raw } from '../../shared/html'
import { notVotedText, sideText, type CycleBlock, type Side } from './cycles-model'

/** Markup of the three-cycle page body: pure functions from the model to HTML (runs in Node and in the browser). */

const sideBar = (b: Extract<CycleBlock, { status: 'data' }>): Raw =>
  b.validos <= 0
    ? html`<div class="bar" role="img" aria-label="Votaram, por candidato: nenhum voto válido"><span class="bar__seg bar__seg--empty">Nenhum voto válido</span></div>`
    : html`<div class="bar" role="img" aria-label="Votaram, por candidato">${b.sides
        .filter((s: Side) => s.pct > 0)
        .map((s: Side) => html`<span class="bar__seg bar__seg--${s.key}" style="flex-grow:${s.pct}" data-numero="${s.numero ?? ''}" data-votos="${s.votos}" data-pct="${s.pct}" title="${s.label}: ${s.pct}% dos votos (${formatInt(s.votos)} votos)">${sideText(s)}</span>`)}</div>`

const notVotedBar = (segs: Segment[]): Raw =>
  html`<div class="bar" role="img" aria-label="Não votaram, por tipo">${segs
    .filter((s) => s.pct > 0)
    .map((s) => {
      const key = s.key as 'abstencao' | 'brancos' | 'nulos'
      return html`<span class="bar__seg bar__seg--${key}" style="flex-grow:${s.pct}" data-votos="${s.votos}" data-pct="${s.pct}" title="${s.label}: ${s.pct}% dos que não votaram (${formatInt(s.votos)})">${notVotedText(key, s.pct)}</span>`
    })}</div>`

export function cycleBlock(b: CycleBlock): Raw {
  if (b.status === 'no-data')
    return html`<div class="cycle cycle--nodata" data-ano="${b.ano}" data-nodata><h2 class="cycle__year">${b.ano}</h2><p class="cycle__nodata">sem dados nesse ciclo</p><p class="cycle__reason">${b.reason}</p></div>`
  return html`<div class="cycle" data-ano="${b.ano}"><h2 class="cycle__year">${b.ano}</h2>
    <p class="cycle__label">Votaram ${b.votedPct}% do eleitorado (barra: % dos votos)</p>${sideBar(b)}
    <p class="cycle__label cycle__label--second">Não votaram ${b.notVotedPct}% do eleitorado (barra: % dos que não votaram)</p>${notVotedBar(b.notVoted)}</div>`
}

/** One round of the page: its subtitle and the three cycles. `hidden` = not the round shown by default (JavaScript shows it on request). */
export function roundPanel(p: { turno: Turno; subtitle: string; blocks: CycleBlock[]; hidden: boolean }): Raw {
  return html`<section class="cycles__round" data-turno="${p.turno}" ${p.hidden ? 'hidden' : ''}>
    <p class="page__subtitle">${p.subtitle}</p>${p.blocks.map(cycleBlock)}</section>`
}

