import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { decisionProblems, parseDecisions } from './decision-log'

/**
 * Decision log guard (#129): `docs/decisions.md` is append-only, so the check is structural: every entry has an id, a date, a status
 * and a reason; no id repeats; every `superseded by` / `Supersedes` names an entry that exists; and the memory-note mapping names only ids that exist.
 */
const ROOT = resolve(import.meta.dirname, '..', '..')
const real = readFileSync(resolve(ROOT, 'docs/decisions.md'), 'utf8')

const entry = (id: string, over: Partial<Record<string, string>> = {}): string => {
  const f = { Date: '2026-10-28', Status: 'active', Decision: 'Do the thing.', Reason: 'Because.', Supersedes: 'none', Tickets: 'none', Source: 'a note', ...over }
  return [`### ${id} Title of ${id}`, ...Object.entries(f).filter(([, v]) => v !== undefined).map(([k, v]) => `- ${k}: ${v}`), ''].join('\n')
}

describe('the decision log, as it stands', () => {
  it('has no structural problem', () => {
    expect(decisionProblems(real)).toEqual([])
  })

  it('has an entry for each decision the ticket names', () => {
    const titles = parseDecisions(real).map((d) => d.title.toLowerCase())
    for (const word of ['analytics', 'licence', 'tag', 'ballot-number', 'type scale', 'task-first', 'tracker'])
      expect(titles.some((t) => t.includes(word)), word).toBe(true)
  })

  it('maps every owner memory note to decision ids or to "not a decision"', () => {
    const notes = [
      'analytics-consent-decision', 'apuracao-playback-data', 'decisions-2026-10-28', 'gh-pages-plan-blocker', 'issue-tracker-split',
      'licence-and-publish-cron', 'no-code-redundancy', 'playwright-port-collision', 'post-1-13-0-decisions', 'release-tags-chronological',
      'task-flow-decisions-2026-10-28', 'uf-region-links-rule',
    ]
    for (const n of notes) expect(real, n).toMatch(new RegExp(`\\|\\s*\`${n}\`\\s*\\|\\s*(D-\\d{3}|not a decision)`))
  })
})

describe('the guard can fail', () => {
  it('accepts a well formed log', () => {
    expect(decisionProblems(entry('D-001') + entry('D-002', { Supersedes: 'D-001' }))).toEqual([])
  })

  it('reports a repeated id', () => {
    expect(decisionProblems(entry('D-001') + entry('D-001'))).toEqual([expect.stringContaining('D-001 appears 2 times')])
  })

  it.each(['Date', 'Status', 'Reason'])('reports an entry with no %s', (field) => {
    expect(decisionProblems(entry('D-001', { [field]: undefined }))).toEqual([expect.stringContaining(`D-001 has no ${field}`)])
  })

  it('reports a status that is not one of the three', () => {
    expect(decisionProblems(entry('D-001', { Status: 'maybe' }))).toEqual([expect.stringContaining('D-001 status')])
  })

  it('reports a malformed date', () => {
    expect(decisionProblems(entry('D-001', { Date: 'yesterday' }))).toEqual([expect.stringContaining('D-001 date')])
  })

  it('reports a reference to an entry that does not exist', () => {
    expect(decisionProblems(entry('D-001', { Status: 'superseded by D-009' }))).toEqual([expect.stringContaining('D-009')])
    expect(decisionProblems(entry('D-001', { Supersedes: 'D-007' }))).toEqual([expect.stringContaining('D-007')])
  })

  it('reports a superseded entry that no later entry supersedes', () => {
    expect(decisionProblems(entry('D-001', { Status: 'superseded by D-002' }) + entry('D-002'))).toEqual([expect.stringContaining('D-002 does not list D-001')])
  })

  it('reports a bare tracker number', () => {
    expect(decisionProblems(entry('D-001', { Tickets: '#12' }))).toEqual([expect.stringContaining('bare')])
  })
})
