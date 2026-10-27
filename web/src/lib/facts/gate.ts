/**
 * The build gate of the fact records (#61, extended to the other pages by #62), PURE. A published number needs a fact, and a
 * fact needs a source and a calculation; one that has not fails the build with the id and what is missing. The pages
 * ask for the link of a figure through `factLinks`, which refuses a figure with no fact or with a fact that does not
 * pass, so a number cannot reach the HTML without its record. `integrations/facts-gate.ts` runs the same checks
 * over the pages the build wrote.
 */
import { factHref, type Fact } from './model'

export class FactGateError extends Error {}

const blank = (text: string | undefined) => !text || !text.trim()

/** What is missing from one record: an empty list when it can be published. */
export function factProblems(f: Fact): string[] {
  const out: string[] = []
  if (blank(f.id)) out.push('no id')
  if (blank(f.sentences?.standard) || blank(f.sentences?.plain)) out.push('no sentence')
  if (!f.source || blank(f.source.name) || !/^https?:\/\//.test(f.source.url ?? '')) out.push('no source')
  if (!f.calculation || blank(f.calculation.formula) || !f.calculation.worked?.length || f.calculation.worked.some(blank)) out.push('no calculation')
  if (!f.inputs?.length || f.inputs.some((i) => blank(i.label) || blank(i.value))) out.push('no inputs')
  return out
}

/** The problems of a set of records, each prefixed with its id; a repeated id is a problem too (ids name one thing). */
export function gateProblems(facts: readonly Fact[]): string[] {
  const seen = new Set<string>()
  return facts.flatMap((f) => {
    const own = factProblems(f).map((p) => `${f.id || '(no id)'}: ${p}`)
    if (f.id && seen.has(f.id)) own.push(`${f.id}: id used twice`)
    seen.add(f.id)
    return own
  })
}

/** Throws a `FactGateError` naming every problem; returns the records when there is none. */
export function assertPublishable(facts: readonly Fact[], where = 'the page'): readonly Fact[] {
  const problems = gateProblems(facts)
  if (problems.length > 0) throw new FactGateError(`fact gate failed on ${where}:\n  - ${problems.join('\n  - ')}`)
  return facts
}

/**
 * The links of the figures of one page. `href(anchor)` is the address of the fact the figure at that anchor shows: it throws for an
 * anchor with no fact (a number with no record), so a page that prints a figure it has no record for does not build.
 */
export function factLinks(facts: readonly Fact[], where: string, base = '/'): (anchor: string) => string {
  assertPublishable(facts, where)
  const byAnchor = new Map(facts.map((f) => [f.anchor, f]))
  return (anchor) => {
    const fact = byAnchor.get(anchor)
    if (!fact) throw new FactGateError(`fact gate failed on ${where}: the figure "${anchor}" has no fact record`)
    return factHref(fact, base)
  }
}
