/**
 * The embeddable city widget (#29), PURE: the address of a city's widget and the one-line snippet that places it in another site.
 * The snippet is a plain `<iframe>`: nothing to install, no script of the host's to trust, no script of ours either (the widget page has none).
 */
import { editionLabel } from './editions'

/** Height of the snippet's iframe, in px: tall enough for the longest generated sentence at 320 px wide with no scrollbar (checked in e2e on the real data). */
export const WIDGET_HEIGHT = 200

/** `https://votoavoto.exemplo.br/embed/rj/cidade-exemplo/` (base-aware). */
export function widgetUrl(origin: string, base: string, uf: string, slug: string): string {
  const b = base.endsWith('/') ? base : `${base}/`
  return `${origin}${b.startsWith('/') ? b : `/${b}`}embed/${uf}/${slug}/`
}

const escAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** The snippet to paste: an iframe at the full width of its column, a fixed height, no border, a title for screen readers. */
export function widgetSnippet(o: { url: string; cityName: string; height?: number }): string {
  return `<iframe src="${escAttr(o.url)}" width="100%" height="${o.height ?? WIDGET_HEIGHT}" style="border:0" title="${escAttr(`Resultado de ${o.cityName}`)}"></iframe>`
}

/** "Fonte: TSE · edição 26/10/2026": what the widget always states. The catalog has no say here: it is a label, not a sentence about data. */
export const widgetSource = (edition: Parameters<typeof editionLabel>[0]) => `TSE · edição ${editionLabel(edition)}`
