/**
 * Pure formatting helpers of the "Sobre os dados" page. The numbers themselves live in
 * `about-data.ts`; this file only turns them into the strings the page shows.
 */
import { formatInt } from '@site/shared/city-model'
import type { SourceLine } from './about-data'

/** "395389280" -> "395.389.280" (pt-BR thousands separator, like the site's other numbers). */
export const formatBytes = formatInt

/** ISO date-time -> "26/10/2026 21:55" (UTC as recorded in the manifest; day first, as the pages write). */
export function formatUtc(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(iso)
  if (!m) return iso
  const date = `${m[3]}/${m[2]}/${m[1]}`
  return m[4] && m[5] ? `${date} ${m[4]}:${m[5]}` : date
}

/** TSE generation timestamp ("2026-10-25T23:27:44", local to the TSE) -> "25/10/2026 23:27". */
function formatGenerations(iso: string): string {
  return formatUtc(iso)
}

/** First 12 characters of a SHA-256 with the ellipsis, e.g. `f880848ef4ba…`. */
export function shortHash(sha: string): string {
  return `${sha.slice(0, 12)}…`
}

/** What one row of the manifest table shows. */
export interface SourceRow {
  label: string
  kind: string
  collected: string
  /** "" when the source is a whole set of files with no single size. */
  bytes: string
  /** Short hash for the cell; "" when the source has no single-file hash. */
  hash: string
  /** The full SHA-256 (title of the hash cell, so a reader can still copy the exact value). */
  hashFull: string
  /** Extra line for the 2026 results site (files / final / generation / digest), "" when not applicable. */
  note: string
  /** The compact one-line meta: collection, bytes and short hash, each only when present. */
  meta: string
}

export function sourceRow(s: SourceLine): SourceRow {
  const parts: string[] = []
  if (s.files) parts.push(`${formatInt(s.files)} arquivos`)
  if (s.final !== undefined) parts.push(`${formatInt(s.final)} finais`)
  if (s.newestGeneration) parts.push(`geração mais recente do TSE: ${formatGenerations(s.newestGeneration)}`)
  if (s.digest) parts.push(`digest dos arquivos: ${shortHash(s.digest)}`)
  const meta: string[] = []
  if (s.retrievedAt) meta.push(`Coleta (UTC): ${formatUtc(s.retrievedAt)}`)
  if (s.bytes) meta.push(`${formatBytes(s.bytes)} bytes`)
  if (s.sha256) meta.push(`SHA-256: ${shortHash(s.sha256)}`)
  return {
    label: s.label,
    kind: s.kind,
    collected: formatUtc(s.retrievedAt),
    bytes: s.bytes > 0 ? formatBytes(s.bytes) : '',
    hash: s.sha256 ? shortHash(s.sha256) : '',
    hashFull: s.sha256,
    note: parts.join(' · '),
    meta: meta.join(' · '),
  }
}