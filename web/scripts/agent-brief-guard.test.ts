import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Agent brief guard: `docs/agent-brief.md` names, rule by rule, the file that enforces it (a backticked path after "Enforced by:"),
 * and `docs/glossary.md` links each term to the file that defines it. A named file that does not exist, a markdown link that points
 * nowhere, a local absolute path or a private tracker number in these public docs fails here. Prose is not checked beyond that.
 */
const ROOT = resolve(import.meta.dirname, '..', '..')
const DOCS = ['CLAUDE.md', 'docs/agent-brief.md', 'docs/glossary.md']
const read = (file: string): string => readFileSync(resolve(ROOT, file), 'utf8')

/** Backticked repo paths after "Enforced by:" / "Source:" (a line may name several; a trailing `(…)` note is ignored). */
export const enforcingPaths = (text: string): string[] =>
  text.split('\n').flatMap((line) => {
    const m = line.match(/(?:Enforced by|Source):(.*)$/)
    return m ? [...m[1]!.matchAll(/`([^`\s]+)`/g)].map((x) => x[1]!) : []
  })

/** Relative markdown link targets, anchor stripped. */
export const linkTargets = (text: string): string[] =>
  [...text.matchAll(/\]\(([^)\s]+)\)/g)].map((m) => m[1]!.split('#')[0]!).filter((t) => t && !/^[a-z]+:/.test(t))

export const missing = (paths: string[], exists: (p: string) => boolean): string[] => paths.filter((p) => !exists(p))

/** A link target relative to the doc's folder, as a repo-root path. */
function resolveFrom(dir: string, target: string): string {
  const out: string[] = []
  for (const p of [...dir.split('/'), ...target.split('/')]) {
    if (p === '..') out.pop()
    else if (p !== '.') out.push(p)
  }
  return out.join('/')
}

const here = (p: string): boolean => existsSync(resolve(ROOT, p))

describe('the agent brief, the glossary and CLAUDE.md', () => {
  it('exist, and CLAUDE.md is a pointer of at most 40 lines', () => {
    for (const f of DOCS) expect(here(f), f).toBe(true)
    expect(read('CLAUDE.md').split('\n').length).toBeLessThanOrEqual(40)
  })

  it('CLAUDE.md points at the brief and the glossary', () => {
    const text = read('CLAUDE.md')
    expect(text).toContain('docs/agent-brief.md')
    expect(text).toContain('docs/glossary.md')
  })

  it('every rule that names an enforcing file names one that exists', () => {
    const named = enforcingPaths(read('docs/agent-brief.md'))
    expect(named.length).toBeGreaterThanOrEqual(8)
    expect(missing(named, here)).toEqual([])
  })

  it('every glossary term links to a file that exists, and the five required terms are there', () => {
    const text = read('docs/glossary.md')
    const targets = linkTargets(text)
    expect(targets.length).toBeGreaterThanOrEqual(5)
    expect(missing(targets.map((t) => resolveFrom('docs', t)), here)).toEqual([])
    for (const term of ['fact record', 'budget', 'base path', 'ready attributes', 'sentence catalog']) expect(text.toLowerCase(), term).toContain(term)
  })

  it('the README links all three in its first screen', () => {
    const firstScreen = read('README.md').split('\n').slice(0, 25).join('\n')
    for (const f of DOCS) expect(firstScreen, f).toContain(f)
  })

  it('stays publishable: no local absolute path, no bare tracker number', () => {
    for (const f of DOCS) {
      const text = read(f)
      expect(text, f).not.toMatch(/\/Users\/|\/home\/\w+\//)
      expect(text, f).not.toMatch(/(^|[^\w&])#\d+/)
    }
  })

  it('can fail: a missing enforcing file, a dead link and a pasted path are all reported', () => {
    expect(enforcingPaths('- rule. Enforced by: `a/b.ts`, `c.ts` (note)\nSource: `d.md`')).toEqual(['a/b.ts', 'c.ts', 'd.md'])
    expect(missing(['web/nope.ts', 'README.md'], here)).toEqual(['web/nope.ts'])
    expect(linkTargets('[a](../web/x.ts#L3) [b](https://x.y) [c](#top)')).toEqual(['../web/x.ts'])
  })
})
