/**
 * The identity tool of ticket #113 — THE definition of "identical output" every migrate ticket of the
 * expand-migrate-contract refactor (#114, #115, #116) refers to. It compares TWO build output folders and
 * answers: same, or not.
 *
 * Rules (from the #113 ticket's Definitions):
 *  - The compared set is EVERY file under each folder, recursively — never a hand-kept list. HTML pages and
 *    non-HTML files (assets, JSON shards, sitemap, feed) alike, by sha256 content hash. A file present on one
 *    side only, or a count mismatch, is a failure an approval cannot cover.
 *  - Nothing is normalised: no whitespace or attribute-order leniency, ever. `NORMALIZATIONS` below is the
 *    named, printed list of unavoidable rules (a build hash in an asset name, …); it is EMPTY today and a run
 *    prints it either way.
 *  - Differences are approved only through an approvals file (`scripts/approved-differences.json` by default;
 *    `--approvals <path>` overrides): one entry per difference, `{path, oldText, newText, reason}`. Applying
 *    every entry's old→new swap to the left (baseline) page's bytes must make it EXACTLY the right page, else
 *    the difference is uncovered and the run fails. An entry matching nothing (missing path, oldText absent)
 *    is stale and fails the run too — the list cannot rot.
 *  - Differing text pages also print a diff (split into one tag per line when the minified page is one long
 *    line) so the reviewer sees WHAT moved, approved or not.
 *
 * Usage: `tsx scripts/html-diff.ts <baselineDir> <candidateDir> [--approvals scripts/approved-differences.json]`
 * Exit 0: identical (or every difference approved). Exit 1: any uncovered difference, any one-sided file, any
 * stale approval. Unit-covered by scripts/html-diff.test.ts, including failing on deliberate changes.
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { walkFiles } from './walk'

/** One approved difference: swapping oldText→newText (all occurrences) in the left page yields the right page. */
export interface Approval {
  /** The page path relative to the build root, forward slashes ('rj/cidade-exemplo/index.html'). */
  path: string
  oldText: string
  newText: string
  reason: string
}

/**
 * The named normalisation rules, printed in every run (ticket rule 6: ignore nothing silently). EMPTY: content
 * hashes already absorb build-hash asset names only when they differ — and a differing asset name IS a real
 * difference, so none is excused. Add one only with a reason recorded in the issue that introduced it.
 */
export const NORMALIZATIONS: readonly { name: string; reason: string }[] = []

export interface PageReport {
  path: string
  status: 'same' | 'different' | 'approved' | 'only-left' | 'only-right'
  /** The covering approvals (status 'approved'). */
  approvals?: Approval[]
}

export interface DiffReport {
  pages: PageReport[]
  /** Approvals that matched no live difference. */
  stale: Approval[]
  /** True when nothing differs (or every difference is approved) and no approval is stale. */
  ok: boolean
}

const hash = (buf: Buffer): string => createHash('sha256').update(buf).digest('hex')

const TEXT = /\.(html?|css|js|mjs|json|txt|xml|svg|map|atom|webmanifest)$/
const isText = (path: string): boolean => TEXT.test(path)

/** A minified page diffs unreadably as one line: break it into one element per line for display. */
export function displayLines(text: string): string[] {
  if (text.split('\n').length >= 4) return text.split('\n')
  return text.replace(/></g, '>\n<').split('\n')
}

/** The smallest unified-ish line diff (LCS): lines prefixed ' ', '-' or '+'. */
export function lineDiff(left: string, right: string): string {
  const a = displayLines(left)
  const b = displayLines(right)
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0))
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--) dp[i]![j] = a[i] === b[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!)
  const out: string[] = []
  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push('  ' + a[i]!)
      i++
      j++
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      out.push('- ' + a[i]!)
      i++
    } else {
      out.push('+ ' + b[j]!)
      j++
    }
  }
  while (i < a.length) out.push('- ' + a[i++]!)
  while (j < b.length) out.push('+ ' + b[j++]!)
  return out.join('\n')
}

/** Apply one approval: every occurrence of oldText becomes newText. */
const apply = (text: string, a: Approval): string => text.split(a.oldText).join(a.newText)

/**
 * The pure comparison: every file of `leftDir` against `rightDir`. Approvals verify by exact swap (see the
 * header); a covered page reports 'approved', an uncovered one 'different'.
 */
