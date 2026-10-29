/**
 * `npm run check:decisions` (`make decisions-check`): the structural check of the append-only decision log `docs/decisions.md` (#129).
 * It fails when two entries share an id, an entry has no date, status or reason, a status is not active / superseded / reverted,
 * a reference (`superseded by`, `Supersedes`, the memory-note mapping) names an id that does not exist, a superseded entry has no
 * successor that says so, or a ticket is written as a bare `#N` (the tracker prefix `private#N` / `oss#N` is required).
 * It does not judge whether a decision is right; it only keeps the log from losing its shape.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export interface Decision {
  id: string
  title: string
  fields: Record<string, string>
}

const ID = /D-\d{3}/g
const STATUS = /^(active|reverted|superseded by (D-\d{3}))$/
const REQUIRED = ['Date', 'Status', 'Reason'] as const

/** Entries are `### D-nnn Title` followed by `- Field: value` lines (a value may continue on indented lines). */
export function parseDecisions(text: string): Decision[] {
  const out: Decision[] = []
  let cur: Decision | null = null
  let last = ''
  let fenced = false
  for (const line of text.split('\n')) {
    if (line.startsWith('```')) fenced = !fenced
    if (fenced || line.startsWith('```')) continue // the template in a code block is not an entry
    const head = line.match(/^### (D-\d{3}) (.+)$/)
    if (head) {
      cur = { id: head[1]!, title: head[2]!, fields: {} }
      out.push(cur)
      last = ''
    } else if (/^#{1,3} /.test(line)) cur = null // any other heading ends the entry
    else if (cur) {
      const f = line.match(/^- ([A-Za-z]+): (.*)$/)
      if (f) {
        cur.fields[f[1]!] = f[2]!
        last = f[1]!
      } else if (last && /^\s+\S/.test(line)) cur.fields[last] += ' ' + line.trim()
    }
  }
  return out
}

/** Rows of the memory-note mapping table: `| \`note\` | D-001, D-002 or not a decision | ... |`. */
export function mappedIds(text: string): { note: string; ids: string[] }[] {
  return [...text.matchAll(/^\|\s*`([^`]+)`\s*\|\s*([^|]*)\|/gm)].map((m) => ({ note: m[1]!, ids: m[2]!.match(ID) ?? [] }))
}

export function decisionProblems(text: string): string[] {
  const problems: string[] = []
  const all = parseDecisions(text)
  const known = new Set(all.map((d) => d.id))
  const counts = new Map<string, number>()
  for (const d of all) counts.set(d.id, (counts.get(d.id) ?? 0) + 1)
  for (const [id, n] of counts) if (n > 1) problems.push(`${id} appears ${n} times; ids are never reused`)

  for (const d of all) {
    for (const f of REQUIRED) if (!d.fields[f]?.trim()) problems.push(`${d.id} has no ${f}`)
    const { Date: date, Status: status } = d.fields
    if (date && !/^\d{4}-\d{2}-\d{2}/.test(date)) problems.push(`${d.id} date "${date}" is not YYYY-MM-DD`)
    if (status && !STATUS.test(status)) problems.push(`${d.id} status "${status}" is not active, reverted or superseded by D-nnn`)
    const successor = status?.match(/^superseded by (D-\d{3})$/)?.[1]
    if (successor) {
      if (!known.has(successor)) problems.push(`${d.id} is superseded by ${successor}, which does not exist`)
      else if (!(all.find((x) => x.id === successor)?.fields.Supersedes ?? '').includes(d.id)) problems.push(`${successor} does not list ${d.id} in Supersedes`)
    }
    for (const ref of d.fields.Supersedes?.match(ID) ?? []) if (!known.has(ref)) problems.push(`${d.id} Supersedes ${ref}, which does not exist`)
    if (/(^|[^\w&-])#\d+/.test(Object.values(d.fields).join(' '))) problems.push(`${d.id} has a bare #N; write private#N or oss#N`)
  }
  for (const { note, ids } of mappedIds(text)) for (const id of ids) if (!known.has(id)) problems.push(`mapping of ${note} names ${id}, which does not exist`)
  if (all.length === 0) problems.push('no decision entry found')
  return problems
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const file = resolve(import.meta.dirname, '..', '..', 'docs', 'decisions.md')
  const problems = decisionProblems(readFileSync(file, 'utf8'))
  if (problems.length > 0) {
    console.error(`check:decisions FAILED: ${problems.length} problem(s)`)
    for (const p of problems) console.error(`  - ${p}`)
    process.exit(1)
  }
  console.log(`check:decisions: ${parseDecisions(readFileSync(file, 'utf8')).length} entries; every one has a date, a status and a reason, and no id repeats.`)
}
