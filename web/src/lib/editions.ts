/**
 * Editions (ticket #59): the dated, immutable snapshots of the dataset. The data of an edition is produced and checked by
 * `src/voto_a_voto/editions.py` (`make publish-edition`); this file is the site's pure side: the shape of `edition.json`,
 * the order, the addresses, the citation and the Atom feed. Nothing here reads the disk (see `editions-load.ts`).
 */
import { formatUtc } from './about'

/** The `edition.json` of one edition, as the pipeline writes it. */
export interface Edition {
  schema_version: number
  /** Also the directory name and the address segment: the collection date, plus `-2`, `-3` for further editions of one day. */
  id: string
  /** `YYYY-MM-DD` */
  date: string
  /** The shard directory name (`v<fingerprint>`) of the data the edition holds. */
  fingerprint: string
  counts: {
    municipalities: number
    overseas_posts: number
    municipalities_per_cycle: Record<string, number>
    rows: Record<string, number>
  }
  /** `{ "2026-2": { comparecimento, validos } }`: whole-country sums, overseas included. */
  totals: Record<string, { comparecimento: number; validos: number }>
  notes: string[]
  files: Record<string, { bytes: number; sha256: string }>
  publication: { mode: 'manual' | 'automatic'; checks: { name: string; ok: boolean; detail: string }[] }
  /** The open dataset release of the edition (ticket #63), served under `edicoes/<id>/dados/`. */
  release: { identifier: string; license: string; url: string; files: Record<string, { bytes: number; sha256: string }> }
}

/** Newest first; the date decides, the id breaks ties (`2026-10-27-2` is later than `2026-10-27`). */
export function newestFirst(editions: readonly Edition[]): Edition[] {
  return [...editions].sort((a, b) => (a.date === b.date ? (a.id < b.id ? 1 : -1) : a.date < b.date ? 1 : -1))
}

/** `27/10/2026`; the second edition of a day reads `27/10/2026 (2)`. */
export function editionLabel(edition: Pick<Edition, 'id' | 'date'>): string {
  const suffix = /-(\d+)$/.exec(edition.id.slice(edition.date.length))?.[1]
  return suffix ? `${formatUtc(edition.date)} (${suffix})` : formatUtc(edition.date)
}

/** Site-relative address of an edition (pass it through `withBase`). */
export const EDITIONS_PATH = 'edicoes/'
export const editionPath = (id: string): string => `${EDITIONS_PATH}${id}/`
/** Site-relative address of the open dataset release of an edition. */
export const releasePath = (id: string): string => `${editionPath(id)}dados/`
export const FEED_PATH = 'edicoes/feed.atom'

/** The line to cite an edition: name, label, id and the permanent address. */
export function citation(edition: Pick<Edition, 'id' | 'date'>, url: string): string {
  return `Voto a Voto. Resultados da eleição presidencial por município, edição de ${editionLabel(edition)} (${edition.id}). ${url}`
}

const escapeXml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** The stable identifier of an entry: a tag URI, independent of where the site is served. */
export const entryId = (id: string): string => `tag:voto-a-voto.com,${id.slice(0, 10)}:edicao-${id}`
export const FEED_ID = 'tag:voto-a-voto.com,2026:edicoes'

/** What an entry says: the date, the counts, the notes and, for an automatic publication, its checks. Plain text. */
export function entrySummary(edition: Edition): string {
  const fmt = (n: number) => n.toLocaleString('pt-BR')
  const counts = edition.counts
  const lines = [
    `Edição de ${editionLabel(edition)}.`,
    `${fmt(counts.municipalities)} municípios e ${fmt(counts.overseas_posts)} postos no exterior; ${fmt(counts.rows['votes.csv'] ?? 0)} linhas de votos por candidato e ${fmt(counts.rows['turnout.csv'] ?? 0)} de comparecimento.`,
    ...edition.notes,
  ]
  if (edition.publication.mode === 'automatic') {
    lines.push('Publicada automaticamente após as verificações:')
    for (const check of edition.publication.checks) lines.push(`${check.ok ? 'passou' : 'falhou'}: ${check.name} — ${check.detail}`)
  }
  return lines.join('\n')
}

/** The Atom feed (RFC 4287) of every edition, newest first. No script, no image, no tracking address: text and links only. */
export function atomFeed(editions: readonly Edition[], site: { origin: string; base: string }): string {
  const ordered = newestFirst(editions)
  const root = `${site.origin}${site.base}`
  const stamp = (e: Edition) => `${e.date}T00:00:00Z`
  const entries = ordered.map((edition) => {
    const href = `${root}${editionPath(edition.id)}`
    return [
      '  <entry>',
      `    <id>${escapeXml(entryId(edition.id))}</id>`,
      `    <title>${escapeXml(`Edição de ${editionLabel(edition)}`)}</title>`,
      `    <updated>${stamp(edition)}</updated>`,
      `    <link rel="alternate" type="text/html" href="${escapeXml(href)}"/>`,
      `    <summary type="text">${escapeXml(entrySummary(edition))}</summary>`,
      '  </entry>',
    ].join('\n')
  })
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="pt-BR">',
    `  <id>${FEED_ID}</id>`,
    '  <title>Voto a Voto: edições dos dados</title>',
    `  <updated>${ordered[0] ? stamp(ordered[0]) : '1970-01-01T00:00:00Z'}</updated>`,
    '  <author><name>Voto a Voto</name></author>',
    `  <link rel="self" type="application/atom+xml" href="${escapeXml(`${root}${FEED_PATH}`)}"/>`,
    `  <link rel="alternate" type="text/html" href="${escapeXml(`${root}${EDITIONS_PATH}`)}"/>`,
    ...entries,
    '</feed>',
    '',
  ].join('\n')
}