export function diffTrees(leftDir: string, rightDir: string, approvals: readonly Approval[] = []): DiffReport {
  const tree = (root: string): Map<string, string> =>
    new Map(walkFiles(root).map((f) => [relative(root, f).split(sep).join('/'), hash(readFileSync(f))]))
  const left = tree(leftDir)
  const right = tree(rightDir)
  const pages: PageReport[] = []
  for (const path of [...new Set([...left.keys(), ...right.keys()])].sort()) {
    if (!left.has(path)) pages.push({ path, status: 'only-right' })
    else if (!right.has(path)) pages.push({ path, status: 'only-left' })
    else if (left.get(path) === right.get(path)) pages.push({ path, status: 'same' })
    else {
      const covering = approvals.filter((a) => a.path === path)
      const leftText = readFileSync(resolve(leftDir, ...path.split('/')), 'utf8')
      const rightText = readFileSync(resolve(rightDir, ...path.split('/')), 'utf8')
      const applied = covering.reduce(apply, leftText)
      const valid = covering.length > 0 && applied === rightText && covering.every((a) => leftText.includes(a.oldText))
      pages.push({ path, status: valid ? 'approved' : 'different', approvals: covering })
    }
  }
  const stale = approvals.filter((a) => !pages.some((p) => p.path === a.path && p.status === 'approved' && p.approvals?.includes(a)))
  return { pages, stale, ok: pages.every((p) => p.status === 'same' || p.status === 'approved') && stale.length === 0 }
}

/** Load the approvals file ([], or a list of Approval); a wrong shape fails loudly here, not as a stale entry. */
export function loadApprovals(path: string): Approval[] {
  if (!existsSync(path)) return []
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'))
  if (!Array.isArray(parsed)) throw new Error(`${path}: expected a JSON array of approvals`)
  return parsed.map((entry, i) => {
    const a = entry as Partial<Approval>
    if (typeof a?.path !== 'string' || typeof a.oldText !== 'string' || typeof a.newText !== 'string' || typeof a.reason !== 'string')
      throw new Error(`${path}: entry ${i} must have string path, oldText, newText and reason`)
    return a as Approval
  })
}

function main(argv: string[]): number {
  const approvalsFlag = argv.indexOf('--approvals')
  const dirs = approvalsFlag >= 0 ? [...argv.slice(0, approvalsFlag), ...argv.slice(approvalsFlag + 2)] : argv
  const approvalsPath = (approvalsFlag >= 0 ? argv[approvalsFlag + 1] : undefined) ?? resolve(import.meta.dirname, 'approved-differences.json')
  if (dirs.length !== 2 || (approvalsFlag >= 0 && argv[approvalsFlag + 1] === undefined)) {
    console.error('usage: tsx scripts/html-diff.ts <baselineDir> <candidateDir> [--approvals <file>]')
    return 2
  }
  const [leftDir, rightDir] = dirs as [string, string]
  const approvals = loadApprovals(approvalsPath)
  console.log(`normalizations (${NORMALIZATIONS.length}): ${NORMALIZATIONS.map((n) => `${n.name} — ${n.reason}`).join('; ') || 'none (byte-exact, nothing ignored)'}`)
  console.log(`approvals: ${approvals.length} from ${relative(process.cwd(), approvalsPath)}`)
  const report = diffTrees(leftDir, rightDir, approvals)
  const leftCount = report.pages.filter((p) => p.status !== 'only-right').length
  const rightCount = report.pages.filter((p) => p.status !== 'only-left').length
  console.log(`pages: ${leftCount} (baseline) vs ${rightCount} (candidate)`)
  for (const p of report.pages) {
    if (p.status === 'same') continue
    console.log(`${p.status}: ${p.path}`)
    if (p.status === 'approved') for (const a of p.approvals ?? []) console.log(`  approved: ${a.reason}`)
    if (p.status === 'different' && isText(p.path)) {
      const leftText = readFileSync(resolve(leftDir, ...p.path.split('/')), 'utf8')
      const rightText = readFileSync(resolve(rightDir, ...p.path.split('/')), 'utf8')
      console.log(lineDiff(leftText, rightText))
    }
  }
  const same = report.pages.filter((p) => p.status === 'same').length
  const approved = report.pages.filter((p) => p.status === 'approved').length
  for (const a of report.stale) console.log(`stale approval: ${a.path} (${a.reason}) — nothing matches oldText; remove the entry`)
  console.log(`same: ${same}, approved: ${approved}, different: ${report.pages.filter((p) => p.status === 'different').length}, one-sided: ${report.pages.filter((p) => p.status.startsWith('only')).length}, stale approvals: ${report.stale.length}`)
  console.log(report.ok ? 'IDENTICAL (no difference outside the approved list)' : 'DIFFERENT — see above')
  return report.ok ? 0 : 1
}

if (process.argv[1] && fileURLToPath(import.meta.url) === pathToFileURL(process.argv[1]).pathname) process.exit(main(process.argv.slice(2)))
