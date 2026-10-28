import { colors } from '@/shared/tokens'
import { esc, fit, rect, text, wrap } from '../share-card'
import type { ExportTable, Panel } from './actions'

/**
 * The panel image (#80): a 16:9 picture (1600 x 900) of one panel - its question, the numbers it prints as a small table, the source seal, the four-field footer and the
 * permalink - PURE like the other cards (`panelCardSvg` returns an SVG string; the island turns it into a PNG with `svgToPng`). The picture is the panel's table, never a chart:
 * every number is text, so it cannot say more than the panel does.
 */
export const PANEL_CARD_SIZE = { width: 1600, height: 900 }
const LEFT = 72
const INNER = 1456

export function panelCardSvg(o: { panel: Panel; table: ExportTable; place: string; fonte: string; url: string; alt?: string }): string {
  const { width, height } = PANEL_CARD_SIZE
  const out: string[] = [rect(0, 0, width, height, colors.paper)]
  out.push(text(LEFT, 84, 20, `Dados para nerds · ${o.place}`, { weight: 700, fill: colors.muted }))
  const title = wrap(o.panel.title, 44, INNER, 2) ?? [fit(o.panel.title, 44, INNER)]
  title.slice(0, 2).forEach((line, i) => out.push(text(LEFT, 140 + i * 52, 44, line, { serif: true })))
  const top = 140 + Math.min(title.length, 2) * 52 + 24
  const cols = o.table.headers.length
  const first = 360
  const rest = (INNER - first) / Math.max(1, cols - 1)
  const rowH = 40
  const maxRows = Math.floor((height - 250 - top) / rowH)
  const x = (c: number) => (c === 0 ? LEFT : LEFT + first + (c - 1) * rest)
  o.table.headers.forEach((h, c) => out.push(text(c === 0 ? x(c) : x(c) + rest - 12, top + 24, 15, h.toUpperCase(), { weight: 700, fill: colors.muted, anchor: c === 0 ? 'start' : 'end' })))
  out.push(rect(LEFT, top + 36, INNER, 2, colors.ink))
  const shown = o.table.rows.slice(0, maxRows)
  shown.forEach((row, r) => {
    const y = top + 36 + (r + 1) * rowH
    row.forEach((cell, c) => out.push(text(c === 0 ? x(c) : x(c) + rest - 12, y - 10, 22, fit(cell, 22, c === 0 ? first - 16 : rest - 16), { anchor: c === 0 ? 'start' : 'end', weight: c === 0 ? 400 : 600 })))
    out.push(rect(LEFT, y, INNER, 1, colors.rule))
  })
  if (o.table.rows.length > shown.length) out.push(text(LEFT, top + 36 + (shown.length + 1) * rowH, 16, `… e mais ${o.table.rows.length - shown.length} linhas na tabela do painel.`, { fill: colors.muted }))
  // the four provenance fields and the seal
  const f = o.panel.footer
  const fy = height - 190
  out.push(rect(LEFT, fy - 20, INNER, 1, colors.rule))
  ;[['DEFINIÇÃO', f.definicao], ['FONTE', o.fonte], ['CÁLCULO', f.calculo], ['NÃO MEDE', f.naoMede]].forEach(([label, body], i) => {
    const cx = LEFT + i * 366
    out.push(text(cx, fy, 13, label!, { weight: 700, fill: colors.muted }))
    ;(wrap(body!, 15, 340, 4) ?? [fit(body!, 15, 340)]).slice(0, 4).forEach((line, j) => out.push(text(cx, fy + 22 + j * 20, 15, line)))
  })
  out.push(text(LEFT, height - 66, 18, 'Fonte: TSE, dados finais · voto-a-voto', { weight: 700, fill: colors.accent }))
  out.push(text(LEFT, height - 38, 15, fit(o.url, 15, INNER), { fill: colors.muted }))
  const label = esc(o.alt ?? `${o.panel.title} (${o.place})`)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${label}"><title>${label}</title>${out.join('')}</svg>`
}
